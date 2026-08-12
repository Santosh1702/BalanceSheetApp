/** BalanceSheetApp Google Apps Script API. Configure SCRIPT_PROPERTY SHEET_ID before deployment. */
const SHEET_NAMES = Object.freeze({ TRANSACTIONS: 'Transactions', USERS: 'Users', SETTINGS: 'Settings', AUDIT: 'AuditLog' });
const TRANSACTION_TYPES = Object.freeze({ DEPOSIT: 'DEPOSIT', MONEY_GIVEN: 'MONEY_GIVEN' });
const ROLES = Object.freeze({ ADMIN: 'admin', MEMBER: 'member' });
const PERSONS = Object.freeze({ SAGAR: 'Sagar', TEJAS: 'Tejas' });

function doGet(event) { return handleRequest_(event.parameter || {}); }
function doPost(event) { return handleRequest_(JSON.parse(event.postData && event.postData.contents || '{}')); }

function handleRequest_(request) {
  try {
    const user = authenticate_(request.idToken);
    let result;
    switch (request.action) {
      case 'auth.me': result = authenticatedProfile_(user); break;
      case 'transactions.list': result = listTransactions_(user, request.filters || {}); break;
      case 'transactions.create': result = createTransaction_(user, request.transaction); break;
      case 'transactions.update': result = updateTransaction_(user, request.id, request.transaction); break;
      case 'transactions.delete': result = deleteTransaction_(user, request.id); break;
      case 'health': result = { status: 'ok' }; break;
      default: throw new Error('Unsupported API action.');
    }
    return json_({ ok: true, data: result });
  } catch (error) {
    return json_({ ok: false, error: error.message || 'An unexpected error occurred.' });
  }
}

function authenticate_(idToken) {
  if (!idToken) throw new Error('Missing Google ID token.');
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error('Invalid or expired Google ID token.');
  const identity = JSON.parse(response.getContentText());
  if (identity.aud !== getRequiredProperty_('GOOGLE_CLIENT_ID') || identity.email_verified !== 'true') throw new Error('Google identity verification failed.');

  const user = findUserByEmail_(identity.email);
  if (!user || String(user.active).toUpperCase() !== 'TRUE') throw new Error('This Google account is not authorized.');

  const normalizedRole = String(user.role || '').trim();
  const normalizedPerson = String(user.person || '').trim();
  if (!Object.values(ROLES).includes(normalizedRole)) throw new Error('Invalid Users sheet role. Expected admin or member.');
  if (normalizedRole === ROLES.MEMBER && !Object.values(PERSONS).includes(normalizedPerson)) throw new Error('Invalid Users sheet person. Members require a supported person.');
  if (normalizedRole === ROLES.ADMIN && normalizedPerson && !Object.values(PERSONS).includes(normalizedPerson)) throw new Error('Invalid Users sheet person. Administrators require an empty or supported person.');

  return {
    email: String(user.email).toLowerCase(),
    name: String(user.name || identity.name || '').trim(),
    role: normalizedRole,
    person: normalizedPerson,
  };
}

function authenticatedProfile_(user) {
  return { email: user.email, name: user.name, role: user.role, person: user.person };
}

function listTransactions_(user, filters) {
  let rows = getRows_(SHEET_NAMES.TRANSACTIONS);
  if (user.role !== ROLES.ADMIN) rows = rows.filter(function (row) { return row.person === user.person; });
  if (filters.person) rows = rows.filter(function (row) { return row.person === filters.person; });
  if (filters.dateFrom) rows = rows.filter(function (row) { return row.date >= filters.dateFrom; });
  if (filters.dateTo) rows = rows.filter(function (row) { return row.date <= filters.dateTo; });
  return rows.sort(function (left, right) { return String(right.date).localeCompare(String(left.date)); });
}

function createTransaction_(user, transaction) {
  validateTransaction_(transaction);
  if (transaction.type === TRANSACTION_TYPES.MONEY_GIVEN && user.role !== ROLES.ADMIN) throw new Error('Only administrators can create money-given transactions.');
  if (user.role !== ROLES.ADMIN && transaction.person !== user.person) throw new Error('Members can only create deposits for their own person record.');

  return withScriptLock_(function () {
    const now = new Date().toISOString();
    const record = {
      id: Utilities.getUuid(),
      person: transaction.person,
      type: transaction.type,
      amount: Number(transaction.amount),
      date: transaction.date,
      mode: transaction.mode,
      note: String(transaction.note || '').trim(),
      createdBy: user.email,
      createdAt: now,
      updatedBy: user.email,
      updatedAt: now,
    };

    appendRow_(SHEET_NAMES.TRANSACTIONS, record);
    audit_(user.email, 'TRANSACTION', record.id, 'CREATE', null, record);
    return record;
  });
}

function updateTransaction_(user, id, transaction) {
  requireAdmin_(user); validateTransaction_(transaction);
  return withScriptLock_(function () {
    const existing = findRowById_(SHEET_NAMES.TRANSACTIONS, id);
    if (!existing) throw new Error('Transaction not found.');
    const record = Object.assign({}, existing.row, transaction, { id: id, amount: Number(transaction.amount), updatedBy: user.email, updatedAt: new Date().toISOString() });
    updateRow_(SHEET_NAMES.TRANSACTIONS, existing.rowNumber, record);
    audit_(user.email, 'TRANSACTION', id, 'UPDATE', existing.row, record);
    return record;
  });
}

function deleteTransaction_(user, id) {
  requireAdmin_(user);
  return withScriptLock_(function () {
    const existing = findRowById_(SHEET_NAMES.TRANSACTIONS, id);
    if (!existing) throw new Error('Transaction not found.');
    getSheet_(SHEET_NAMES.TRANSACTIONS).deleteRow(existing.rowNumber);
    audit_(user.email, 'TRANSACTION', id, 'DELETE', existing.row, null);
    return { id: id };
  });
}

function validateTransaction_(transaction) {
  if (!transaction || !transaction.person || !transaction.date || !transaction.mode || !Object.values(TRANSACTION_TYPES).includes(transaction.type) || !Number.isFinite(Number(transaction.amount)) || Number(transaction.amount) <= 0) throw new Error('Invalid transaction data.');
  if (!Object.values(PERSONS).includes(String(transaction.person))) throw new Error('Unsupported ledger person.');
  if (transaction.type === TRANSACTION_TYPES.MONEY_GIVEN && !String(transaction.note || '').trim()) throw new Error('A money-given note is required.');
}
function withScriptLock_(operation) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('The service is busy processing another transaction. Please try again.');
  try {
    return operation();
  } finally {
    lock.releaseLock();
  }
}
function requireAdmin_(user) { if (user.role !== ROLES.ADMIN) throw new Error('Administrator access is required.'); }
function findUserByEmail_(email) { return getRows_(SHEET_NAMES.USERS).find(function (row) { return String(row.email).toLowerCase() === String(email).toLowerCase(); }); }
function findRowById_(sheetName, id) { const rows = getRows_(sheetName); const index = rows.findIndex(function (row) { return row.id === id; }); return index < 0 ? null : { row: rows[index], rowNumber: index + 2 }; }
function audit_(performedBy, entityType, entityId, action, previousValue, newValue) { appendRow_(SHEET_NAMES.AUDIT, { id: Utilities.getUuid(), entityType: entityType, entityId: entityId, action: action, previousValue: previousValue ? JSON.stringify(previousValue) : '', newValue: newValue ? JSON.stringify(newValue) : '', performedBy: performedBy, timestamp: new Date().toISOString() }); }
function getSpreadsheet_() { return SpreadsheetApp.openById(getRequiredProperty_('SHEET_ID')); }
function getSheet_(name) { const sheet = getSpreadsheet_().getSheetByName(name); if (!sheet) throw new Error('Missing required sheet: ' + name); return sheet; }
function normalizeSheetValue_(sheetName, header, value, spreadsheetTimeZone) {
  if (!(value instanceof Date)) return value;
  if (sheetName === SHEET_NAMES.TRANSACTIONS && header === 'date') {
    return Utilities.formatDate(value, spreadsheetTimeZone, 'yyyy-MM-dd');
  }
  return Utilities.formatDate(value, 'Etc/UTC', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
}
function getRows_(name) {
  const sheet = getSheet_(name);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  const spreadsheetTimeZone = sheet.getParent().getSpreadsheetTimeZone();
  return values.slice(1).filter(function (row) { return row.some(function (value) { return value !== ''; }); }).map(function (row) { return headers.reduce(function (record, header, index) { record[header] = normalizeSheetValue_(name, header, row[index], spreadsheetTimeZone); return record; }, {}); });
}
function appendRow_(name, record) { const sheet = getSheet_(name); const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; sheet.appendRow(headers.map(function (header) { return record[header] === undefined ? '' : record[header]; })); }
function updateRow_(name, rowNumber, record) { const sheet = getSheet_(name); const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; sheet.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map(function (header) { return record[header] === undefined ? '' : record[header]; })]); }
function getRequiredProperty_(key) { const value = PropertiesService.getScriptProperties().getProperty(key); if (!value) throw new Error('Missing Apps Script property: ' + key); return value; }
function json_(body) { return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON); }

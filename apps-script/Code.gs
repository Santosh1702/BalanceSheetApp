/** BalanceSheetApp Google Apps Script API. Configure SCRIPT_PROPERTY SHEET_ID before deployment. */
const SHEET_NAMES = Object.freeze({ TRANSACTIONS: 'Transactions', USERS: 'Users', SETTINGS: 'Settings', AUDIT: 'AuditLog' });
const TRANSACTION_TYPES = Object.freeze({ DEPOSIT: 'DEPOSIT', MONEY_GIVEN: 'MONEY_GIVEN' });
const PAYMENT_MODES = Object.freeze({ ONLINE_TRANSFER: 'ONLINE_TRANSFER', CASH: 'CASH' });
const ROLES = Object.freeze({ ADMIN: 'admin', MEMBER: 'member' });
const PERSONS = Object.freeze({ SAGAR: 'Sagar', TEJAS: 'Tejas' });
const MAX_NOTE_LENGTH = 500;
const REQUIRED_HEADERS = Object.freeze({
  Transactions: Object.freeze(['id', 'person', 'type', 'amount', 'date', 'mode', 'note', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt']),
  Users: Object.freeze(['email', 'name', 'role', 'person', 'active']),
  AuditLog: Object.freeze(['id', 'entityType', 'entityId', 'action', 'previousValue', 'newValue', 'performedBy', 'timestamp']),
});

function doGet(event) { return handleRequest_(event.parameter || {}); }
function doPost(event) {
  let request;
  try {
    request = JSON.parse(event.postData && event.postData.contents || '{}');
  } catch (error) {
    return json_({ ok: false, error: 'Invalid JSON request body.' });
  }
  return handleRequest_(request);
}

function handleRequest_(request) {
  try {
    if (!isPlainObject_(request)) throw new Error('Request body must be a JSON object.');
    if (typeof request.action !== 'string' || !request.action.trim()) throw new Error('Request action is required.');
    const user = authenticate_(request.idToken);
    let result;
    switch (request.action.trim()) {
      case 'auth.me': result = authenticatedProfile_(user); break;
      case 'transactions.list': result = listTransactions_(user, request.filters === undefined ? {} : request.filters); break;
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
  const normalizedFilters = validateTransactionFilters_(filters);
  let rows = getRows_(SHEET_NAMES.TRANSACTIONS);
  if (user.role !== ROLES.ADMIN) rows = rows.filter(function (row) { return row.person === user.person; });
  if (normalizedFilters.person) rows = rows.filter(function (row) { return row.person === normalizedFilters.person; });
  if (normalizedFilters.dateFrom) rows = rows.filter(function (row) { return row.date >= normalizedFilters.dateFrom; });
  if (normalizedFilters.dateTo) rows = rows.filter(function (row) { return row.date <= normalizedFilters.dateTo; });
  return rows.sort(function (left, right) { return String(right.date).localeCompare(String(left.date)); }).map(transactionResponse_);
}

function createTransaction_(user, transaction) {
  const input = validateTransaction_(transaction);
  if (input.type === TRANSACTION_TYPES.MONEY_GIVEN && user.role !== ROLES.ADMIN) throw new Error('Only administrators can create money-given transactions.');
  if (user.role !== ROLES.ADMIN && input.person !== user.person) throw new Error('Members can only create deposits for their own person record.');

  return withScriptLock_(function () {
    const now = new Date().toISOString();
    const record = {
      id: Utilities.getUuid(),
      person: input.person,
      type: input.type,
      amount: input.amount,
      date: input.date,
      mode: input.mode,
      note: input.note,
      createdBy: user.email,
      createdAt: now,
      updatedBy: user.email,
      updatedAt: now,
    };

    appendRow_(SHEET_NAMES.TRANSACTIONS, record);
    audit_(user.email, 'TRANSACTION', record.id, 'CREATE', null, record);
    return transactionResponse_(record);
  });
}

function updateTransaction_(user, id, transaction) {
  requireAdmin_(user);
  const normalizedId = validateTransactionId_(id);
  const input = validateTransaction_(transaction);
  return withScriptLock_(function () {
    const existing = findRowById_(SHEET_NAMES.TRANSACTIONS, normalizedId);
    if (!existing) throw new Error('Transaction not found.');
    const record = {
      id: existing.row.id,
      person: input.person,
      type: input.type,
      amount: input.amount,
      date: input.date,
      mode: input.mode,
      note: input.note,
      createdBy: existing.row.createdBy,
      createdAt: existing.row.createdAt,
      updatedBy: user.email,
      updatedAt: new Date().toISOString(),
    };
    updateRow_(SHEET_NAMES.TRANSACTIONS, existing.rowNumber, record);
    audit_(user.email, 'TRANSACTION', normalizedId, 'UPDATE', existing.row, record);
    return transactionResponse_(record);
  });
}

function deleteTransaction_(user, id) {
  requireAdmin_(user);
  const normalizedId = validateTransactionId_(id);
  return withScriptLock_(function () {
    const existing = findRowById_(SHEET_NAMES.TRANSACTIONS, normalizedId);
    if (!existing) throw new Error('Transaction not found.');
    getSheet_(SHEET_NAMES.TRANSACTIONS).deleteRow(existing.rowNumber);
    audit_(user.email, 'TRANSACTION', normalizedId, 'DELETE', existing.row, null);
    return { id: normalizedId };
  });
}

function validateTransaction_(transaction) {
  if (!isPlainObject_(transaction)) throw new Error('Transaction must be a JSON object.');
  const allowedFields = ['person', 'type', 'amount', 'date', 'mode', 'note'];
  const unexpectedFields = Object.keys(transaction).filter(function (key) { return !allowedFields.includes(key); });
  if (unexpectedFields.length) throw new Error('Unsupported transaction fields: ' + unexpectedFields.join(', ') + '.');
  if (typeof transaction.person !== 'string' || !Object.values(PERSONS).includes(transaction.person)) throw new Error('Unsupported ledger person.');
  if (typeof transaction.type !== 'string' || !Object.values(TRANSACTION_TYPES).includes(transaction.type)) throw new Error('Unsupported transaction type.');
  if (typeof transaction.amount !== 'number' || !Number.isFinite(transaction.amount) || transaction.amount <= 0) throw new Error('Transaction amount must be a finite number greater than zero.');
  if (!isBusinessDate_(transaction.date)) throw new Error('Transaction date must be a real calendar date in YYYY-MM-DD format.');
  if (typeof transaction.mode !== 'string' || !Object.values(PAYMENT_MODES).includes(transaction.mode)) throw new Error('Unsupported payment mode.');
  if (transaction.note !== undefined && typeof transaction.note !== 'string') throw new Error('Transaction note must be a string.');
  const note = (transaction.note || '').trim();
  if (note.length > MAX_NOTE_LENGTH) throw new Error('Transaction note must be ' + MAX_NOTE_LENGTH + ' characters or fewer.');
  if (transaction.type === TRANSACTION_TYPES.MONEY_GIVEN && !note) throw new Error('A money-given note is required.');
  return { person: transaction.person, type: transaction.type, amount: transaction.amount, date: transaction.date, mode: transaction.mode, note: note };
}
function validateTransactionFilters_(filters) {
  if (!isPlainObject_(filters)) throw new Error('Transaction filters must be a JSON object.');
  const allowedFields = ['person', 'dateFrom', 'dateTo'];
  const unexpectedFields = Object.keys(filters).filter(function (key) { return !allowedFields.includes(key); });
  if (unexpectedFields.length) throw new Error('Unsupported transaction filter fields: ' + unexpectedFields.join(', ') + '.');
  if (filters.person !== undefined && (typeof filters.person !== 'string' || !Object.values(PERSONS).includes(filters.person))) throw new Error('Unsupported transaction filter person.');
  if (filters.dateFrom !== undefined && !isBusinessDate_(filters.dateFrom)) throw new Error('Transaction dateFrom filter must be a real calendar date in YYYY-MM-DD format.');
  if (filters.dateTo !== undefined && !isBusinessDate_(filters.dateTo)) throw new Error('Transaction dateTo filter must be a real calendar date in YYYY-MM-DD format.');
  return { person: filters.person, dateFrom: filters.dateFrom, dateTo: filters.dateTo };
}
function validateTransactionId_(id) {
  if (typeof id !== 'string' || !id.trim()) throw new Error('Transaction id is required.');
  return id.trim();
}
function isBusinessDate_(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split('-').map(Number);
  const year = parts[0]; const month = parts[1]; const day = parts[2];
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}
function isPlainObject_(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.prototype.toString.call(value) === '[object Object]'; }
function transactionResponse_(record) { return { id: record.id, person: record.person, type: record.type, amount: record.amount, date: record.date, mode: record.mode, note: record.note, createdBy: record.createdBy, createdAt: record.createdAt, updatedBy: record.updatedBy, updatedAt: record.updatedAt }; }
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
function findRowById_(sheetName, id) { const matches = getRowEntries_(sheetName).filter(function (entry) { return String(entry.row.id) === id; }); if (matches.length > 1) throw new Error('Duplicate transaction id detected.'); return matches.length ? matches[0] : null; }
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
  return getRowEntries_(name).map(function (entry) { return entry.row; });
}
function getRowEntries_(name) {
  const sheet = getSheet_(name);
  const values = sheet.getDataRange().getValues();
  const headers = headersFromValues_(name, values);
  if (values.length < 2) return [];
  const spreadsheetTimeZone = sheet.getParent().getSpreadsheetTimeZone();
  return values.slice(1).map(function (row, index) { return { values: row, rowNumber: index + 2 }; }).filter(function (entry) { return entry.values.some(function (value) { return value !== ''; }); }).map(function (entry) { return { row: headers.reduce(function (record, header, index) { record[header] = normalizeSheetValue_(name, header, entry.values[index], spreadsheetTimeZone); return record; }, {}), rowNumber: entry.rowNumber }; });
}
function validateHeaders_(name, headers) { const duplicates = headers.filter(function (header, index) { return headers.indexOf(header) !== index; }); if (duplicates.length) throw new Error('Duplicate headers in ' + name + ' sheet: ' + Array.from(new Set(duplicates)).join(', ') + '.'); const required = REQUIRED_HEADERS[name]; if (!required) return; const missing = required.filter(function (header) { return !headers.includes(header); }); if (missing.length) throw new Error('Missing required headers in ' + name + ' sheet: ' + missing.join(', ') + '.'); }
function normalizeHeader_(value) { return String(value).replace(/^\uFEFF/, '').trim(); }
function headersFromValues_(name, values) { const headerRow = Array.isArray(values) && Array.isArray(values[0]) ? values[0] : []; const headers = headerRow.map(normalizeHeader_); validateHeaders_(name, headers); return headers; }
function getValidatedHeaders_(sheet, name) { const lastColumn = sheet.getLastColumn(); const values = lastColumn > 0 ? sheet.getRange(1, 1, 1, lastColumn).getValues() : []; return headersFromValues_(name, values); }
function appendRow_(name, record) { const sheet = getSheet_(name); const headers = getValidatedHeaders_(sheet, name); sheet.appendRow(headers.map(function (header) { return record[header] === undefined ? '' : record[header]; })); }
function updateRow_(name, rowNumber, record) { const sheet = getSheet_(name); const headers = getValidatedHeaders_(sheet, name); sheet.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map(function (header) { return record[header] === undefined ? '' : record[header]; })]); }
function getRequiredProperty_(key) { const value = PropertiesService.getScriptProperties().getProperty(key); if (!value) throw new Error('Missing Apps Script property: ' + key); return value; }
function json_(body) { return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON); }

/** Pocket Ledger Google Apps Script API. Configure SCRIPT_PROPERTY SHEET_ID before deployment. */
const SHEET_NAMES = Object.freeze({ TRANSACTIONS: 'Transactions', USERS: 'Users', SETTINGS: 'Settings', AUDIT: 'AuditLog' });
const TRANSACTION_TYPES = Object.freeze({ DEPOSIT: 'DEPOSIT', WITHDRAWAL: 'WITHDRAWAL' });
const ROLES = Object.freeze({ ADMIN: 'admin', MEMBER: 'member' });

function doGet(event) { return handleRequest_(event.parameter || {}); }
function doPost(event) { return handleRequest_(JSON.parse(event.postData && event.postData.contents || '{}')); }

function handleRequest_(request) {
  try {
    const user = authenticate_(request.idToken);
    let result;
    switch (request.action) {
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
  return { email: String(user.email).toLowerCase(), name: user.name, role: user.role };
}

function listTransactions_(user, filters) {
  let rows = getRows_(SHEET_NAMES.TRANSACTIONS);
  if (user.role !== ROLES.ADMIN) rows = rows.filter(function (row) { return row.person === user.name; });
  if (filters.person) rows = rows.filter(function (row) { return row.person === filters.person; });
  if (filters.dateFrom) rows = rows.filter(function (row) { return row.date >= filters.dateFrom; });
  if (filters.dateTo) rows = rows.filter(function (row) { return row.date <= filters.dateTo; });
  return rows.sort(function (left, right) { return String(right.date).localeCompare(String(left.date)); });
}

function createTransaction_(user, transaction) {
  validateTransaction_(transaction);
  if (transaction.type === TRANSACTION_TYPES.WITHDRAWAL && user.role !== ROLES.ADMIN) throw new Error('Only administrators can create withdrawals.');
  if (user.role !== ROLES.ADMIN && transaction.person !== user.name) throw new Error('Members can only create deposits for themselves.');
  const now = new Date().toISOString();
  const record = { id: Utilities.getUuid(), person: transaction.person, type: transaction.type, amount: Number(transaction.amount), date: transaction.date, mode: transaction.mode, note: transaction.note || '', createdBy: user.email, createdAt: now, updatedBy: user.email, updatedAt: now };
  appendRow_(SHEET_NAMES.TRANSACTIONS, record);
  audit_(user.email, 'TRANSACTION', record.id, 'CREATE', null, record);
  return record;
}

function updateTransaction_(user, id, transaction) {
  requireAdmin_(user); validateTransaction_(transaction);
  const existing = findRowById_(SHEET_NAMES.TRANSACTIONS, id);
  if (!existing) throw new Error('Transaction not found.');
  const record = Object.assign({}, existing.row, transaction, { id: id, amount: Number(transaction.amount), updatedBy: user.email, updatedAt: new Date().toISOString() });
  updateRow_(SHEET_NAMES.TRANSACTIONS, existing.rowNumber, record);
  audit_(user.email, 'TRANSACTION', id, 'UPDATE', existing.row, record);
  return record;
}

function deleteTransaction_(user, id) {
  requireAdmin_(user);
  const existing = findRowById_(SHEET_NAMES.TRANSACTIONS, id);
  if (!existing) throw new Error('Transaction not found.');
  getSheet_(SHEET_NAMES.TRANSACTIONS).deleteRow(existing.rowNumber);
  audit_(user.email, 'TRANSACTION', id, 'DELETE', existing.row, null);
  return { id: id };
}

function validateTransaction_(transaction) {
  if (!transaction || !transaction.person || !transaction.date || !transaction.mode || !Object.values(TRANSACTION_TYPES).includes(transaction.type) || !Number.isFinite(Number(transaction.amount)) || Number(transaction.amount) <= 0) throw new Error('Invalid transaction data.');
  if (transaction.type === TRANSACTION_TYPES.WITHDRAWAL && !String(transaction.note || '').trim()) throw new Error('A withdrawal note is required.');
}
function requireAdmin_(user) { if (user.role !== ROLES.ADMIN) throw new Error('Administrator access is required.'); }
function findUserByEmail_(email) { return getRows_(SHEET_NAMES.USERS).find(function (row) { return String(row.email).toLowerCase() === String(email).toLowerCase(); }); }
function findRowById_(sheetName, id) { const rows = getRows_(sheetName); const index = rows.findIndex(function (row) { return row.id === id; }); return index < 0 ? null : { row: rows[index], rowNumber: index + 2 }; }
function audit_(performedBy, entityType, entityId, action, previousValue, newValue) { appendRow_(SHEET_NAMES.AUDIT, { id: Utilities.getUuid(), entityType: entityType, entityId: entityId, action: action, previousValue: previousValue ? JSON.stringify(previousValue) : '', newValue: newValue ? JSON.stringify(newValue) : '', performedBy: performedBy, timestamp: new Date().toISOString() }); }
function getSpreadsheet_() { return SpreadsheetApp.openById(getRequiredProperty_('SHEET_ID')); }
function getSheet_(name) { const sheet = getSpreadsheet_().getSheetByName(name); if (!sheet) throw new Error('Missing required sheet: ' + name); return sheet; }
function getRows_(name) { const sheet = getSheet_(name); const values = sheet.getDataRange().getValues(); if (values.length < 2) return []; const headers = values[0].map(String); return values.slice(1).filter(function (row) { return row.some(function (value) { return value !== ''; }); }).map(function (row) { return headers.reduce(function (record, header, index) { record[header] = row[index] instanceof Date ? Utilities.formatDate(row[index], 'Etc/UTC', "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") : row[index]; return record; }, {}); }); }
function appendRow_(name, record) { const sheet = getSheet_(name); const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; sheet.appendRow(headers.map(function (header) { return record[header] === undefined ? '' : record[header]; })); }
function updateRow_(name, rowNumber, record) { const sheet = getSheet_(name); const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; sheet.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map(function (header) { return record[header] === undefined ? '' : record[header]; })]); }
function getRequiredProperty_(key) { const value = PropertiesService.getScriptProperties().getProperty(key); if (!value) throw new Error('Missing Apps Script property: ' + key); return value; }
function json_(body) { return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON); }

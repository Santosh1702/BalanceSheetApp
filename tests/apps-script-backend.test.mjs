import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const code = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8')
const transactionHeaders = ['id', 'person', 'type', 'amount', 'date', 'mode', 'note', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt']
const auditHeaders = ['id', 'entityType', 'entityId', 'action', 'requestId', 'previousValue', 'newValue', 'performedBy', 'timestamp']
const userHeaders = ['email', 'name', 'role', 'person', 'active']
const requestId = '123e4567-e89b-42d3-a456-426614174000'
const conflict = 'The create request ID has already been used for a different operation.'
const user = { email: 'admin@example.com', name: 'Admin', role: 'admin', person: '' }
const input = { person: 'Sagar', type: 'DEPOSIT', amount: 1000, date: '2026-08-13', mode: 'ONLINE_TRANSFER', note: 'Family deposit' }
const original = {
  id: 'transaction-1',
  ...input,
  createdBy: user.email,
  createdAt: '2026-08-13T10:00:00.000Z',
  updatedBy: user.email,
  updatedAt: '2026-08-13T10:00:00.000Z',
}

function row(headers, record) {
  return headers.map((header) => record[header] ?? '')
}

function auditRow(overrides = {}) {
  return {
    id: 'audit-1',
    entityType: 'TRANSACTION',
    entityId: original.id,
    action: 'CREATE',
    requestId,
    previousValue: '',
    newValue: JSON.stringify(original),
    performedBy: user.email,
    timestamp: '2026-08-13T10:00:00.000Z',
    ...overrides,
  }
}

function createHarness({ auditRows = [], transactionRows = [], users = [{ email: user.email, name: user.name, role: user.role, person: user.person, active: true }], headers = {}, properties = { SHEET_ID: 'spreadsheet-1', GOOGLE_CLIENT_ID: 'client-1' }, lockAvailable = true, batchError = null, tokenInfoBody = JSON.stringify({ aud: 'client-1', email_verified: 'true', email: user.email, name: user.name }), fetchError = null } = {}) {
  const batches = []
  let uuidIndex = 0
  const sheetData = {
    Transactions: { id: 101, headers: headers.Transactions || transactionHeaders, rows: transactionRows },
    AuditLog: { id: 202, headers: headers.AuditLog || auditHeaders, rows: auditRows },
    Users: { id: 303, headers: headers.Users || userHeaders, rows: users },
  }
  const spreadsheet = {
    getSheetByName(name) {
      const data = sheetData[name]
      if (!data) return null
      return {
        getDataRange: () => ({ getValues: () => [data.headers, ...data.rows.map((entry) => row(data.headers, entry))] }),
        getLastColumn: () => data.headers.length,
        getRange: () => ({ getValues: () => [data.headers] }),
        getSheetId: () => data.id,
        getParent: () => ({ getSpreadsheetTimeZone: () => 'Etc/UTC' }),
      }
    },
  }
  const context = vm.createContext({
    console,
    SpreadsheetApp: { openById: () => spreadsheet },
    Sheets: { Spreadsheets: { batchUpdate: (body, spreadsheetId) => { if (batchError) throw batchError; batches.push({ body, spreadsheetId }) } } },
    Utilities: {
      getUuid: () => ['transaction-new', 'audit-new'][uuidIndex++] ?? `uuid-${uuidIndex}`,
      formatDate: () => { throw new Error('Unexpected date formatting') },
    },
    LockService: { getScriptLock: () => ({ tryLock: () => lockAvailable, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => properties[key] || null }) },
    UrlFetchApp: { fetch: () => { if (fetchError) throw fetchError; return { getResponseCode: () => 200, getContentText: () => tokenInfoBody } } },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (content) => ({ content, setMimeType() { return this } }),
    },
  })
  vm.runInContext(code, context)
  return {
    batches,
    call(name, ...args) {
      context.__args = args
      return vm.runInContext(`${name}(...__args)`, context)
    },
  }
}

function responseBody(output) {
  return JSON.parse(output.content)
}

function plain(value) {
  return JSON.parse(JSON.stringify(value))
}

function expectConflict(operation) {
  assert.throws(operation, (error) => error.message === conflict)
}

test('create requestId validation accepts canonical UUID and rejects empty or malformed values', () => {
  const harness = createHarness()
  assert.equal(harness.call('validateCreateRequestId_', ` ${requestId.toUpperCase()} `), requestId)
  assert.throws(() => harness.call('validateCreateRequestId_', ''), /canonical UUID/)
  assert.throws(() => harness.call('validateCreateRequestId_', 'not-a-uuid'), /canonical UUID/)
})

test('same create operation replays the original transaction without writes', () => {
  const harness = createHarness({ auditRows: [auditRow()] })
  const result = plain(harness.call('createTransaction_', user, requestId, input))
  assert.deepEqual(result, original)
  assert.equal(result.id, original.id)
  assert.equal(harness.batches.length, 0)
})

test('replay rejects every changed business field', async (t) => {
  const changes = {
    person: 'Tejas',
    type: 'MONEY_GIVEN',
    amount: 1001,
    date: '2026-08-14',
    mode: 'CASH',
    note: 'Different note',
  }
  for (const [field, value] of Object.entries(changes)) {
    await t.test(field, () => {
      const harness = createHarness({ auditRows: [auditRow()] })
      expectConflict(() => harness.call('createTransaction_', user, requestId, { ...input, [field]: value }))
      assert.equal(harness.batches.length, 0)
    })
  }
})

test('replay accepts notes equivalent after backend trimming', () => {
  const harness = createHarness({ auditRows: [auditRow()] })
  const result = plain(harness.call('createTransaction_', user, requestId, { ...input, note: `  ${input.note}  ` }))
  assert.equal(result.id, original.id)
  assert.equal(result.note, input.note)
  assert.equal(harness.batches.length, 0)
})

test('replay fails closed for the wrong user', () => {
  const harness = createHarness({ auditRows: [auditRow({ performedBy: 'other@example.com' })] })
  expectConflict(() => harness.call('createTransaction_', user, requestId, input))
})

test('replay fails closed for corrupt audit data', async (t) => {
  const cases = {
    'malformed newValue JSON': { newValue: '{bad json' },
    'mismatched entityId': { entityId: 'another-transaction' },
    'wrong entityType': { entityType: 'OTHER' },
    'wrong action': { action: 'UPDATE' },
  }
  for (const [name, overrides] of Object.entries(cases)) {
    await t.test(name, () => {
      const harness = createHarness({ auditRows: [auditRow(overrides)] })
      expectConflict(() => harness.call('createTransaction_', user, requestId, input))
      assert.equal(harness.batches.length, 0)
    })
  }
})

test('duplicate requestId audit rows fail closed', () => {
  const harness = createHarness({ auditRows: [auditRow(), auditRow({ id: 'audit-2' })] })
  expectConflict(() => harness.call('createTransaction_', user, requestId, input))
  assert.equal(harness.batches.length, 0)
})

test('business-date validation handles calendar and leap-year boundaries', () => {
  const harness = createHarness()
  assert.equal(harness.call('isBusinessDate_', '2026-08-13'), true)
  assert.equal(harness.call('isBusinessDate_', '2026-13-01'), false)
  assert.equal(harness.call('isBusinessDate_', '2026-04-31'), false)
  assert.equal(harness.call('isBusinessDate_', '2024-02-29'), true)
  assert.equal(harness.call('isBusinessDate_', '2023-02-29'), false)
})

test('first create builds one atomic transaction and audit append batch with literal cells', () => {
  const harness = createHarness()
  const result = plain(harness.call('createTransaction_', user, requestId, { ...input, note: '=NOT_A_FORMULA()' }))
  assert.equal(result.id, 'transaction-new')
  assert.equal(harness.batches.length, 1)
  const requests = plain(harness.batches[0].body.requests)
  assert.equal(requests.length, 2)
  assert.equal(requests[0].appendCells.sheetId, 101)
  assert.equal(requests[1].appendCells.sheetId, 202)
  const transactionCells = requests[0].appendCells.rows[0].values
  assert.deepEqual(transactionCells[transactionHeaders.indexOf('amount')], { userEnteredValue: { numberValue: 1000 } })
  assert.deepEqual(transactionCells[transactionHeaders.indexOf('date')], { userEnteredValue: { stringValue: '2026-08-13' } })
  assert.deepEqual(transactionCells[transactionHeaders.indexOf('note')], { userEnteredValue: { stringValue: '=NOT_A_FORMULA()' } })
  assert.equal('formulaValue' in transactionCells[transactionHeaders.indexOf('note')].userEnteredValue, false)
  const auditCells = requests[1].appendCells.rows[0].values
  assert.deepEqual(auditCells[auditHeaders.indexOf('action')], { userEnteredValue: { stringValue: 'CREATE' } })
  assert.deepEqual(auditCells[auditHeaders.indexOf('requestId')], { userEnteredValue: { stringValue: requestId } })
  assert.deepEqual(auditCells[auditHeaders.indexOf('entityId')], { userEnteredValue: { stringValue: 'transaction-new' } })
  assert.deepEqual(auditCells[auditHeaders.indexOf('performedBy')], { userEnteredValue: { stringValue: user.email } })
})

test('update and delete request builders use correct zero-based row indexes', () => {
  const harness = createHarness()
  const update = plain(harness.call('updateCellsRequest_', 'Transactions', 7, original))
  assert.deepEqual(update.updateCells.start, { sheetId: 101, rowIndex: 6, columnIndex: 0 })
  const deletion = plain(harness.call('deleteRowRequest_', 'Transactions', 7))
  assert.deepEqual(deletion.deleteDimension.range, { sheetId: 101, dimension: 'ROWS', startIndex: 6, endIndex: 7 })
})

test('matching expectedUpdatedAt updates the transaction and appends its audit atomically', () => {
  const harness = createHarness({ transactionRows: [original] })
  const result = plain(harness.call('updateTransaction_', user, original.id, original.updatedAt, { ...input, amount: 1250 }))

  assert.equal(result.amount, 1250)
  assert.equal(result.id, original.id)
  assert.equal(result.createdAt, original.createdAt)
  assert.equal(harness.batches.length, 1)

  const requests = plain(harness.batches[0].body.requests)
  assert.equal(requests.length, 2)
  assert.deepEqual(requests[0].updateCells.start, { sheetId: 101, rowIndex: 1, columnIndex: 0 })
  assert.equal(requests[1].appendCells.sheetId, 202)

  const transactionCells = requests[0].updateCells.rows[0].values
  assert.deepEqual(transactionCells[transactionHeaders.indexOf('amount')], { userEnteredValue: { numberValue: 1250 } })
  const auditCells = requests[1].appendCells.rows[0].values
  assert.deepEqual(auditCells[auditHeaders.indexOf('action')], { userEnteredValue: { stringValue: 'UPDATE' } })
  assert.deepEqual(auditCells[auditHeaders.indexOf('entityId')], { userEnteredValue: { stringValue: original.id } })
})

test('stale expectedUpdatedAt returns CONFLICT without transaction or audit writes', () => {
  const harness = createHarness({ transactionRows: [original] })
  const response = responseBody(harness.call('handleRequest_', {
    idToken: 'token',
    action: 'transactions.update',
    id: original.id,
    expectedUpdatedAt: '2026-08-13T09:59:59.999Z',
    transaction: input,
  }))

  assert.deepEqual(response, { ok: false, error: { code: 'CONFLICT', message: 'The transaction was changed by another operation. Refresh and try again.' } })
  assert.equal(harness.batches.length, 0)
})

test('missing or malformed update expectedUpdatedAt returns VALIDATION_ERROR', async (t) => {
  const cases = {
    missing: undefined,
    'non-string': 123,
    'missing milliseconds': '2026-08-13T10:00:00Z',
    'non-UTC offset': '2026-08-13T10:00:00.000+05:30',
    'invalid calendar date': '2026-02-30T10:00:00.000Z',
    'invalid time': '2026-08-13T24:00:00.000Z',
  }

  for (const [name, expectedUpdatedAt] of Object.entries(cases)) {
    await t.test(name, () => {
      const harness = createHarness({ transactionRows: [original] })
      const response = responseBody(harness.call('handleRequest_', {
        idToken: 'token',
        action: 'transactions.update',
        id: original.id,
        expectedUpdatedAt,
        transaction: input,
      }))
      assert.equal(response.error.code, 'VALIDATION_ERROR')
      assert.equal(harness.batches.length, 0)
    })
  }
})

test('malformed JSON returns INVALID_REQUEST', () => {
  const harness = createHarness()
  const response = responseBody(harness.call('doPost', { postData: { contents: '{bad json' } }))
  assert.deepEqual(response, { ok: false, error: { code: 'INVALID_REQUEST', message: 'Invalid JSON request body.' } })
})

test('unsupported action returns INVALID_REQUEST', () => {
  const harness = createHarness()
  const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'unsupported' }))
  assert.equal(response.error.code, 'INVALID_REQUEST')
})

test('missing token returns AUTHENTICATION_ERROR', () => {
  const harness = createHarness()
  const response = responseBody(harness.call('handleRequest_', { action: 'auth.me' }))
  assert.equal(response.error.code, 'AUTHENTICATION_ERROR')
})

test('malformed tokeninfo JSON returns AUTHENTICATION_ERROR', () => {
  const harness = createHarness({ tokenInfoBody: '{bad json' })
  const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'auth.me' }))
  assert.deepEqual(response, { ok: false, error: { code: 'AUTHENTICATION_ERROR', message: 'Google identity verification failed.' } })
})

test('tokeninfo fetch failures return generic INTERNAL_ERROR without exposing raw messages', () => {
  const harness = createHarness({ fetchError: new Error('private tokeninfo infrastructure failure') })
  const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'auth.me' }))
  assert.deepEqual(response, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } })
  assert.equal(JSON.stringify(response).includes('private tokeninfo infrastructure failure'), false)
})

test('invalid transaction returns VALIDATION_ERROR', () => {
  const harness = createHarness()
  const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'transactions.create', requestId, transaction: { ...input, amount: 0 } }))
  assert.equal(response.error.code, 'VALIDATION_ERROR')
})

test('unauthorized transaction operation returns AUTHORIZATION_ERROR', () => {
  const member = { email: user.email, name: 'Member', role: 'member', person: 'Sagar', active: true }
  const harness = createHarness({ users: [member] })
  const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'transactions.create', requestId, transaction: { ...input, type: 'MONEY_GIVEN' } }))
  assert.equal(response.error.code, 'AUTHORIZATION_ERROR')
})

test('missing transaction returns NOT_FOUND', () => {
  const harness = createHarness()
  const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'transactions.update', id: 'missing', expectedUpdatedAt: original.updatedAt, transaction: input }))
  assert.equal(response.error.code, 'NOT_FOUND')
})

test('requestId replay mismatch returns CONFLICT', () => {
  const harness = createHarness({ auditRows: [auditRow()] })
  const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'transactions.create', requestId, transaction: { ...input, amount: 1001 } }))
  assert.equal(response.error.code, 'CONFLICT')
})

test('duplicate transaction IDs return CONFLICT', () => {
  const duplicate = { ...original, id: 'duplicate' }
  const harness = createHarness({ transactionRows: [duplicate, duplicate] })
  const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'transactions.update', id: 'duplicate', expectedUpdatedAt: original.updatedAt, transaction: input }))
  assert.equal(response.error.code, 'CONFLICT')
})

test('lock acquisition failure returns SERVICE_BUSY', () => {
  const harness = createHarness({ lockAvailable: false })
  const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'transactions.create', requestId, transaction: input }))
  assert.equal(response.error.code, 'SERVICE_BUSY')
})

test('missing script property returns CONFIGURATION_ERROR', () => {
  const harness = createHarness({ properties: { SHEET_ID: 'spreadsheet-1' } })
  const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'auth.me' }))
  assert.equal(response.error.code, 'CONFIGURATION_ERROR')
})

test('missing and duplicate required headers return CONFIGURATION_ERROR', async (t) => {
  await t.test('missing header', () => {
    const harness = createHarness({ headers: { Transactions: transactionHeaders.filter((header) => header !== 'id') } })
    const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'transactions.list', filters: {} }))
    assert.equal(response.error.code, 'CONFIGURATION_ERROR')
  })
  await t.test('duplicate header', () => {
    const harness = createHarness({ headers: { Transactions: [...transactionHeaders, 'id'] } })
    const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'transactions.list', filters: {} }))
    assert.equal(response.error.code, 'CONFIGURATION_ERROR')
  })
})

test('unexpected errors return generic INTERNAL_ERROR without exposing raw messages', () => {
  const harness = createHarness({ batchError: new Error('private backend failure') })
  const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'transactions.create', requestId, transaction: input }))
  assert.deepEqual(response, { ok: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } })
  assert.equal(JSON.stringify(response).includes('private backend failure'), false)
})

test('successful response shape remains unchanged', () => {
  const harness = createHarness()
  const response = responseBody(harness.call('handleRequest_', { idToken: 'token', action: 'auth.me' }))
  assert.deepEqual(response, { ok: true, data: { email: user.email, name: user.name, role: user.role, person: user.person } })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const code = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8')
const transactionHeaders = ['id', 'person', 'type', 'amount', 'date', 'mode', 'note', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt']
const auditHeaders = ['id', 'entityType', 'entityId', 'action', 'requestId', 'previousValue', 'newValue', 'performedBy', 'timestamp']
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

function createHarness({ auditRows = [] } = {}) {
  const batches = []
  let uuidIndex = 0
  const sheetData = {
    Transactions: { id: 101, headers: transactionHeaders, rows: [] },
    AuditLog: { id: 202, headers: auditHeaders, rows: auditRows },
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
    Sheets: { Spreadsheets: { batchUpdate: (body, spreadsheetId) => batches.push({ body, spreadsheetId }) } },
    Utilities: {
      getUuid: () => ['transaction-new', 'audit-new'][uuidIndex++] ?? `uuid-${uuidIndex}`,
      formatDate: () => { throw new Error('Unexpected date formatting') },
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => key === 'SHEET_ID' ? 'spreadsheet-1' : 'unused' }) },
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

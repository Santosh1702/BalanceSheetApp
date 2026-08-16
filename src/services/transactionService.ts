import { apiClient, apiErrorMessage, assertApiConfigured } from './apiClient'
import type { ApiResponse } from './apiClient'
import {
  transactionDeleteResponseSchema,
  transactionListResponseSchema,
  transactionResponseSchema,
} from '../types/transaction'
import type { Transaction, TransactionInput } from '../types/transaction'

const invalidTransactionDataMessage = 'The server returned invalid transaction data.'

async function request<T>(idToken: string, action: string, payload: Record<string, unknown> = {}) {
  assertApiConfigured()
  const response = await apiClient.post<ApiResponse<T>>('', {
    idToken,
    action,
    ...payload,
  })

  if (!response.data.ok) {
    throw new Error(apiErrorMessage(response.data, 'The API request failed.'))
  }

  return response.data.data
}

function normalizeBusinessDate(value: string | null | undefined) {
  if (!value) return ''

  const raw = String(value).trim()
  if (!raw) return ''

  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : raw
}

function normalizeTransaction(transaction: Transaction): Transaction {
  return {
    ...transaction,
    date: normalizeBusinessDate(transaction.date),
  }
}

function validateResponse<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new Error(invalidTransactionDataMessage)
  return result.data
}

export const transactionService = {
  list: async (idToken: string) => {
    const data = await request<unknown>(idToken, 'transactions.list')
    const transactions = validateResponse(transactionListResponseSchema, data)
    return transactions.map(normalizeTransaction)
  },
  create: async (idToken: string, requestId: string, transaction: TransactionInput) => {
    const data = await request<unknown>(idToken, 'transactions.create', { requestId, transaction })
    const created = validateResponse(transactionResponseSchema, data)
    return normalizeTransaction(created)
  },
  update: async (idToken: string, id: string, expectedUpdatedAt: string, transaction: TransactionInput) => {
    const data = await request<unknown>(idToken, 'transactions.update', { id, expectedUpdatedAt, transaction })
    const updated = validateResponse(transactionResponseSchema, data)
    return normalizeTransaction(updated)
  },
  remove: async (idToken: string, id: string) => {
    const data = await request<unknown>(idToken, 'transactions.delete', { id })
    return validateResponse(transactionDeleteResponseSchema, data)
  },
}

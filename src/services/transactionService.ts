import { apiClient, assertApiConfigured } from './apiClient'
import type { Transaction, TransactionInput } from '../types/transaction'

interface ApiResponse<T> {
  readonly ok: boolean
  readonly data?: T
  readonly error?: string
}

async function request<T>(idToken: string, action: string, payload: Record<string, unknown> = {}) {
  assertApiConfigured()
  const response = await apiClient.post<ApiResponse<T>>('', {
    idToken,
    action,
    ...payload,
  })

  if (!response.data.ok || !response.data.data) {
    throw new Error(response.data.error || 'The API request failed.')
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

export const transactionService = {
  list: async (idToken: string) => {
    const transactions = await request<Transaction[]>(idToken, 'transactions.list')
    return transactions.map(normalizeTransaction)
  },
  create: async (idToken: string, transaction: TransactionInput) => {
    const created = await request<Transaction>(idToken, 'transactions.create', { transaction })
    return normalizeTransaction(created)
  },
  update: async (idToken: string, id: string, transaction: TransactionInput) => {
    const updated = await request<Transaction>(idToken, 'transactions.update', { id, transaction })
    return normalizeTransaction(updated)
  },
  remove: (idToken: string, id: string) => request<{ id: string }>(idToken, 'transactions.delete', { id }),
}

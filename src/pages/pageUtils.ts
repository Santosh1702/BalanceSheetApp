import { PaymentMode, TransactionType } from '../types/transaction'

export const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export function formatMode(mode: PaymentMode) {
  return mode.replace('_', ' ').toLowerCase()
}

export function formatTransactionType(type: TransactionType) {
  return type === TransactionType.Deposit ? 'Deposit' : 'Payment'
}

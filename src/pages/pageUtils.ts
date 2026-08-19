import { PaymentMode, TransactionType } from '../types/transaction'
import type { BusinessDate, BusinessMonth } from '../domain/businessDate'

const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const longMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export function formatMode(mode: PaymentMode) {
  return mode.replace('_', ' ').toLowerCase()
}

export function formatTransactionType(type: TransactionType) {
  return type === TransactionType.Deposit ? 'Deposit' : 'Payment'
}

export function formatBusinessDate(date: BusinessDate) {
  const [year, month, day] = date.split('-')
  return `${shortMonthNames[Number(month) - 1]} ${Number(day)}, ${year}`
}

export function formatBusinessMonth(month: BusinessMonth) {
  const [year, monthNumber] = month.split('-')
  return `${longMonthNames[Number(monthNumber) - 1]} ${year}`
}

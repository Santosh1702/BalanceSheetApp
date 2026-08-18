import { getBusinessMonth, getCalendarDay, getLocalTodayBusinessDate } from './businessDate'
import type { BusinessDate, BusinessMonth } from './businessDate'
import { TransactionType } from '../types/transaction'
import type { Person, Transaction } from '../types/transaction'

type CalculationTransaction = Pick<Transaction, 'person' | 'type' | 'amount' | 'date'>

export interface TransactionTotals {
  deposited: number
  withdrawn: number
  net: number
}

export interface DailyTransactionAggregate<T extends CalculationTransaction = CalculationTransaction> extends TransactionTotals {
  transactions: T[]
}

export function getSignedTransactionAmount(transaction: Pick<CalculationTransaction, 'type' | 'amount'>) {
  return transaction.type === TransactionType.Deposit ? transaction.amount : -transaction.amount
}

export function calculateAvailableBalance(
  transactions: readonly CalculationTransaction[],
  person: Person,
  today: BusinessDate = getLocalTodayBusinessDate(),
) {
  return transactions.reduce((balance, transaction) => {
    if (transaction.person !== person || transaction.date > today) return balance
    return balance + getSignedTransactionAmount(transaction)
  }, 0)
}

export function calculateCurrentMonthAverageDailyDeposit(
  transactions: readonly CalculationTransaction[],
  person: Person,
  today: BusinessDate = getLocalTodayBusinessDate(),
) {
  const currentMonth = getBusinessMonth(today)
  const deposits = transactions.reduce((total, transaction) => {
    if (
      transaction.person !== person
      || transaction.type !== TransactionType.Deposit
      || getBusinessMonth(transaction.date) !== currentMonth
      || transaction.date > today
    ) return total
    return total + transaction.amount
  }, 0)

  return deposits / getCalendarDay(today)
}

export function calculateSelectedMonthSummary(
  transactions: readonly CalculationTransaction[],
  person: Person,
  month: BusinessMonth,
): TransactionTotals {
  let deposited = 0
  let withdrawn = 0

  for (const transaction of transactions) {
    if (transaction.person !== person || getBusinessMonth(transaction.date) !== month) continue
    if (transaction.type === TransactionType.Deposit) deposited += transaction.amount
    else withdrawn += transaction.amount
  }

  return { deposited, withdrawn, net: deposited - withdrawn }
}

export function aggregateTransactionsByDate<T extends CalculationTransaction>(
  transactions: readonly T[],
): Record<string, DailyTransactionAggregate<T>> {
  const aggregates: Record<string, DailyTransactionAggregate<T>> = {}

  for (const transaction of transactions) {
    const aggregate = aggregates[transaction.date] ?? {
      deposited: 0,
      withdrawn: 0,
      net: 0,
      transactions: [],
    }

    if (transaction.type === TransactionType.Deposit) aggregate.deposited += transaction.amount
    else aggregate.withdrawn += transaction.amount
    aggregate.net = aggregate.deposited - aggregate.withdrawn
    aggregate.transactions.push(transaction)
    aggregates[transaction.date] = aggregate
  }

  return aggregates
}

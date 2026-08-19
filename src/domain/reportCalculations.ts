import { getBusinessMonth, getLocalTodayBusinessDate } from './businessDate'
import type { BusinessDate, BusinessMonth } from './businessDate'
import { PaymentMode, TransactionType } from '../types/transaction'
import type { Person, Transaction } from '../types/transaction'

export const ReportPeriodPreset = {
  ThisMonth: 'THIS_MONTH',
  LastMonth: 'LAST_MONTH',
  Last3Months: 'LAST_3_MONTHS',
  Last6Months: 'LAST_6_MONTHS',
  ThisYear: 'THIS_YEAR',
  AllTime: 'ALL_TIME',
} as const

export type ReportPeriodPreset = (typeof ReportPeriodPreset)[keyof typeof ReportPeriodPreset]

export interface ResolvedReportPeriod {
  preset: ReportPeriodPreset
  startDate: BusinessDate | null
  endDate: BusinessDate
  isEmpty: boolean
}

export interface ReportSummary {
  deposited: number
  withdrawn: number
  net: number
  transactionCount: number
  depositCount: number
  withdrawalCount: number
  averageDailyDeposit: number
}

export interface ReportTrendBucket {
  key: BusinessDate | BusinessMonth
  deposited: number
  withdrawn: number
  net: number
}

export interface ReportMonthComparison {
  month: BusinessMonth
  deposited: number
  withdrawn: number
  net: number
  isPartial: boolean
}

export interface PaymentModeBreakdown {
  mode: PaymentMode
  amount: number
  transactionCount: number
  percentage: number
}

export interface HighestDepositMonth {
  month: BusinessMonth
  deposited: number
}

type ReportTransaction = Pick<Transaction, 'person' | 'type' | 'amount' | 'date' | 'mode'>
type PeriodTransaction = Pick<ReportTransaction, 'type' | 'amount' | 'date' | 'mode'>

interface DateParts {
  year: number
  month: number
  day: number
}

function parseBusinessDate(date: BusinessDate): DateParts {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

function formatBusinessDate({ year, month, day }: DateParts): BusinessDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` as BusinessDate
}

function formatBusinessMonth(year: number, month: number): BusinessMonth {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}` as BusinessMonth
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number) {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}

function addCalendarDays(date: BusinessDate, amount: number): BusinessDate {
  const parts = parseBusinessDate(date)
  let remaining = amount

  while (remaining > 0) {
    parts.day += 1
    if (parts.day > daysInMonth(parts.year, parts.month)) {
      parts.day = 1
      parts.month += 1
      if (parts.month > 12) {
        parts.month = 1
        parts.year += 1
      }
    }
    remaining -= 1
  }

  return formatBusinessDate(parts)
}

function moveMonth(month: BusinessMonth, amount: number): BusinessMonth {
  const [year, monthNumber] = month.split('-').map(Number)
  const zeroBasedMonth = year * 12 + monthNumber - 1 + amount
  const nextYear = Math.floor(zeroBasedMonth / 12)
  const nextMonth = zeroBasedMonth - nextYear * 12 + 1
  return formatBusinessMonth(nextYear, nextMonth)
}

function firstDateOfMonth(month: BusinessMonth): BusinessDate {
  return `${month}-01` as BusinessDate
}

function lastDateOfMonth(month: BusinessMonth): BusinessDate {
  const [year, monthNumber] = month.split('-').map(Number)
  return formatBusinessDate({ year, month: monthNumber, day: daysInMonth(year, monthNumber) })
}

function emptyPeriod(preset: ReportPeriodPreset, today: BusinessDate): ResolvedReportPeriod {
  return { preset, startDate: null, endDate: today, isEmpty: true }
}

export function resolveReportPeriod(
  preset: ReportPeriodPreset,
  transactions: readonly ReportTransaction[],
  person: Person,
  today: BusinessDate = getLocalTodayBusinessDate(),
): ResolvedReportPeriod {
  const currentMonth = getBusinessMonth(today)

  if (preset === ReportPeriodPreset.AllTime) {
    const earliestDate = transactions.reduce<BusinessDate | null>((earliest, transaction) => {
      if (transaction.person !== person || transaction.date > today) return earliest
      return earliest === null || transaction.date < earliest ? transaction.date as BusinessDate : earliest
    }, null)

    return earliestDate
      ? { preset, startDate: earliestDate, endDate: today, isEmpty: false }
      : emptyPeriod(preset, today)
  }

  let startDate: BusinessDate
  let endDate = today

  switch (preset) {
    case ReportPeriodPreset.ThisMonth:
      startDate = firstDateOfMonth(currentMonth)
      break
    case ReportPeriodPreset.LastMonth: {
      const lastMonth = moveMonth(currentMonth, -1)
      startDate = firstDateOfMonth(lastMonth)
      endDate = lastDateOfMonth(lastMonth)
      break
    }
    case ReportPeriodPreset.Last3Months:
      startDate = firstDateOfMonth(moveMonth(currentMonth, -2))
      break
    case ReportPeriodPreset.Last6Months:
      startDate = firstDateOfMonth(moveMonth(currentMonth, -5))
      break
    case ReportPeriodPreset.ThisYear:
      startDate = `${today.slice(0, 4)}-01-01` as BusinessDate
      break
  }

  return { preset, startDate, endDate, isEmpty: false }
}

export function filterTransactionsForReport<T extends ReportTransaction>(
  transactions: readonly T[],
  person: Person,
  period: ResolvedReportPeriod,
  today: BusinessDate = getLocalTodayBusinessDate(),
): T[] {
  if (period.isEmpty || period.startDate === null) return []
  const endDate = period.endDate < today ? period.endDate : today

  return transactions.filter((transaction) => (
    transaction.person === person
    && transaction.date >= period.startDate!
    && transaction.date <= endDate
    && transaction.date <= today
  ))
}

export function countInclusiveCalendarDays(startDate: BusinessDate | null, endDate: BusinessDate) {
  if (startDate === null || startDate > endDate) return 0

  let count = 1
  let date = startDate
  while (date < endDate) {
    date = addCalendarDays(date, 1)
    count += 1
  }
  return count
}

export function calculateReportSummary(
  transactions: readonly PeriodTransaction[],
  period: ResolvedReportPeriod,
): ReportSummary {
  let deposited = 0
  let withdrawn = 0
  let depositCount = 0
  let withdrawalCount = 0

  for (const transaction of transactions) {
    if (transaction.type === TransactionType.Deposit) {
      deposited += transaction.amount
      depositCount += 1
    } else {
      withdrawn += transaction.amount
      withdrawalCount += 1
    }
  }

  const eligibleDays = period.isEmpty ? 0 : countInclusiveCalendarDays(period.startDate, period.endDate)
  return {
    deposited,
    withdrawn,
    net: deposited - withdrawn,
    transactionCount: depositCount + withdrawalCount,
    depositCount,
    withdrawalCount,
    averageDailyDeposit: eligibleDays > 0 ? deposited / eligibleDays : 0,
  }
}

function addToBucket(bucket: ReportTrendBucket, transaction: PeriodTransaction) {
  if (transaction.type === TransactionType.Deposit) bucket.deposited += transaction.amount
  else bucket.withdrawn += transaction.amount
  bucket.net = bucket.deposited - bucket.withdrawn
}

export function createDailyTrendBuckets(
  transactions: readonly PeriodTransaction[],
  period: ResolvedReportPeriod,
): ReportTrendBucket[] {
  if (period.isEmpty || period.startDate === null || period.startDate > period.endDate) return []

  const buckets = new Map<BusinessDate, ReportTrendBucket>()
  for (let date = period.startDate; date <= period.endDate; date = addCalendarDays(date, 1)) {
    buckets.set(date, { key: date, deposited: 0, withdrawn: 0, net: 0 })
  }
  for (const transaction of transactions) {
    const bucket = buckets.get(transaction.date as BusinessDate)
    if (bucket) addToBucket(bucket, transaction)
  }
  return [...buckets.values()]
}

export function createMonthlyTrendBuckets(
  transactions: readonly PeriodTransaction[],
  period: ResolvedReportPeriod,
): ReportTrendBucket[] {
  if (period.isEmpty || period.startDate === null || period.startDate > period.endDate) return []

  const startMonth = getBusinessMonth(period.startDate)
  const endMonth = getBusinessMonth(period.endDate)
  const buckets = new Map<BusinessMonth, ReportTrendBucket>()
  for (let month = startMonth; month <= endMonth; month = moveMonth(month, 1)) {
    buckets.set(month, { key: month, deposited: 0, withdrawn: 0, net: 0 })
  }
  for (const transaction of transactions) {
    const bucket = buckets.get(getBusinessMonth(transaction.date))
    if (bucket) addToBucket(bucket, transaction)
  }
  return [...buckets.values()]
}

export function createMonthComparisons(
  transactions: readonly PeriodTransaction[],
  period: ResolvedReportPeriod,
): ReportMonthComparison[] {
  if (period.isEmpty || period.startDate === null) return []

  const startMonth = getBusinessMonth(period.startDate)
  return createMonthlyTrendBuckets(transactions, period).map((bucket) => {
    const month = bucket.key as BusinessMonth
    return {
      month,
      deposited: bucket.deposited,
      withdrawn: bucket.withdrawn,
      net: bucket.net,
      isPartial: (month === startMonth && period.startDate !== firstDateOfMonth(month))
        || (month === getBusinessMonth(period.endDate) && period.endDate !== lastDateOfMonth(month)),
    }
  })
}

export function calculatePaymentModeBreakdown(
  transactions: readonly PeriodTransaction[],
): PaymentModeBreakdown[] {
  const breakdown = new Map<PaymentMode, { amount: number; transactionCount: number }>(
    Object.values(PaymentMode).map((mode) => [mode, { amount: 0, transactionCount: 0 }]),
  )

  for (const transaction of transactions) {
    const mode = breakdown.get(transaction.mode)
    if (!mode) continue
    mode.amount += transaction.amount
    mode.transactionCount += 1
  }

  const totalAmount = [...breakdown.values()].reduce((total, mode) => total + mode.amount, 0)
  return Object.values(PaymentMode).map((mode) => {
    const totals = breakdown.get(mode)!
    return {
      mode,
      amount: totals.amount,
      transactionCount: totals.transactionCount,
      percentage: totalAmount > 0 ? totals.amount / totalAmount * 100 : 0,
    }
  })
}

export function findHighestDepositMonth(
  comparisons: readonly ReportMonthComparison[],
): HighestDepositMonth | null {
  let highest: HighestDepositMonth | null = null

  for (const comparison of comparisons) {
    if (comparison.deposited <= 0) continue
    if (
      highest === null
      || comparison.deposited > highest.deposited
      || (comparison.deposited === highest.deposited && comparison.month > highest.month)
    ) {
      highest = { month: comparison.month, deposited: comparison.deposited }
    }
  }

  return highest
}

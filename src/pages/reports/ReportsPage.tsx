import { Alert, Skeleton, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { MemberTabs } from '../../components/dashboard/MemberTabs'
import { ModeBreakdown } from '../../components/reports/ModeBreakdown'
import { MonthComparison } from '../../components/reports/MonthComparison'
import { PeriodSelector } from '../../components/reports/PeriodSelector'
import { ReportInsight } from '../../components/reports/ReportInsight'
import { ReportKpiCard } from '../../components/reports/ReportKpiCard'
import { getLocalTodayBusinessDate } from '../../domain/businessDate'
import type { BusinessDate } from '../../domain/businessDate'
import {
  ReportPeriodPreset,
  calculatePaymentModeBreakdown,
  calculateReportSummary,
  createMonthComparisons,
  filterTransactionsForReport,
  findHighestDepositMonth,
  resolveReportPeriod,
} from '../../domain/reportCalculations'
import type { ReportPeriodPreset as ReportPeriodPresetValue } from '../../domain/reportCalculations'
import { useAuth } from '../../hooks/useAuth'
import { transactionService } from '../../services/transactionService'
import { UserRole } from '../../types/auth'
import { Person } from '../../types/transaction'
import { currency, formatBusinessDate } from '../pageUtils'
import './ReportsPage.css'

function reportPeriodCaption(startDate: BusinessDate | null, endDate: BusinessDate) {
  if (startDate === null) return 'No reportable history'
  const start = formatBusinessDate(startDate)
  const end = formatBusinessDate(endDate)
  return start === end ? start : `${start} – ${end}`
}

function LoadingReports() {
  return (
    <div aria-label="Loading report summaries" className="reports-loading">
      {Array.from({ length: 4 }, (_, index) => <Skeleton height={132} key={index} variant="rounded" />)}
    </div>
  )
}

export function ReportsPage() {
  const { idToken, user } = useAuth()
  const today = getLocalTodayBusinessDate()
  const people = user?.role === UserRole.Admin ? Object.values(Person) : user?.person ? [user.person] : []
  const [person, setPerson] = useState<Person>(user?.person ?? Person.Sagar)
  const [preset, setPreset] = useState<ReportPeriodPresetValue>(ReportPeriodPreset.Last6Months)
  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionService.list(idToken!),
    enabled: Boolean(idToken),
  })
  const allTransactions = useMemo(() => query.data ?? [], [query.data])
  const period = useMemo(
    () => resolveReportPeriod(preset, allTransactions, person, today),
    [allTransactions, person, preset, today],
  )
  const transactions = useMemo(
    () => filterTransactionsForReport(allTransactions, person, period, today),
    [allTransactions, period, person, today],
  )
  const summary = useMemo(() => calculateReportSummary(transactions, period), [period, transactions])
  const comparisons = useMemo(() => createMonthComparisons(transactions, period), [period, transactions])
  const modes = useMemo(() => calculatePaymentModeBreakdown(transactions), [transactions])
  const highestMonth = useMemo(() => findHighestDepositMonth(comparisons), [comparisons])
  const memberHasHistory = useMemo(() => (
    allTransactions.some((transaction) => transaction.person === person && transaction.date <= today)
  ), [allTransactions, person, today])
  const hasCachedData = query.data !== undefined

  return (
    <section className="reports-page">
      <header className="reports-header">
        <div>
          <Typography className="reports-eyebrow">Read-only analysis</Typography>
          <Typography component="h1" variant="h1">Reports</Typography>
          <Typography color="text.secondary">Trends, comparisons, and financial summaries for each ledger member.</Typography>
        </div>
      </header>

      <div className="reports-controls">
        <MemberTabs ariaLabel="Report member" onChange={setPerson} people={people} selected={person} />
        <PeriodSelector
          caption={reportPeriodCaption(period.startDate, period.endDate)}
          onChange={setPreset}
          throughToday={!period.isEmpty && period.endDate === today}
          value={preset}
        />
      </div>

      {query.isError && (
        <Alert severity="error">
          {hasCachedData ? `Could not refresh reports. Showing the last available data. ${query.error.message}` : query.error.message}
        </Alert>
      )}

      {query.isLoading ? <LoadingReports /> : !hasCachedData && query.isError ? null : !memberHasHistory ? (
        <div className="report-card reports-empty">
          <Typography component="h2" variant="h6">No reportable activity</Typography>
          <Typography color="text.secondary">There are no non-future transactions for {person} yet.</Typography>
        </div>
      ) : (
        <>
          <div className="report-kpi-grid">
            <ReportKpiCard label="Total deposited" supportingText={`${summary.depositCount} ${summary.depositCount === 1 ? 'deposit' : 'deposits'}`} tone="positive" value={currency.format(summary.deposited)} />
            <ReportKpiCard label="Total withdrawn" supportingText={`${summary.withdrawalCount} ${summary.withdrawalCount === 1 ? 'withdrawal' : 'withdrawals'}`} tone="negative" value={currency.format(summary.withdrawn)} />
            <ReportKpiCard label="Net movement" supportingText={`${summary.transactionCount} ${summary.transactionCount === 1 ? 'transaction' : 'transactions'}`} tone={summary.net < 0 ? 'negative' : summary.net > 0 ? 'positive' : 'neutral'} value={currency.format(summary.net)} />
            <ReportKpiCard label="Average daily deposit" supportingText="Calendar-day pace" tone="brand" value={currency.format(summary.averageDailyDeposit)} />
          </div>

          <div className="reports-composition">
            <MonthComparison comparisons={comparisons} />
            <div className="reports-side-column">
              <ModeBreakdown modes={modes} />
              <ReportInsight highestMonth={highestMonth} />
            </div>
          </div>
        </>
      )}
    </section>
  )
}

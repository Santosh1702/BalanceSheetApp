import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import { Alert, Button, Fab, Snackbar, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { CalendarGrid } from '../../components/calendar/CalendarGrid'
import { MonthNavigator } from '../../components/calendar/MonthNavigator'
import { SelectedMonthSummary } from '../../components/calendar/SelectedMonthSummary'
import { KpiCard } from '../../components/dashboard/KpiCard'
import { MemberTabs } from '../../components/dashboard/MemberTabs'
import { DeleteTransactionDialog } from '../../components/transactions/DeleteTransactionDialog'
import { TransactionDialog } from '../../components/transactions/TransactionDialog'
import { TransactionFeed } from '../../components/transactions/TransactionFeed'
import { getBusinessMonth, getCalendarDay, getLocalTodayBusinessDate } from '../../domain/businessDate'
import type { BusinessDate, BusinessMonth } from '../../domain/businessDate'
import { canCreateTransaction, canDeleteTransaction, canEditTransaction } from '../../domain/transactionCapabilities'
import {
  aggregateTransactionsByDate,
  calculateAvailableBalance,
  calculateCurrentMonthAverageDailyDeposit,
  calculateSelectedMonthSummary,
} from '../../domain/transactionCalculations'
import { useAuth } from '../../hooks/useAuth'
import { useTransactionMutations } from '../../hooks/useTransactionMutations'
import { transactionService } from '../../services/transactionService'
import { UserRole } from '../../types/auth'
import { Person, TransactionType } from '../../types/transaction'
import type { Transaction, TransactionInput } from '../../types/transaction'
import { currency } from '../pageUtils'
import './DashboardPage.css'

function moveMonth(month: BusinessMonth, amount: number) {
  return dayjs(`${month}-01`).add(amount, 'month').format('YYYY-MM') as BusinessMonth
}
export function DashboardPage() {
  const { idToken, user } = useAuth()
  const actor = user ?? { role: UserRole.Member, person: Person.Sagar }
  const people = user?.role === UserRole.Admin ? Object.values(Person) : user?.person ? [user.person] : []
  const today = getLocalTodayBusinessDate()
  const currentMonth = getBusinessMonth(today)
  const [person, setPerson] = useState<Person>(user?.person ?? Person.Sagar)
  const [month, setMonth] = useState<BusinessMonth>(currentMonth)
  const [selectedDate, setSelectedDate] = useState<BusinessDate | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionService.list(idToken!),
    enabled: Boolean(idToken),
  })
  const { clearCreateRequest, notice, remove, save, setNotice } = useTransactionMutations({
    editing,
    idToken,
    onSaveSuccess: () => { setDialogOpen(false); setEditing(null) },
    onDeleteSuccess: () => setDeleteTarget(null),
  })

  const transactions = useMemo(() => (
    (query.data ?? []).filter((transaction) => transaction.person === person)
  ), [person, query.data])
  const aggregates = useMemo(() => aggregateTransactionsByDate(transactions), [transactions])
  const monthSummary = useMemo(() => calculateSelectedMonthSummary(transactions, person, month), [month, person, transactions])
  const availableBalance = useMemo(() => calculateAvailableBalance(transactions, person, today), [person, today, transactions])
  const averageDailyDeposit = useMemo(
    () => calculateCurrentMonthAverageDailyDeposit(transactions, person, today),
    [person, today, transactions],
  )
  const feedTransactions = useMemo(() => {
    if (selectedDate) return aggregates[selectedDate]?.transactions ?? []
    return transactions.filter((transaction) => getBusinessMonth(transaction.date) === month)
  }, [aggregates, month, selectedDate, transactions])
  const hasCachedData = query.data !== undefined
  const canManage = canEditTransaction(actor) && canDeleteTransaction(actor)
  const canAdd = canCreateTransaction(actor, { person, type: TransactionType.Deposit })

  const selectPerson = (nextPerson: Person) => {
    setPerson(nextPerson)
    setSelectedDate(null)
  }
  const selectDate = (date: BusinessDate) => {
    setMonth(getBusinessMonth(date))
    setSelectedDate(date)
  }
  const navigateMonth = (amount: number) => {
    setMonth((current) => moveMonth(current, amount))
    setSelectedDate(null)
  }
  const returnToCurrentMonth = () => {
    setMonth(currentMonth)
    setSelectedDate(null)
  }
  const startCreate = () => {
    clearCreateRequest()
    setEditing(null)
    setDialogOpen(true)
  }
  const startEdit = (transaction: Transaction) => {
    setEditing(transaction)
    setDialogOpen(true)
  }
  const closeDialog = () => {
    clearCreateRequest()
    setDialogOpen(false)
  }

  return (
    <section className="admin-dashboard">
      <header className="dashboard-header">
        <div>
          <Typography className="dashboard-eyebrow">{user?.role === UserRole.Admin ? 'Admin workspace' : 'Your ledger'}</Typography>
          <Typography component="h1" variant="h1">Financial overview</Typography>
          <Typography color="text.secondary">Balances, calendar activity, and transactions in one place.</Typography>
        </div>
        {canAdd && <Button className="dashboard-add-desktop" onClick={startCreate} startIcon={<AddOutlinedIcon />} variant="contained">Add transaction</Button>}
      </header>

      <MemberTabs onChange={selectPerson} people={people} selected={person} />
      {query.isError && <Alert severity="error">{query.error.message}</Alert>}

      {(!query.isError || hasCachedData) && (
        <>
          <div className="dashboard-kpis">
            <KpiCard label="Available balance" subtitle={`Through today · ${today}`} tone={availableBalance < 0 ? 'negative' : 'default'} value={query.isLoading ? '…' : currency.format(availableBalance)} />
            <KpiCard label="Average daily deposit" subtitle={`Current month · ${getCalendarDay(today)} elapsed days`} value={query.isLoading ? '…' : currency.format(averageDailyDeposit)} />
          </div>

          <div className="dashboard-bento">
            <div className="dashboard-calendar-pane">
              <div className="glass-card dashboard-calendar-card">
                <MonthNavigator month={month} onNext={() => navigateMonth(1)} onPrevious={() => navigateMonth(-1)} onReturnToCurrent={returnToCurrentMonth} />
                {month !== currentMonth && <Typography className="dashboard-viewing" color="text.secondary" variant="body2">Viewing {dayjs(`${month}-01`).format('MMMM YYYY')}</Typography>}
                <CalendarGrid aggregates={aggregates} month={month} onSelectDate={selectDate} selectedDate={selectedDate} today={today} />
              </div>
              <div className="glass-card dashboard-month-summary"><SelectedMonthSummary totals={monthSummary} /></div>
            </div>

            <aside className="glass-card dashboard-transactions-pane">
              <div className="dashboard-feed-heading">
                <div>
                  <Typography component="h2" variant="h6">Transactions</Typography>
                  <Typography color="text.secondary" variant="body2">{selectedDate ? `Filtered to ${selectedDate}` : dayjs(`${month}-01`).format('MMMM YYYY')}</Typography>
                </div>
                {selectedDate && <Button onClick={() => setSelectedDate(null)}>Clear date</Button>}
              </div>
              {query.isLoading
                ? <Typography color="text.secondary">Loading transactions…</Typography>
                : <TransactionFeed canManage={canManage} emptyMessage={selectedDate ? 'No transactions for this date.' : 'No transactions for this month.'} onDelete={setDeleteTarget} onEdit={startEdit} transactions={feedTransactions} />}
            </aside>
          </div>
        </>
      )}

      {canAdd && <Fab aria-label={`Add transaction for ${person}`} className="dashboard-fab" color="primary" onClick={startCreate}><AddOutlinedIcon /></Fab>}
      <TransactionDialog actor={actor} defaultPerson={person} editing={editing} onClose={closeDialog} onSave={(data) => save.mutate(data as TransactionInput)} open={dialogOpen} saving={save.isPending} />
      {canDeleteTransaction(actor) && <DeleteTransactionDialog deleting={remove.isPending} onClose={() => setDeleteTarget(null)} onConfirm={(transaction) => remove.mutate(transaction.id)} transaction={deleteTarget} />}
      <Snackbar autoHideDuration={4000} message={notice} onClose={() => setNotice(null)} open={Boolean(notice)} />
    </section>
  )
}

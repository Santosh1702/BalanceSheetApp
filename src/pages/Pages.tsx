import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { transactionService } from '../services/transactionService'
import { PaymentMode, Person, TransactionType } from '../types/transaction'
import type { Transaction } from '../types/transaction'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { UserRole } from '../types/auth'

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

function formatMode(mode: PaymentMode) {
  return mode.replace('_', ' ').toLowerCase()
}

function formatTransactionType(type: TransactionType) {
  return type === TransactionType.Deposit ? 'Deposit' : 'Payment'
}

function buildSummary(transactions: readonly Transaction[]) {
  const balances: Record<Person, number> = { Sagar: 0, Tejas: 0 }
  const averageDeposit: Record<Person, number> = { Sagar: 0, Tejas: 0 }
  const counts: Record<Person, number> = { Sagar: 0, Tejas: 0 }

  for (const transaction of transactions) {
    if (transaction.type === TransactionType.Deposit) {
      balances[transaction.person] += transaction.amount
      counts[transaction.person] += 1
      averageDeposit[transaction.person] += transaction.amount
    } else {
      balances[transaction.person] -= transaction.amount
    }
  }

  for (const person of Object.values(Person)) {
    averageDeposit[person] = counts[person] > 0 ? averageDeposit[person] / counts[person] : 0
  }

  return {
    totalBalance: balances.Sagar + balances.Tejas,
    balances,
    averageDeposit,
  }
}

export function PlaceholderPage({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <section className="page">
      <div>
        <Typography component="h1" variant="h1">{title}</Typography>
        <Typography className="description">{description}</Typography>
      </div>
      {children}
    </section>
  )
}

export function DashboardPage() {
  const { idToken, user } = useAuth()
  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionService.list(idToken!),
    enabled: Boolean(idToken),
  })

  const visiblePeople = useMemo(() => {
    if (user?.role === UserRole.Admin) return Object.values(Person)
    return user?.person ? [user.person] : []
  }, [user])

  const visibleTransactions = useMemo(() => {
    const source = query.data ?? []
    if (visiblePeople.length === 0) return source
    return source.filter((transaction) => visiblePeople.includes(transaction.person))
  }, [query.data, visiblePeople])

  const summary = useMemo(() => buildSummary(visibleTransactions), [visibleTransactions])
  const recentTransactions = useMemo(() => visibleTransactions.slice(0, 5), [visibleTransactions])
  const displayPeople = visiblePeople.length > 0 ? visiblePeople : Object.values(Person)

  return (
    <PlaceholderPage description="A modern mobile-first view of deposits and money given." title="Dashboard">
      {query.isError && <Alert severity="error">{query.error.message}</Alert>}

      <div style={{ display: 'grid', gap: 16 }}>
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary" variant="body2">
            {user?.role === UserRole.Admin ? 'Admin overview' : `${user?.person ?? 'Member'} ledger scope`}
          </Typography>
          <Typography component="p" variant="h6">{query.isLoading ? 'Loading summary…' : `Total visible balance ${currency.format(summary.totalBalance)}`}</Typography>
        </Paper>

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Paper sx={{ p: 2 }}>
            <Typography color="text.secondary" variant="body2">Total balance</Typography>
            <Typography component="p" variant="h2">{query.isLoading ? '...' : currency.format(summary.totalBalance)}</Typography>
          </Paper>
          {displayPeople.map((person) => (
            <Paper key={person} sx={{ p: 2 }}>
              <Typography color="text.secondary" variant="body2">{person} balance</Typography>
              <Typography component="p" variant="h2">{query.isLoading ? '...' : currency.format(summary.balances[person])}</Typography>
            </Paper>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {displayPeople.map((person) => (
            <Paper key={`${person}-avg`} sx={{ p: 2 }}>
              <Typography color="text.secondary" variant="body2">{person} average deposit</Typography>
              <Typography component="p" variant="h2">{query.isLoading ? '...' : currency.format(summary.averageDeposit[person])}</Typography>
            </Paper>
          ))}
        </div>

        <Paper sx={{ p: 2 }}>
          <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <Typography variant="h6">Recent transactions</Typography>
            <Button component={Link} to="/transactions" variant="contained">Add transaction</Button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {recentTransactions.length === 0 && <Typography color="text.secondary">No transactions yet.</Typography>}
            {recentTransactions.map((transaction) => (
              <Card key={transaction.id} variant="outlined">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontWeight: 700 }}>{transaction.person}</Typography>
                    <Chip
                      color={transaction.type === TransactionType.Deposit ? 'success' : 'error'}
                      label={transaction.type === TransactionType.Deposit ? 'Deposit' : 'Money given'}
                      size="small"
                    />
                  </div>
                  <Typography color="text.secondary" variant="body2">{transaction.date} · {formatMode(transaction.mode)}</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{currency.format(transaction.amount)}</Typography>
                </CardContent>
              </Card>
            ))}
          </div>
        </Paper>
      </div>
    </PlaceholderPage>
  )
}

export function CalendarPage() {
  const { idToken, user } = useAuth()
  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionService.list(idToken!),
    enabled: Boolean(idToken),
  })

  const allowedPeople = useMemo(() => {
    if (user?.role === UserRole.Admin) return Object.values(Person)
    return user?.person ? [user.person] : []
  }, [user])

  const [person, setPerson] = useState<Person>(user?.person ?? Person.Sagar)
  const [month, setMonth] = useState(() => dayjs().startOf('month'))
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'))

  const visibleTransactions = useMemo(() => {
    const data = query.data ?? []
    return data.filter((transaction: Transaction) => transaction.person === person)
  }, [person, query.data])

  const startOffset = month.startOf('month').day()
  const dayCells = Array.from({ length: 42 }, (_, index) => month.date(index - startOffset + 1))
  const selectedItems = visibleTransactions.filter((transaction: Transaction) => transaction.date === selectedDate)

  return (
    <PlaceholderPage description="Review transactions in a monthly calendar and inspect the details for a selected date." title="Calendar">
      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <TextField select label="Person" value={person} onChange={(event) => setPerson(event.target.value as Person)}>
            {allowedPeople.map((value) => (
              <MenuItem key={value} value={value}>{value}</MenuItem>
            ))}
          </TextField>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => setMonth((current) => current.subtract(1, 'month'))} variant="outlined">Prev</Button>
            <Button onClick={() => setMonth(dayjs().startOf('month'))} variant="text">Today</Button>
            <Button onClick={() => setMonth((current) => current.add(1, 'month'))} variant="outlined">Next</Button>
          </div>
        </div>

        <Typography variant="h6">{month.format('MMMM YYYY')}</Typography>

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <Paper sx={{ p: 2 }}>
            <div style={{ display: 'grid', gap: 4, gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                <Typography key={label} sx={{ textAlign: 'center', fontWeight: 700 }} variant="body2">{label}</Typography>
              ))}
            </div>
            <div style={{ display: 'grid', gap: 4, gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {dayCells.map((date) => {
                const isCurrentMonth = date.month() === month.month()
                const isoDate = date.format('YYYY-MM-DD')
                const dailyTransactions = visibleTransactions.filter((transaction: Transaction) => transaction.date === isoDate)
                const active = isoDate === selectedDate
                const dailyAmount = dailyTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
                return (
                  <Button
                    key={isoDate}
                    onClick={() => setSelectedDate(isoDate)}
                    sx={{
                      alignItems: 'flex-start',
                      border: active ? 1 : 0,
                      borderColor: 'primary.main',
                      minHeight: 72,
                      p: 1,
                      textAlign: 'left',
                      opacity: isCurrentMonth ? 1 : 0.5,
                    }}
                    variant="text"
                  >
                    <Typography variant="body2">{date.date()}</Typography>
                    {dailyTransactions.length > 0 && (
                      <Chip
                        color="success"
                        label={`${dailyTransactions.length} · ${currency.format(dailyAmount)}`}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </Button>
                )
              })}
            </div>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">{selectedDate}</Typography>
            {selectedItems.length === 0 && <Typography color="text.secondary">No transactions for this day.</Typography>}
            <div style={{ display: 'grid', gap: 8 }}>
              {selectedItems.map((transaction) => (
                <Card key={transaction.id} variant="outlined">
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography sx={{ fontWeight: 700 }}>{currency.format(transaction.amount)}</Typography>
                    <Typography variant="body2">{formatTransactionType(transaction.type)} · {formatMode(transaction.mode)}</Typography>
                    <Typography color="text.secondary" variant="body2">{transaction.note || 'No note'}</Typography>
                    <Typography color="text.secondary" variant="body2">Created by {transaction.createdBy}</Typography>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Paper>
        </div>
      </div>
    </PlaceholderPage>
  )
}

export function ReportsPage() {
  const { idToken } = useAuth()
  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionService.list(idToken!),
    enabled: Boolean(idToken),
  })

  const chartData = useMemo(() => {
    const data = query.data ?? []

    return Object.values(Person).map((person) => {
      const summary = data
        .filter((transaction: Transaction) => transaction.person === person)
        .reduce(
          (accumulator, transaction: Transaction) => {
            if (transaction.type === TransactionType.Deposit) {
              accumulator.deposits += transaction.amount
            } else {
              accumulator.moneyGiven += transaction.amount
            }
            return accumulator
          },
          { person, deposits: 0, moneyGiven: 0 },
        )

      return summary
    })
  }, [query.data])

  return (
    <PlaceholderPage description="See a quick comparison of deposits and money given by ledger participant." title="Reports">
      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {query.isLoading && <Typography>Loading reports…</Typography>}
      {query.isSuccess && chartData.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="person" />
              <YAxis />
              <Tooltip formatter={(value: unknown) => (typeof value === 'number' ? currency.format(value) : 'N/A')} />
              <Legend />
              <Bar dataKey="deposits" fill="#16a34a" name="Deposits" />
              <Bar dataKey="moneyGiven" fill="#dc2626" name="Payments" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </PlaceholderPage>
  )
}

export const SettingsPage = () => <PlaceholderPage description="Manage app preferences and connected services." title="Settings" />
export { TransactionsPage } from './transactions/TransactionsPage'

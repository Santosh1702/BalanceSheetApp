import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { transactionService } from '../services/transactionService'
import { TransactionType } from '../types/transaction'
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'
import { Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
export function PlaceholderPage({ title, description, children }: { title: string; description: string; children?: ReactNode }) { return <section className="page"><div><Typography component="h1" variant="h1">{title}</Typography><Typography className="description">{description}</Typography></div>{children ?? <Paper className="placeholder"><ConstructionOutlinedIcon color="primary" fontSize="large" /><Typography component="h2" variant="h2">Coming in a future milestone</Typography><Typography color="text.secondary">The page shell is ready. Data and interactions will be introduced in the planned feature milestone.</Typography></Paper>}</section> }
export function DashboardPage() {
  const { idToken } = useAuth()
  const query = useQuery({ queryKey: ['transactions'], queryFn: () => transactionService.list(idToken!), enabled: Boolean(idToken) })
  const summary = { available: 0, deposits: 0, withdrawals: 0 }
  if (query.data) {
    for (const transaction of query.data) {
      if (transaction.type === TransactionType.Deposit)
        summary.deposits += transaction.amount
      else
        summary.withdrawals += transaction.amount
    }
    summary.available = summary.deposits - summary.withdrawals
  }
  return (
    <PlaceholderPage description="A clear view of the family ledger at a glance." title="Dashboard">
      <div className="summaries">
        <Paper className="summary">
          <Typography color="text.secondary" variant="body2">Available balance</Typography>
          <Typography component="p" variant="h2">{query.isLoading ? '...' : currency.format(summary.available)}</Typography>
          <Typography color="text.secondary" variant="body2">{query.data?.length ? `${query.data.length} transactions` : 'Awaiting data'}</Typography>
        </Paper>
        <Paper className="summary">
          <Typography color="text.secondary" variant="body2">Total deposits</Typography>
          <Typography component="p" variant="h2">{query.isLoading ? '...' : currency.format(summary.deposits)}</Typography>
          <Typography color="text.secondary" variant="body2">{query.data?.length ? `${query.data.length} transactions` : 'Awaiting data'}</Typography>
        </Paper>
        <Paper className="summary">
          <Typography color="text.secondary" variant="body2">Total withdrawals</Typography>
          <Typography component="p" variant="h2">{query.isLoading ? '...' : currency.format(summary.withdrawals)}</Typography>
          <Typography color="text.secondary" variant="body2">{query.data?.length ? `${query.data.length} transactions` : 'Awaiting data'}</Typography>
        </Paper>
      </div>
      <Paper className="placeholder">
        <Typography component="h2" variant="h2">Your ledger overview will appear here</Typography>
        <Typography color="text.secondary">Connect the data source in Milestone 3 to see balances and statistics.</Typography>
      </Paper>
    </PlaceholderPage>
  )
}
export const CalendarPage = () => <PlaceholderPage description="Review daily deposits and expenses in a monthly calendar." title="Calendar" />
export function ReportsPage() {
  const { idToken } = useAuth()
  const query = useQuery({ queryKey: ['transactions'], queryFn: () => transactionService.list(idToken!), enabled: Boolean(idToken) })
  const data = query.data ?? []
  const aggregatedData = data.reduce((acc, transaction) => {
    if (!acc[transaction.person]) {
      acc[transaction.person] = { person: transaction.person, deposits: 0, withdrawals: 0 }
    }
    if (transaction.type === TransactionType.Deposit) {
      acc[transaction.person].deposits += transaction.amount
    } else {
      acc[transaction.person].withdrawals += transaction.amount
    }
    return acc
  }, {} as Record<string, { person: string; deposits: number; withdrawals: number }>)
  const chartData = Object.values(aggregatedData)
  return (
    <PlaceholderPage description="Filter and understand the family ledger over any date range." title="Reports">
      {query.isLoading && <Typography>Loading reports…</Typography>}
      {query.isError && <Typography color="error">Error loading reports: {query.error.message}</Typography>}
      {query.isSuccess && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="person" />
            <YAxis />
            <Tooltip formatter={(value: unknown) => (typeof value === 'number' ? currency.format(value) : 'N/A')} />
            <Legend />
            <Bar dataKey="deposits" fill="#16a34a" name="Deposits" />
            <Bar dataKey="withdrawals" fill="#dc2626" name="Withdrawals" />
          </BarChart>
        </ResponsiveContainer>
      )}
      {query.isSuccess && chartData.length === 0 && (
        <Paper className="placeholder">
          <Typography component="h2" variant="h2">No transaction data to report</Typography>
          <Typography color="text.secondary">Add some transactions to see your financial reports.</Typography>
        </Paper>
      )}
    </PlaceholderPage>
  )
}
export const SettingsPage = () => <PlaceholderPage description="Manage app preferences and connected services." title="Settings" />

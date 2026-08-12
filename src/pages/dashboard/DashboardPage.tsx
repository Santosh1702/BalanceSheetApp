import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Card, CardContent, Chip, Paper, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { transactionService } from '../../services/transactionService'
import { UserRole } from '../../types/auth'
import { Person, TransactionType } from '../../types/transaction'
import type { Transaction } from '../../types/transaction'
import { PlaceholderPage } from '../PlaceholderPage'
import { currency, formatMode } from '../pageUtils'

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

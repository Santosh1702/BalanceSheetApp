import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Paper, Typography } from '@mui/material'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import { transactionService } from '../../services/transactionService'
import { Person, TransactionType } from '../../types/transaction'
import type { Transaction } from '../../types/transaction'
import { PlaceholderPage } from '../PlaceholderPage'
import { currency } from '../pageUtils'

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

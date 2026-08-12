import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Card, CardContent, Chip, MenuItem, Paper, TextField, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { useAuth } from '../../hooks/useAuth'
import { transactionService } from '../../services/transactionService'
import { UserRole } from '../../types/auth'
import { Person } from '../../types/transaction'
import type { Transaction } from '../../types/transaction'
import { PlaceholderPage } from '../PlaceholderPage'
import { currency, formatMode, formatTransactionType } from '../pageUtils'

function normalizeBusinessDate(value: string | null | undefined) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : raw
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

  const groupedTransactions = useMemo(() => {
    return visibleTransactions.reduce<Record<string, Transaction[]>>((accumulator, transaction) => {
      const key = normalizeBusinessDate(transaction.date)
      if (!key) return accumulator
      if (!accumulator[key]) accumulator[key] = []
      accumulator[key].push(transaction)
      return accumulator
    }, {})
  }, [visibleTransactions])

  const startOffset = month.startOf('month').day()
  const dayCells = Array.from({ length: 42 }, (_, index) => month.date(index - startOffset + 1))
  const normalizedSelectedDate = normalizeBusinessDate(selectedDate)
  const selectedItems = groupedTransactions[normalizedSelectedDate] ?? []

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
                const dailyTransactions = groupedTransactions[isoDate] ?? []
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
                        label={currency.format(dailyAmount)}
                        size="small"
                        sx={{ mt: 0.5, maxWidth: '100%' }}
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

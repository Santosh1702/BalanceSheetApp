import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Card, CardContent, Paper, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { CalendarGrid } from '../../components/calendar/CalendarGrid'
import { MonthNavigator } from '../../components/calendar/MonthNavigator'
import { SelectedMonthSummary } from '../../components/calendar/SelectedMonthSummary'
import { MemberTabs } from '../../components/dashboard/MemberTabs'
import { getBusinessMonth, getLocalTodayBusinessDate } from '../../domain/businessDate'
import type { BusinessDate, BusinessMonth } from '../../domain/businessDate'
import { aggregateTransactionsByDate, calculateSelectedMonthSummary } from '../../domain/transactionCalculations'
import { useAuth } from '../../hooks/useAuth'
import { transactionService } from '../../services/transactionService'
import { UserRole } from '../../types/auth'
import { Person, TransactionType } from '../../types/transaction'
import type { Transaction } from '../../types/transaction'
import { PlaceholderPage } from '../PlaceholderPage'
import { currency, formatMode, formatTransactionType } from '../pageUtils'
import './CalendarPage.css'

function moveMonth(month: BusinessMonth, amount: number) {
  return dayjs(`${month}-01`).add(amount, 'month').format('YYYY-MM') as BusinessMonth
}

export function CalendarPage() {
  const { idToken, user } = useAuth()
  const today = getLocalTodayBusinessDate()
  const currentMonth = getBusinessMonth(today)
  const [person, setPerson] = useState<Person>(user?.person ?? Person.Sagar)
  const [month, setMonth] = useState<BusinessMonth>(currentMonth)
  const [selectedDate, setSelectedDate] = useState<BusinessDate | null>(null)
  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionService.list(idToken!),
    enabled: Boolean(idToken),
  })

  const allowedPeople = useMemo(() => {
    if (user?.role === UserRole.Admin) return Object.values(Person)
    return user?.person ? [user.person] : []
  }, [user])
  const visibleTransactions = useMemo(() => (
    (query.data ?? []).filter((transaction: Transaction) => transaction.person === person)
  ), [person, query.data])
  const dailyAggregates = useMemo(() => aggregateTransactionsByDate(visibleTransactions), [visibleTransactions])
  const monthSummary = useMemo(
    () => calculateSelectedMonthSummary(visibleTransactions, person, month),
    [month, person, visibleTransactions],
  )
  const displayedTransactions = useMemo(() => {
    if (selectedDate) return dailyAggregates[selectedDate]?.transactions ?? []
    return visibleTransactions.filter((transaction) => getBusinessMonth(transaction.date) === month)
  }, [dailyAggregates, month, selectedDate, visibleTransactions])
  const hasCachedData = query.data !== undefined

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

  return (
    <PlaceholderPage description="Review transactions in a monthly calendar and inspect the details for a selected date." title="Calendar">
      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      <div className="calendar-page">
        <MemberTabs
          ariaLabel="Calendar member"
          onChange={(nextPerson) => {
            setPerson(nextPerson)
            setSelectedDate(null)
          }}
          people={allowedPeople}
          selected={person}
        />

        {query.isLoading ? <Typography>Loading calendar…</Typography> : (!query.isError || hasCachedData) && (
          <>
            <SelectedMonthSummary totals={monthSummary} />

            <div className="calendar-page__content">
              <Paper className="calendar-page__calendar">
                <MonthNavigator
                  month={month}
                  onNext={() => navigateMonth(1)}
                  onPrevious={() => navigateMonth(-1)}
                  onReturnToCurrent={returnToCurrentMonth}
                />
                <CalendarGrid aggregates={dailyAggregates} month={month} onSelectDate={selectDate} selectedDate={selectedDate} today={today} />
              </Paper>

              <Paper className="calendar-page__transactions">
                <div className="calendar-page__transactions-heading">
                  <Typography component="h2" variant="h6">
                    {selectedDate ? `Transactions on ${selectedDate}` : `Transactions in ${dayjs(`${month}-01`).format('MMMM YYYY')}`}
                  </Typography>
                  {selectedDate && <Button onClick={() => setSelectedDate(null)}>Show full month</Button>}
                </div>
                {displayedTransactions.length === 0 && (
                  <Typography color="text.secondary">{selectedDate ? 'No transactions for this day.' : 'No transactions for this month.'}</Typography>
                )}
                <div className="calendar-page__transaction-list">
                  {displayedTransactions.map((transaction) => {
                    const isDeposit = transaction.type === TransactionType.Deposit
                    return (
                      <Card key={transaction.id} variant="outlined">
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Typography className={`calendar-transaction__amount ${isDeposit ? 'calendar-transaction__amount--deposit' : 'calendar-transaction__amount--withdrawal'}`}>
                            {isDeposit ? '+' : '−'} {currency.format(transaction.amount)}
                          </Typography>
                          <Typography variant="body2">{formatTransactionType(transaction.type)} · {formatMode(transaction.mode)} · {transaction.date}</Typography>
                          <Typography color="text.secondary" variant="body2">{transaction.note || 'No note'}</Typography>
                          <Typography color="text.secondary" variant="body2">Created by {transaction.createdBy}</Typography>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </Paper>
            </div>
          </>
        )}
      </div>
    </PlaceholderPage>
  )
}

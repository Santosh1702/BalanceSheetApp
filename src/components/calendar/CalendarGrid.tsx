import dayjs from 'dayjs'
import type { BusinessDate, BusinessMonth } from '../../domain/businessDate'
import type { DailyTransactionAggregate } from '../../domain/transactionCalculations'
import './calendar.css'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const compactCurrency = new Intl.NumberFormat('en-IN', { currency: 'INR', maximumFractionDigits: 1, notation: 'compact', style: 'currency' })
const fullCurrency = new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' })

export interface CalendarGridProps {
  aggregates: Readonly<Record<string, DailyTransactionAggregate>>
  month: BusinessMonth
  onSelectDate: (date: BusinessDate) => void
  selectedDate: BusinessDate | null
  today: BusinessDate
}

export function CalendarGrid({ aggregates, month, onSelectDate, selectedDate, today }: CalendarGridProps) {
  const firstDay = dayjs(`${month}-01`)
  const cellCount = Math.ceil((firstDay.day() + firstDay.daysInMonth()) / 7) * 7
  const firstCell = firstDay.subtract(firstDay.day(), 'day')
  const dates = Array.from({ length: cellCount }, (_, index) => firstCell.add(index, 'day'))

  return (
    <div className="calendar-grid" role="grid">
      {weekdays.map((weekday) => <div className="calendar-grid__weekday" key={weekday} role="columnheader">{weekday}</div>)}
      {dates.map((date) => {
        const businessDate = date.format('YYYY-MM-DD') as BusinessDate
        const aggregate = aggregates[businessDate]
        const isAdjacentMonth = date.format('YYYY-MM') !== month
        const isSelected = businessDate === selectedDate
        const isToday = businessDate === today
        const accessibleDate = date.format('dddd, MMMM D, YYYY')
        const activityLabel = [
          aggregate?.deposited ? `deposited ${fullCurrency.format(aggregate.deposited)}` : '',
          aggregate?.withdrawn ? `withdrawn ${fullCurrency.format(aggregate.withdrawn)}` : '',
        ].filter(Boolean).join(', ')
        return (
          <button
            aria-label={`${accessibleDate}${isToday ? ', today' : ''}${isAdjacentMonth ? ', outside viewed month' : ''}${activityLabel ? `, ${activityLabel}` : ''}`}
            aria-pressed={isSelected}
            className={`calendar-day${isAdjacentMonth ? ' calendar-day--adjacent' : ''}${isSelected ? ' calendar-day--selected' : ''}${isToday ? ' calendar-day--today' : ''}`}
            key={businessDate}
            onClick={() => onSelectDate(businessDate)}
            type="button"
          >
            <span className="calendar-day__header"><span>{date.date()}</span>{isToday && <span className="calendar-day__today-label">Today</span>}</span>
            <span className="calendar-day__amounts">
              {aggregate?.deposited > 0 && (
                <span aria-hidden="true" className="calendar-day__amount calendar-day__amount--deposit" title={`Deposited ${fullCurrency.format(aggregate.deposited)}`}>
                  + {compactCurrency.format(aggregate.deposited)}
                </span>
              )}
              {aggregate?.withdrawn > 0 && (
                <span aria-hidden="true" className="calendar-day__amount calendar-day__amount--withdrawal" title={`Withdrawn ${fullCurrency.format(aggregate.withdrawn)}`}>
                  − {compactCurrency.format(aggregate.withdrawn)}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

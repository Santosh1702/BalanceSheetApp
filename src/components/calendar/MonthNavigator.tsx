import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import { IconButton, Typography } from '@mui/material'
import dayjs from 'dayjs'
import type { BusinessMonth } from '../../domain/businessDate'
import './calendar.css'

export interface MonthNavigatorProps {
  month: BusinessMonth
  onNext: () => void
  onPrevious: () => void
  onReturnToCurrent: () => void
}

export function MonthNavigator({ month, onNext, onPrevious, onReturnToCurrent }: MonthNavigatorProps) {
  const monthLabel = dayjs(`${month}-01`).format('MMMM YYYY')
  return (
    <div className="month-navigator">
      <IconButton aria-label={`Previous month, before ${monthLabel}`} onClick={onPrevious}><ChevronLeftIcon /></IconButton>
      <Typography component="h2" variant="h6">{monthLabel}</Typography>
      <IconButton aria-label="Return to current month" onClick={onReturnToCurrent}><TodayIcon /></IconButton>
      <IconButton aria-label={`Next month, after ${monthLabel}`} onClick={onNext}><ChevronRightIcon /></IconButton>
    </div>
  )
}

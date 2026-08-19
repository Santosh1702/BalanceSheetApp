import { Typography } from '@mui/material'
import type { TransactionTotals } from '../../domain/transactionCalculations'
import { currency } from '../../pages/pageUtils'
import './calendar.css'

export interface SelectedMonthSummaryProps { totals: TransactionTotals }

export function SelectedMonthSummary({ totals }: SelectedMonthSummaryProps) {
  const netClass = totals.net > 0 ? 'month-summary__value--positive' : totals.net < 0 ? 'month-summary__value--negative' : ''
  return (
    <div aria-label="Viewed month summary" className="month-summary">
      <div><Typography color="text.secondary" variant="body2">Deposited</Typography><Typography className="month-summary__value--positive" component="p" variant="h6">{currency.format(totals.deposited)}</Typography></div>
      <div><Typography color="text.secondary" variant="body2">Withdrawn</Typography><Typography className="month-summary__value--negative" component="p" variant="h6">{currency.format(totals.withdrawn)}</Typography></div>
      <div><Typography color="text.secondary" variant="body2">Net</Typography><Typography className={netClass} component="p" variant="h6">{currency.format(totals.net)}</Typography></div>
    </div>
  )
}

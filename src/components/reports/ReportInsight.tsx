import { Typography } from '@mui/material'
import type { HighestDepositMonth } from '../../domain/reportCalculations'
import { currency, formatBusinessMonth } from '../../pages/pageUtils'

export function ReportInsight({ highestMonth }: { highestMonth: HighestDepositMonth | null }) {
  return (
    <aside aria-labelledby="report-insight-title" className="report-card report-insight">
      <Typography color="text.secondary" component="h2" id="report-insight-title" variant="body2">Highest deposit month</Typography>
      {highestMonth ? (
        <>
          <Typography className="report-insight__month" component="p">{formatBusinessMonth(highestMonth.month)}</Typography>
          <Typography className="report-value--positive" component="p" variant="h6">{currency.format(highestMonth.deposited)}</Typography>
        </>
      ) : (
        <Typography color="text.secondary">No deposits in this period.</Typography>
      )}
    </aside>
  )
}

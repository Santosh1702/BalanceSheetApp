import { Typography } from '@mui/material'
import type { ReportMonthComparison } from '../../domain/reportCalculations'
import { currency, formatBusinessMonth } from '../../pages/pageUtils'

export function MonthComparison({ comparisons }: { comparisons: readonly ReportMonthComparison[] }) {
  const hasActivity = comparisons.some((comparison) => comparison.deposited > 0 || comparison.withdrawn > 0)

  return (
    <section aria-labelledby="month-comparison-title" className="report-card report-section">
      <div>
        <Typography component="h2" id="month-comparison-title" variant="h6">Month by month</Typography>
        <Typography color="text.secondary" variant="body2">Exact movement across the selected period.</Typography>
      </div>
      {!hasActivity ? (
        <Typography color="text.secondary">No monthly activity in this period.</Typography>
      ) : (
        <div className="month-comparison-list">
          {comparisons.map((comparison) => {
            const netTone = comparison.net > 0 ? 'report-value--positive' : comparison.net < 0 ? 'report-value--negative' : ''
            return (
              <article className="month-comparison-row" key={comparison.month}>
                <div className="month-comparison-row__heading">
                  <Typography component="h3">{formatBusinessMonth(comparison.month)}</Typography>
                  {comparison.isPartial && <Typography color="text.secondary" variant="caption">Partial period</Typography>}
                </div>
                <dl className="month-comparison-values">
                  <div><dt>Deposited</dt><dd className="report-value--positive">{currency.format(comparison.deposited)}</dd></div>
                  <div><dt>Withdrawn</dt><dd className="report-value--negative">{currency.format(comparison.withdrawn)}</dd></div>
                  <div><dt>Net</dt><dd className={netTone}>{currency.format(comparison.net)}</dd></div>
                </dl>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

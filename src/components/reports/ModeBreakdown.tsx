import { LinearProgress, Typography } from '@mui/material'
import type { PaymentModeBreakdown as PaymentModeBreakdownResult } from '../../domain/reportCalculations'
import { currency, formatMode } from '../../pages/pageUtils'

function modeLabel(mode: PaymentModeBreakdownResult['mode']) {
  const label = formatMode(mode)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function ModeBreakdown({ modes }: { modes: readonly PaymentModeBreakdownResult[] }) {
  return (
    <section aria-labelledby="mode-breakdown-title" className="report-card report-section">
      <div>
        <Typography component="h2" id="mode-breakdown-title" variant="h6">Payment modes</Typography>
        <Typography color="text.secondary" variant="body2">Share of transaction value by mode.</Typography>
      </div>
      <div className="mode-breakdown-list">
        {modes.map((mode) => {
          const label = modeLabel(mode.mode)
          return (
            <div className="mode-breakdown-row" key={mode.mode}>
              <div className="mode-breakdown-row__heading">
                <Typography component="h3">{label}</Typography>
                <Typography>{currency.format(mode.amount)}</Typography>
              </div>
              <LinearProgress
                aria-label={`${label}, ${mode.percentage.toFixed(1)} percent of transaction value`}
                className="mode-breakdown-progress"
                value={mode.percentage}
                variant="determinate"
              />
              <Typography color="text.secondary" variant="caption">
                {mode.percentage.toFixed(1)}% · {mode.transactionCount} {mode.transactionCount === 1 ? 'transaction' : 'transactions'}
              </Typography>
            </div>
          )
        })}
      </div>
    </section>
  )
}

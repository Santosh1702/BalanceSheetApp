import { Typography } from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ReportTrendBucket } from '../../domain/reportCalculations'
import { currency } from '../../pages/pageUtils'

const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const compactCurrency = new Intl.NumberFormat('en-IN', {
  currency: 'INR',
  maximumFractionDigits: 1,
  notation: 'compact',
  style: 'currency',
})

export interface TrendChartProps {
  buckets: readonly ReportTrendBucket[]
  deposited: number
  granularity: 'daily' | 'monthly'
  withdrawn: number
}

function dailyLabel(key: string) {
  const [, month, day] = key.split('-')
  return `${shortMonthNames[Number(month) - 1]} ${Number(day)}`
}

function monthlyLabel(key: string, includeYear: boolean) {
  const [year, month] = key.split('-')
  const label = shortMonthNames[Number(month) - 1]
  return includeYear ? `${label} ${year}` : label
}

export function TrendChart({ buckets, deposited, granularity, withdrawn }: TrendChartProps) {
  const hasActivity = buckets.some((bucket) => bucket.deposited > 0 || bucket.withdrawn > 0)
  const spansYears = granularity === 'monthly' && new Set(buckets.map((bucket) => bucket.key.slice(0, 4))).size > 1
  const data = buckets.map((bucket) => ({
    ...bucket,
    label: granularity === 'daily' ? dailyLabel(bucket.key) : monthlyLabel(bucket.key, spansYears),
  }))
  const summary = `${currency.format(deposited)} deposited and ${currency.format(withdrawn)} withdrawn across this period.`

  return (
    <section aria-labelledby="trend-chart-title" className="report-card report-section report-trend">
      <div>
        <Typography component="h2" id="trend-chart-title" variant="h6">Deposit &amp; withdrawal trend</Typography>
        <Typography color="text.secondary" variant="body2">Grouped totals by {granularity === 'daily' ? 'day' : 'month'}.</Typography>
      </div>
      <Typography className="report-trend__summary" variant="body2">{summary}</Typography>
      {!hasActivity ? (
        <div className="report-trend__empty">
          <Typography color="text.secondary">No deposit or withdrawal activity in this period.</Typography>
        </div>
      ) : (
        <div aria-label={`Grouped bar chart. ${summary}`} className="report-trend__chart" role="img">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 4 }}>
              <CartesianGrid stroke="currentColor" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={24} tickMargin={8} />
              <YAxis domain={[0, 'auto']} tickFormatter={(value: number) => compactCurrency.format(value)} width={64} />
              <Tooltip
                cursor={{ fill: 'rgb(100 116 139 / 8%)' }}
                formatter={(value: unknown, name: unknown) => [
                  typeof value === 'number' ? currency.format(value) : '—',
                  String(name),
                ]}
                labelFormatter={(label: unknown) => String(label)}
              />
              <Legend />
              <Bar dataKey="deposited" fill="#087a4b" name="Deposited" radius={[4, 4, 0, 0]} />
              <Bar dataKey="withdrawn" fill="#c94b5c" name="Withdrawn" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

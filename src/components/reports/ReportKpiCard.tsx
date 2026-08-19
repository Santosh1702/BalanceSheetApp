import { Typography } from '@mui/material'

export interface ReportKpiCardProps {
  label: string
  supportingText: string
  tone?: 'positive' | 'negative' | 'brand' | 'neutral'
  value: string
}

export function ReportKpiCard({ label, supportingText, tone = 'neutral', value }: ReportKpiCardProps) {
  return (
    <article className={`report-kpi report-card report-kpi--${tone}`}>
      <Typography className="report-kpi__label" component="h2">{label}</Typography>
      <Typography className="report-kpi__value" component="p">{value}</Typography>
      <Typography color="text.secondary" variant="body2">{supportingText}</Typography>
    </article>
  )
}

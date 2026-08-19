import { Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function KpiCard({ label, value, subtitle, tone = 'default' }: { label: string; value: ReactNode; subtitle: string; tone?: 'default' | 'negative' }) {
  return (
    <article className={`dashboard-kpi glass-card${tone === 'negative' ? ' dashboard-kpi--negative' : ''}`}>
      <Typography className="dashboard-kpi__label" component="h2">{label}</Typography>
      <Typography className="dashboard-kpi__value" component="p">{value}</Typography>
      <Typography color="text.secondary" variant="body2">{subtitle}</Typography>
    </article>
  )
}


import { Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function PlaceholderPage({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <section className="page">
      <div>
        <Typography component="h1" variant="h1">{title}</Typography>
        <Typography className="description">{description}</Typography>
      </div>
      {children}
    </section>
  )
}

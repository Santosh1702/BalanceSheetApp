import { FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material'
import { ReportPeriodPreset } from '../../domain/reportCalculations'
import type { ReportPeriodPreset as ReportPeriodPresetValue } from '../../domain/reportCalculations'

const options: readonly { value: ReportPeriodPresetValue; label: string }[] = [
  { value: ReportPeriodPreset.ThisMonth, label: 'This month' },
  { value: ReportPeriodPreset.LastMonth, label: 'Last month' },
  { value: ReportPeriodPreset.Last3Months, label: 'Last 3 months' },
  { value: ReportPeriodPreset.Last6Months, label: 'Last 6 months' },
  { value: ReportPeriodPreset.ThisYear, label: 'This year' },
  { value: ReportPeriodPreset.AllTime, label: 'All time' },
]

export interface PeriodSelectorProps {
  caption: string
  onChange: (preset: ReportPeriodPresetValue) => void
  throughToday: boolean
  value: ReportPeriodPresetValue
}

export function PeriodSelector({ caption, onChange, throughToday, value }: PeriodSelectorProps) {
  return (
    <div className="report-period-control">
      <FormControl className="report-period-select" size="small">
        <InputLabel id="report-period-label">Report period</InputLabel>
        <Select
          label="Report period"
          labelId="report-period-label"
          onChange={(event) => onChange(event.target.value as ReportPeriodPresetValue)}
          value={value}
        >
          {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </Select>
      </FormControl>
      <div>
        <Typography className="report-period-caption" variant="body2">{caption}</Typography>
        {throughToday && <Typography color="text.secondary" variant="caption">Through today</Typography>}
      </div>
    </div>
  )
}

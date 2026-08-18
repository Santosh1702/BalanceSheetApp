export type BusinessDate = `${number}-${number}-${number}`
export type BusinessMonth = `${number}-${number}`

export function getLocalTodayBusinessDate(date = new Date()): BusinessDate {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` as BusinessDate
}

export function getBusinessMonth(date: string): BusinessMonth {
  return date.slice(0, 7) as BusinessMonth
}

export function getCalendarDay(date: string) {
  return Number(date.slice(8, 10))
}


import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Typography } from '@mui/material'
import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { AppLayout } from '../layout/AppLayout'
import { LoginPage } from '../pages/login/LoginPage'
import { UserRole } from '../types/auth'

const CalendarPage = lazy(() => import('../pages/calendar/CalendarPage').then((module) => ({ default: module.CalendarPage })))
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const TransactionsPage = lazy(() => import('../pages/transactions/TransactionsPage').then((module) => ({ default: module.TransactionsPage })))

const routeFallback = <Typography aria-live="polite" role="status">Loading page…</Typography>

function LazyRoute({ children }: { readonly children: ReactNode }) {
  return <Suspense fallback={routeFallback}>{children}</Suspense>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<LazyRoute><DashboardPage /></LazyRoute>} />
          <Route path="transactions" element={<LazyRoute><TransactionsPage /></LazyRoute>} />
          <Route path="calendar" element={<LazyRoute><CalendarPage /></LazyRoute>} />
          <Route path="reports" element={<LazyRoute><ReportsPage /></LazyRoute>} />
          <Route element={<ProtectedRoute roles={[UserRole.Admin]} />}>
            <Route path="settings" element={<LazyRoute><SettingsPage /></LazyRoute>} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<LoginPage />} />
    </Routes>
  )
}

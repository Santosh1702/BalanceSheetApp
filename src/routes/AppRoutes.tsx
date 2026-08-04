import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { AppLayout } from '../layout/AppLayout'
import { LoginPage } from '../pages/login/LoginPage'
import { CalendarPage, DashboardPage, ReportsPage, SettingsPage, TransactionsPage } from '../pages/Pages'
import { UserRole } from '../types/auth'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route element={<ProtectedRoute roles={[UserRole.Admin]} />}>
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<LoginPage />} />
    </Routes>
  )
}

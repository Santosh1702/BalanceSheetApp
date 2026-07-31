import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '../layout/AppLayout'
import { CalendarPage, DashboardPage, ReportsPage, SettingsPage, TransactionsPage } from '../pages/Pages'
export function AppRoutes() { return <Routes><Route element={<AppLayout />}><Route index element={<DashboardPage />} /><Route path="transactions" element={<TransactionsPage />} /><Route path="calendar" element={<CalendarPage />} /><Route path="reports" element={<ReportsPage />} /><Route path="settings" element={<SettingsPage />} /></Route><Route path="*" element={<DashboardPage />} /></Routes> }

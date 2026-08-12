import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types/auth'
export function ProtectedRoute({ roles }: { readonly roles?: readonly UserRole[] }) { const { user, isInitializing } = useAuth(); const location = useLocation(); if (isInitializing) return null; if (!user) return <Navigate replace state={{ from: location }} to="/login" />; return roles && !roles.includes(user.role) ? <Navigate replace to="/" /> : <Outlet /> }

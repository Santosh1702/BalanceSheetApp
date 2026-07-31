import { UserRole } from '../types/auth'
const clean = (value: string | undefined) => value?.trim().toLowerCase() ?? ''
const allowed = [{ email: clean(import.meta.env.VITE_ADMIN_EMAIL), role: UserRole.Admin }, { email: clean(import.meta.env.VITE_SAGAR_EMAIL), role: UserRole.Member }, { email: clean(import.meta.env.VITE_TEJAS_EMAIL), role: UserRole.Member }]
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
export const getRoleForEmail = (email: string) => allowed.find((user) => user.email === email.toLowerCase())?.role
export const isAuthConfigured = () => Boolean(GOOGLE_CLIENT_ID) && allowed.every((user) => Boolean(user.email))

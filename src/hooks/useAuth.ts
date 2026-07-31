import { useContext } from 'react'
import { AuthContext } from '../auth/AuthContext'
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('Auth provider is missing.'); return context }

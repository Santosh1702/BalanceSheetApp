import { createContext } from 'react'
import type { AuthUser } from '../types/auth'

export const AuthContext = createContext<{
  user: AuthUser | null
  isAuthenticated: boolean
  isInitializing: boolean
  idToken: string | null
  sessionExpired: boolean
  signInWithCredential: (credential: string) => Promise<void>
  signOut: () => void
} | undefined>(undefined)

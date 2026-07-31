import { createContext } from 'react'
import type { AuthUser } from '../types/auth'
export const AuthContext = createContext<{ user: AuthUser | null; isAuthenticated: boolean; signInWithCredential: (credential: string) => void; signOut: () => void } | undefined>(undefined)

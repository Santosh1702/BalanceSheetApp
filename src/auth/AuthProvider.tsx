import { useCallback, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { authConfig } from '../config/auth'
import { AuthContext } from './AuthContext'
import type { AuthUser } from '../types/auth'

const KEY = 'balancesheetapp-auth'

function currentSession() {
  try {
    const stored = sessionStorage.getItem(KEY)
    return stored ? (JSON.parse(stored) as { user: AuthUser; idToken: string }) : null
  } catch {
    return null
  }
}

function payload(credential: string): { email?: string; name?: string; picture?: string } {
  try {
    const encoded = credential.split('.')[1]
    return encoded ? JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string; name?: string; picture?: string } : {}
  } catch {
    return {}
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const initialSession = currentSession()
  const [user, setUser] = useState<AuthUser | null>(initialSession?.user ?? null)
  const [idToken, setIdToken] = useState<string | null>(initialSession?.idToken ?? null)

  const signInWithCredential = useCallback((credential: string) => {
    const data = payload(credential)
    const email = data.email?.toLowerCase()
    const profile = email ? authConfig.getProfileForEmail(email) : undefined

    if (!email || !profile || !profile.role) {
      throw new Error('This Google account is not authorized to use BalanceSheetApp.')
    }

    const next: AuthUser = {
      email,
      name: data.name?.trim() || email,
      picture: data.picture,
      role: profile.role,
      person: profile.person,
    }

    sessionStorage.setItem(KEY, JSON.stringify({ user: next, idToken: credential }))
    setUser(next)
    setIdToken(credential)
  }, [])

  const signOut = useCallback(() => {
    sessionStorage.removeItem(KEY)
    setUser(null)
    setIdToken(null)
  }, [])

  const value = useMemo(() => ({ user, idToken, isAuthenticated: Boolean(user), signInWithCredential, signOut }), [user, idToken, signInWithCredential, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

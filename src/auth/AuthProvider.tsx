import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { authConfig } from '../config/auth'
import { AuthContext } from './AuthContext'
import { getTokenExpiryMs, isTokenExpired, decodeGoogleIdToken } from './token'
import type { AuthUser } from '../types/auth'

const KEY = 'balancesheetapp-auth'

function currentSession() {
  try {
    const stored = sessionStorage.getItem(KEY)
    if (!stored) return null
    const session = JSON.parse(stored) as { user: AuthUser; idToken: string }
    return isTokenExpired(session.idToken) ? null : session
  } catch {
    return null
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const initialSession = currentSession()
  const [user, setUser] = useState<AuthUser | null>(initialSession?.user ?? null)
  const [idToken, setIdToken] = useState<string | null>(initialSession?.idToken ?? null)
  const [sessionExpired, setSessionExpired] = useState(() => {
    try {
      const stored = sessionStorage.getItem(KEY)
      if (!stored) return false
      const session = JSON.parse(stored) as { idToken?: string }
      return Boolean(session.idToken && isTokenExpired(session.idToken))
    } catch {
      return false
    }
  })

  const signOut = useCallback(() => {
    sessionStorage.removeItem(KEY)
    setUser(null)
    setIdToken(null)
  }, [])

  useEffect(() => {
    if (!idToken) return

    const expiryMs = getTokenExpiryMs(idToken)
    if (expiryMs === null) return

    const delay = Math.max(0, expiryMs - Date.now())
    const timer = window.setTimeout(() => {
      sessionStorage.removeItem(KEY)
      setUser(null)
      setIdToken(null)
      setSessionExpired(true)
    }, delay)

    return () => window.clearTimeout(timer)
  }, [idToken])

  const signInWithCredential = useCallback((credential: string) => {
    const data = decodeGoogleIdToken(credential)
    const email = data.email?.toLowerCase()
    const profile = email ? authConfig.getProfileForEmail(email) : undefined

    if (!email || !profile || !profile.role) {
      throw new Error('This Google account is not authorized to use BalanceSheetApp.')
    }

    if (isTokenExpired(credential)) {
      throw new Error('Google sign-in returned an expired credential. Please try signing in again.')
    }

    const next: AuthUser = {
      email,
      name: data.name?.trim() || email,
      picture: data.picture,
      role: profile.role,
      person: profile.person,
    }

    sessionStorage.setItem(KEY, JSON.stringify({ user: next, idToken: credential }))
    setSessionExpired(false)
    setUser(next)
    setIdToken(credential)
  }, [])

  const value = useMemo(() => ({ user, idToken, isAuthenticated: Boolean(user), sessionExpired, signInWithCredential, signOut }), [user, idToken, sessionExpired, signInWithCredential, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

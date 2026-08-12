import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { authService } from '../services/authService'
import { AuthContext } from './AuthContext'
import { decodeGoogleIdToken, getTokenExpiryMs, isTokenExpired } from './token'
import type { AuthUser } from '../types/auth'
import type { AuthProfile } from '../services/authService'

const KEY = 'balancesheetapp-auth'

interface StoredSession {
  readonly user: AuthUser
  readonly idToken: string
}

function initialSession(): { session: StoredSession | null; expired: boolean } {
  try {
    const stored = sessionStorage.getItem(KEY)
    if (!stored) return { session: null, expired: false }
    const session = JSON.parse(stored) as StoredSession
    if (!session.idToken || isTokenExpired(session.idToken)) {
      sessionStorage.removeItem(KEY)
      return { session: null, expired: Boolean(session.idToken) }
    }
    return { session, expired: false }
  } catch {
    sessionStorage.removeItem(KEY)
    return { session: null, expired: false }
  }
}

function authenticatedUser(profile: AuthProfile, credential: string): AuthUser {
  const tokenClaims = decodeGoogleIdToken(credential)
  return {
    email: profile.email,
    name: profile.name,
    picture: tokenClaims.picture,
    role: profile.role,
    person: profile.person || undefined,
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [restoredSession] = useState(initialSession)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [idToken, setIdToken] = useState<string | null>(restoredSession.session?.idToken ?? null)
  const [sessionExpired, setSessionExpired] = useState(restoredSession.expired)
  const [isInitializing, setIsInitializing] = useState(Boolean(restoredSession.session))

  const signOut = useCallback(() => {
    sessionStorage.removeItem(KEY)
    setUser(null)
    setIdToken(null)
  }, [])

  useEffect(() => {
    const credential = restoredSession.session?.idToken
    if (!credential) return

    let active = true
    authService.me(credential)
      .then((profile) => {
        if (!active) return
        const next = authenticatedUser(profile, credential)
        sessionStorage.setItem(KEY, JSON.stringify({ user: next, idToken: credential }))
        setUser(next)
      })
      .catch(() => {
        if (!active) return
        sessionStorage.removeItem(KEY)
        setUser(null)
        setIdToken(null)
      })
      .finally(() => {
        if (active) setIsInitializing(false)
      })

    return () => { active = false }
  }, [restoredSession])

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

  const signInWithCredential = useCallback(async (credential: string) => {
    if (isTokenExpired(credential)) {
      throw new Error('Google sign-in returned an expired credential. Please try signing in again.')
    }

    const profile = await authService.me(credential)
    const next = authenticatedUser(profile, credential)

    sessionStorage.setItem(KEY, JSON.stringify({ user: next, idToken: credential }))
    setSessionExpired(false)
    setUser(next)
    setIdToken(credential)
  }, [])

  const value = useMemo(() => ({
    user,
    idToken,
    isAuthenticated: Boolean(user),
    isInitializing,
    sessionExpired,
    signInWithCredential,
    signOut,
  }), [user, idToken, isInitializing, sessionExpired, signInWithCredential, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

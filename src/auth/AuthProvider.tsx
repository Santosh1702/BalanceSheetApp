import { useCallback, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { authConfig } from '../config/auth'
import { AuthContext } from './AuthContext'
import type { AuthUser } from '../types/auth'
const KEY = 'pocket-ledger-user'
function currentUser() { try { const stored = sessionStorage.getItem(KEY); return stored ? JSON.parse(stored) as AuthUser : null } catch { return null } }
function payload(credential: string): { email?: string; name?: string; picture?: string } { try { const encoded = credential.split('.')[1]; return encoded ? JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string; name?: string; picture?: string } : {} } catch { return {} } }
export function AuthProvider({ children }: PropsWithChildren) { const [user, setUser] = useState<AuthUser | null>(currentUser); const signInWithCredential = useCallback((credential: string) => { const data = payload(credential); const email = data.email?.toLowerCase(); const role = email ? authConfig.getRoleForEmail(email) : undefined; if (!email || !role) throw new Error('This Google account is not authorized to use Pocket Ledger.'); const next = { email, name: data.name?.trim() || email, picture: data.picture, role }; sessionStorage.setItem(KEY, JSON.stringify(next)); setUser(next) }, []); const signOut = useCallback(() => { sessionStorage.removeItem(KEY); setUser(null) }, []); const value = useMemo(() => ({ user, isAuthenticated: Boolean(user), signInWithCredential, signOut }), [user, signInWithCredential, signOut]); return <AuthContext.Provider value={value}>{children}</AuthContext.Provider> }

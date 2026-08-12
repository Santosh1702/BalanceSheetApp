import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import { Alert, Paper, Typography } from '@mui/material'
import { GoogleLogin } from '@react-oauth/google'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { authConfig } from '../../config/auth'
import { useAuth } from '../../hooks/useAuth'
import './LoginPage.css'

export function LoginPage() {
  const { isAuthenticated, isInitializing, sessionExpired, signInWithCredential } = useAuth()
  const [error, setError] = useState<string>()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  if (isInitializing) return null
  if (isAuthenticated) return <Navigate replace to="/" />

  const login = async ({ credential }: { credential?: string }) => {
    if (isSigningIn) return
    setError(undefined)
    if (!credential) {
      setError('Google did not return a sign-in credential.')
      return
    }

    setIsSigningIn(true)
    try {
      await signInWithCredential(credential)
      navigate((location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.')
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <main className="login-page">
      <Paper className="login-card">
        <div className="login-brand">
          <AccountBalanceWalletOutlinedIcon />
          <Typography variant="h2">BalanceSheetApp</Typography>
        </div>
        <div>
          <Typography component="h1" variant="h1">Welcome back</Typography>
          <Typography color="text.secondary">Sign in with your approved Google account to access the family ledger.</Typography>
        </div>
        {sessionExpired && <Alert severity="info">Your Google sign-in session expired. Please sign in again to continue.</Alert>}
        {authConfig.isValid ? <GoogleLogin containerProps={{ 'aria-busy': isSigningIn, style: { pointerEvents: isSigningIn ? 'none' : 'auto' } }} onError={() => setError('Google sign-in could not be completed.')} onSuccess={login} /> : <Alert severity="warning">Authentication configuration is invalid: {authConfig.errors.join(' ')}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
      </Paper>
    </main>
  )
}

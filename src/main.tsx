import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { GOOGLE_CLIENT_ID } from './config/auth'
import { AppThemeProvider } from './theme/AppThemeProvider'
import './styles/global.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}><AppThemeProvider><GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><AuthProvider><BrowserRouter><App /></BrowserRouter></AuthProvider></GoogleOAuthProvider></AppThemeProvider></QueryClientProvider>
  </StrictMode>,
)

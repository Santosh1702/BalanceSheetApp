import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { ThemeModeContext } from './ThemeModeContext'

export function AppThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<'light' | 'dark'>(() => localStorage.getItem('pocket-ledger-theme') === 'dark' ? 'dark' : 'light')
  const isLight = mode === 'light'
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#7C3AED', dark: '#5B21B6', contrastText: '#FFFFFF' },
      secondary: { main: '#C93679', dark: '#A82362', contrastText: '#FFFFFF' },
      success: { main: '#0A8F5A', dark: '#087347' },
      error: { main: '#D25863', dark: '#B43F4B' },
      background: { default: isLight ? '#FAF8FC' : '#160F20', paper: isLight ? '#FFFFFF' : '#21182B' },
      text: { primary: isLight ? '#241B35' : '#F7F1FB', secondary: isLight ? '#746A7F' : '#BEB1C8' },
      divider: isLight ? '#EAE3F0' : '#3A2D46',
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: 'Inter, Roboto, Arial, sans-serif',
      h1: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em' },
      h2: { fontSize: '1.25rem', fontWeight: 750 },
      button: { fontWeight: 700, textTransform: 'none' },
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 10, minHeight: 42 } } },
      MuiCard: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiDialog: { styleOverrides: { paper: { backgroundImage: 'none', borderRadius: 18 } } },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    },
  }), [isLight, mode])
  const toggleMode = () => setMode((value) => {
    const next = value === 'light' ? 'dark' : 'light'
    localStorage.setItem('pocket-ledger-theme', next)
    return next
  })

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

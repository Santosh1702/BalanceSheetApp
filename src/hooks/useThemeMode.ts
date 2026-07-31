import { useContext } from 'react'
import { ThemeModeContext } from '../theme/ThemeModeContext'
export function useThemeMode() { const context = useContext(ThemeModeContext); if (!context) throw new Error('Theme provider is missing.'); return context }

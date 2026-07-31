import { createContext } from 'react'
export const ThemeModeContext = createContext<{ mode: 'light' | 'dark'; toggleMode: () => void } | undefined>(undefined)

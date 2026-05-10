import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const THEME_KEY = 'theme'

function getPreferredTheme() {
  if (typeof window === 'undefined') return 'light'

  const stored = window.localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light') return stored

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getPreferredTheme)

  useEffect(() => {
    applyTheme(theme)
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const value = useMemo(() => {
    const setTheme = nextTheme => {
      if (nextTheme !== 'dark' && nextTheme !== 'light') return
      setThemeState(nextTheme)
    }

    return {
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme: () => setThemeState(current => current === 'dark' ? 'light' : 'dark'),
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}

import React, { createContext, useContext, useEffect, useState } from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: ThemeMode
  storageKey?: string
}

interface ThemeProviderState {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'semeia-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(storageKey) as ThemeMode | null
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved
    } catch {
      /* storage indisponível */
    }
    return defaultTheme
  })

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (theme === 'dark') return 'dark'
    if (theme === 'light') return 'light'
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const computeResolved = (): ResolvedTheme => {
      if (theme === 'dark') return 'dark'
      if (theme === 'light') return 'light'
      return mediaQuery.matches ? 'dark' : 'light'
    }

    const currentResolved = computeResolved()
    setResolvedTheme(currentResolved)

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(currentResolved)
    root.style.colorScheme = currentResolved

    try {
      localStorage.setItem(storageKey, theme)
    } catch {
      /* storage indisponível */
    }

    const handler = () => {
      if (theme === 'system') {
        const sysResolved = mediaQuery.matches ? 'dark' : 'light'
        setResolvedTheme(sysResolved)
        root.classList.remove('light', 'dark')
        root.classList.add(sysResolved)
        root.style.colorScheme = sysResolved
      }
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme, storageKey])

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'system') {
        const isSysDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        return isSysDark ? 'light' : 'dark'
      }
      return prev === 'dark' ? 'light' : 'dark'
    })
  }

  const value = {
    theme,
    resolvedTheme,
    setTheme: (t: ThemeMode) => {
      setTheme(t)
    },
    toggleTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) throw new Error('useTheme deve ser usado dentro de um ThemeProvider')
  return context
}

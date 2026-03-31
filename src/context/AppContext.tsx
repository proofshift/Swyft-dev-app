import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

/* ── Accent color ────────────────────────────────────────────────────────── */
export type AccentColor = 'sky' | 'green' | 'orange' | 'violet'

export const ACCENT_OPTIONS: { id: AccentColor; label: string; hex: string }[] = [
  { id: 'sky',    label: 'Sky',    hex: '#38bdf8' },
  { id: 'green',  label: 'Green',  hex: '#34d399' },
  { id: 'orange', label: 'Amber',  hex: '#fbbf24' },
  { id: 'violet', label: 'Violet', hex: '#a78bfa' },
]

export const ACCENT_CSS: Record<AccentColor, { bg: string; text: string; border: string; hex: string; activeBg: string }> = {
  sky:    { bg: 'bg-sky-500/15',    text: 'text-sky-400',    border: 'border-sky-500/30',    hex: '#38bdf8', activeBg: 'bg-sky-500' },
  green:  { bg: 'bg-emerald-500/15',text: 'text-emerald-400',border: 'border-emerald-500/30',hex: '#34d399', activeBg: 'bg-emerald-500' },
  orange: { bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/30',  hex: '#fbbf24', activeBg: 'bg-amber-500' },
  violet: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', hex: '#a78bfa', activeBg: 'bg-violet-500' },
}

/* ── Theme (background darkness) ────────────────────────────────────────── */
export type Theme = 'dark' | 'midnight' | 'steel'

export const THEME_OPTIONS: { id: Theme; label: string; bg: string; sidebar: string }[] = [
  { id: 'dark',     label: 'Dark',     bg: '#0c1220', sidebar: '#080d18' },
  { id: 'midnight', label: 'AMOLED',   bg: '#000000', sidebar: '#000000' },
  { id: 'steel',    label: 'Steel',    bg: '#0f172a', sidebar: '#0a1020' },
]

/* ── Thresholds ──────────────────────────────────────────────────────────── */
export interface Thresholds {
  enabled: boolean
  maxBoardTemp: number
  maxImuTemp: number
  minVoltage: number
}

const DEFAULT_THRESHOLDS: Thresholds = {
  enabled: true,
  maxBoardTemp: 65,
  maxImuTemp: 70,
  minVoltage: 3.0,
}

/* ── Context ─────────────────────────────────────────────────────────────── */
interface AppContextType {
  accent: AccentColor
  setAccent: (a: AccentColor) => void
  accentCss: typeof ACCENT_CSS[AccentColor]

  theme: Theme
  setTheme: (t: Theme) => void
  themeCss: typeof THEME_OPTIONS[number]

  thresholds: Thresholds
  setThresholds: (t: Partial<Thresholds>) => void
}

const AppContext = createContext<AppContextType>({} as AppContextType)

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState]     = useState<AccentColor>(() => load('swyft-accent', 'sky'))
  const [theme,  setThemeState]      = useState<Theme>(()        => load('swyft-theme',  'dark'))
  const [thresholds, setThreshState] = useState<Thresholds>(()   => ({ ...DEFAULT_THRESHOLDS, ...load('swyft-thresh', {}) }))

  const setAccent = useCallback((a: AccentColor) => {
    setAccentState(a); localStorage.setItem('swyft-accent', JSON.stringify(a))
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t); localStorage.setItem('swyft-theme', JSON.stringify(t))
  }, [])

  const setThresholds = useCallback((t: Partial<Thresholds>) => {
    setThreshState(prev => {
      const next = { ...prev, ...t }
      localStorage.setItem('swyft-thresh', JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <AppContext.Provider value={{
      accent, setAccent, accentCss: ACCENT_CSS[accent],
      theme,  setTheme,  themeCss: THEME_OPTIONS.find(t => t.id === theme)!,
      thresholds, setThresholds,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)

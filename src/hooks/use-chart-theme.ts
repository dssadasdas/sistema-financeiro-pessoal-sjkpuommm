/* Centralized Recharts styling that adapts to the active light/dark theme.
 * Reads CSS variables exposed in main.css so charts stay consistent across
 * the app without hardcoding color values in each chart. */
import { useTheme } from '@/contexts/ThemeContext'

export function useChartTheme() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return {
    isDark,
    gridStroke: isDark ? '#1e293b' : '#e2e8f0',
    axisStroke: isDark ? '#64748b' : '#94a3b8',
    tooltipStyle: {
      borderRadius: 12,
      border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
      fontSize: 12,
      background: isDark ? '#121a2b' : '#ffffff',
      color: isDark ? '#f1f5f9' : '#0f172a',
    } as React.CSSProperties,
  }
}

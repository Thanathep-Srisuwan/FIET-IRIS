import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 ${className}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      {isDark ? (
        <Sun size={20} className="text-amber-400" />
      ) : (
        <Moon size={20} className="text-slate-600" />
      )}
    </button>
  )
}

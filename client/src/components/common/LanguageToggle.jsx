import { Languages } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

export default function LanguageToggle({ className = '' }) {
  const { language, languages, toggleLanguage } = useLanguage()
  const nextLanguageCode = language === 'th' ? 'en' : 'th'
  const nextLanguage = languages[nextLanguageCode].label

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-primary-300 ${className}`}
      aria-label={`Switch language to ${nextLanguage}`}
      title={`Switch language to ${nextLanguage}`}
    >
      <Languages size={15} />
      <span>{language === 'th' ? 'TH' : 'EN'}</span>
    </button>
  )
}


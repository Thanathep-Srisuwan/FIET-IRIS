import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useLanguage } from '../../contexts/LanguageContext'
import NotificationPanel from '../common/NotificationPanel'
import ThemeToggle from '../common/ThemeToggle'
import LanguageToggle from '../common/LanguageToggle'

const pageMeta = [
  { match: /^\/dashboard/, titleKey: 'topbar.dashboard', eyebrow: 'Dashboard' },
  { match: /^\/student\/tasks/, titleKey: 'topbar.studentTasks', eyebrow: 'Student' },
  { match: /^\/student\/activity/, titleKey: 'topbar.studentActivity', eyebrow: 'Student' },
  { match: /^\/documents/, titleKey: 'topbar.documents', eyebrow: 'Documents' },
  { match: /^\/admin\/users/, titleKey: 'topbar.adminUsers', eyebrow: 'Admin' },
  { match: /^\/admin\/announcements/, titleKey: 'topbar.adminAnnouncements', eyebrow: 'Admin' },
  { match: /^\/admin\/doc-types/, titleKey: 'topbar.adminDocTypes', eyebrow: 'Admin' },
  { match: /^\/admin\/trash/, titleKey: 'topbar.adminTrash', eyebrow: 'Admin' },
  { match: /^\/admin\/logs/, titleKey: 'topbar.adminLogs', eyebrow: 'Admin' },
  { match: /^\/admin\/settings/, titleKey: 'topbar.adminSettings', eyebrow: 'Admin' },
  { match: /^\/admin\/email-templates/, titleKey: 'topbar.adminEmailTemplates', eyebrow: 'Admin' },
  { match: /^\/executive\/overview/, titleKey: 'topbar.executiveOverview', eyebrow: 'Executive' },
  { match: /^\/executive\/(programs|branches)/, titleKey: 'topbar.executivePrograms', eyebrow: 'Executive' },
  { match: /^\/executive\/documents/, titleKey: 'topbar.executiveDocuments', eyebrow: 'Executive' },
]

function getPageMeta(pathname) {
  return pageMeta.find(item => item.match.test(pathname)) || { titleKey: 'programs', eyebrow: 'Programs' }
}

export default function Topbar({ onMenuClick }) {
  const { user } = useAuthStore()
  const { locale, t } = useLanguage()
  const location = useLocation()
  const [, setUnreadCount] = useState(0)
  const meta = getPageMeta(location.pathname)

  const today = new Date().toLocaleDateString(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/85 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all duration-200 hover:bg-primary-50 hover:text-primary-600 dark:text-slate-400 dark:hover:bg-primary-900/30 dark:hover:text-primary-400 md:hidden"
          aria-label={t('common.openMenu')}
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">{meta.eyebrow}</p>
            <span className="hidden h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 sm:inline-block" />
            <p className="hidden text-[11px] font-medium text-slate-400 dark:text-slate-500 sm:block">{today}</p>
          </div>
          <h1 className="truncate text-base font-bold leading-tight text-slate-900 dark:text-slate-100 md:text-lg">{t(meta.titleKey)}</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 lg:flex">
          <ShieldCheck size={16} className="text-primary-500" />
          <span className="text-xs font-semibold">{t(`roles.${user?.role || 'user'}`)}</span>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <LanguageToggle className="h-9 px-2" />
          <ThemeToggle className="h-9 w-9" />
          <NotificationPanel onCountChange={setUnreadCount} />
        </div>

        <div className="hidden items-center gap-3 pl-2 sm:flex">
          <div className="max-w-44 text-right">
            <p className="truncate text-sm font-semibold leading-none text-slate-800 dark:text-slate-100">{user?.name}</p>
            <p className="mt-1 truncate text-xs font-medium text-slate-400 dark:text-slate-500">{user?.email || t('common.loggedIn')}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-sm">
            {user?.name?.[0] || 'U'}
          </div>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-sm sm:hidden">
          {user?.name?.[0] || 'U'}
        </div>
      </div>
    </header>
  )
}

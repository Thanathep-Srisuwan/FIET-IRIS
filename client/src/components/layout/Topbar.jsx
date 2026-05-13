import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Camera, ChevronDown, LogOut, Menu, ShieldCheck, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { useLanguage } from '../../contexts/LanguageContext'
import { authService } from '../../services/api'
import NotificationPanel from '../common/NotificationPanel'
import ThemeToggle from '../common/ThemeToggle'
import LanguageToggle from '../common/LanguageToggle'

const pageMeta = [
  { match: /^\/dashboard/, titleKey: 'topbar.dashboard', eyebrowKey: 'topbar.workspace' },
  { match: /^\/student\/tasks/, titleKey: 'topbar.studentTasks', eyebrowKey: 'roles.student' },
  { match: /^\/student\/activity/, titleKey: 'topbar.studentActivity', eyebrowKey: 'roles.student' },
  { match: /^\/documents/, titleKey: 'topbar.documents', eyebrowKey: 'common.documents' },
  { match: /^\/admin\/users/, titleKey: 'topbar.adminUsers', eyebrowKey: 'roles.admin' },
  { match: /^\/admin\/announcements/, titleKey: 'topbar.adminAnnouncements', eyebrowKey: 'roles.admin' },
  { match: /^\/admin\/doc-types/, titleKey: 'topbar.adminDocTypes', eyebrowKey: 'roles.admin' },
  { match: /^\/admin\/programs/, titleKey: 'topbar.adminPrograms', eyebrowKey: 'roles.admin' },
  { match: /^\/admin\/trash/, titleKey: 'topbar.adminTrash', eyebrowKey: 'roles.admin' },
  { match: /^\/admin\/logs/, titleKey: 'topbar.adminLogs', eyebrowKey: 'roles.admin' },
  { match: /^\/admin\/settings/, titleKey: 'topbar.adminSettings', eyebrowKey: 'roles.admin' },
  { match: /^\/admin\/email-templates/, titleKey: 'topbar.adminEmailTemplates', eyebrowKey: 'roles.admin' },
  { match: /^\/admin\/activity/,        titleKey: 'topbar.adminActivity',       eyebrowKey: 'roles.admin' },
  { match: /^\/executive\/overview/, titleKey: 'topbar.executiveOverview', eyebrowKey: 'roles.executive' },
  { match: /^\/executive\/(programs|branches)/, titleKey: 'topbar.executivePrograms', eyebrowKey: 'roles.executive' },
  { match: /^\/executive\/documents/, titleKey: 'topbar.executiveDocuments', eyebrowKey: 'roles.executive' },
  { match: /^\/profile/, titleKey: 'topbar.profile', eyebrowKey: 'profile.eyebrow' },
]

function getPageMeta(pathname) {
  return pageMeta.find(item => item.match.test(pathname)) || { titleKey: 'topbar.workspace', eyebrowKey: 'topbar.workspace' }
}

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuthStore()
  const { locale, t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const [, setUnreadCount] = useState(0)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const meta = getPageMeta(location.pathname)

  const today = new Date().toLocaleDateString(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setDropdownOpen(false)
    try {
      await authService.logout()
    } finally {
      logout()
      navigate('/')
      toast.success(t('common.logoutSuccess'))
    }
  }

  const handleGoToProfile = () => {
    setDropdownOpen(false)
    navigate('/profile')
  }

  const handleGoToProfilePhoto = () => {
    setDropdownOpen(false)
    navigate('/profile?focus=photo')
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'
  const avatar = user?.profile_image_url
    ? <img src={user.profile_image_url} alt={user?.name || t('profile.photoPreviewAlt')} className="h-full w-full object-cover" />
    : initials

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
            <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">{t(meta.eyebrowKey)}</p>
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

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-2 rounded-xl p-1 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={t('profile.viewProfile')}
          >
            {/* Desktop: name + email + avatar */}
            <div className="hidden items-center gap-3 pl-1 sm:flex">
              <div className="max-w-44 text-right">
                <p className="truncate text-sm font-semibold leading-none text-slate-800 dark:text-slate-100">{user?.name}</p>
                <p className="mt-1 truncate text-xs font-medium text-slate-400 dark:text-slate-500">{user?.email || t('common.loggedIn')}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-primary-600 text-sm font-bold text-white shadow-sm">
                {avatar}
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 dark:text-slate-500 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Mobile: avatar only */}
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-primary-600 text-sm font-bold text-white shadow-sm sm:hidden">
              {avatar}
            </div>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {/* User info header */}
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{user?.email}</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={handleGoToProfile}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <User size={15} className="shrink-0 text-slate-400 dark:text-slate-500" />
                  {t('profile.viewProfile')}
                </button>

                {/* <button
                  onClick={handleGoToProfilePhoto}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Camera size={15} className="shrink-0 text-slate-400 dark:text-slate-500" />
                  {t('profile.changePhoto')}
                </button> */}

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <LogOut size={15} className="shrink-0" />
                  {t('common.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

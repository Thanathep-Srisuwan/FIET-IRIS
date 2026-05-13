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
  {
    match: /^\/dashboard/,
    titleByRole: {
      student: 'topbar.dashboardStudent',
      advisor: 'topbar.dashboardAdvisor',
      staff: 'topbar.dashboardStaff',
      admin: 'topbar.dashboardAdmin',
      executive: 'topbar.dashboardExecutive',
    },
    eyebrowByRole: {
      student: 'roles.student',
      advisor: 'roles.advisor',
      staff: 'roles.staff',
      admin: 'roles.admin',
      executive: 'roles.executive',
    },
  },
  { match: /^\/student\/trash/, titleKey: 'topbar.studentTrash', eyebrowKey: 'topbar.sectionMyAccount' },
  { match: /^\/advisor\/advisees/, titleKey: 'topbar.advisorAdvisees', eyebrowKey: 'roles.advisor' },
  {
    match: /^\/documents/,
    titleByRole: {
      student: 'topbar.documentsStudent',
      advisor: 'topbar.documentsAdvisor',
      staff: 'topbar.documentsStaff',
      admin: 'topbar.documentsAdmin',
    },
    eyebrowKey: 'topbar.sectionDocuments',
  },
  { match: /^\/admin\/users/, titleKey: 'topbar.adminUsers', eyebrowKey: 'topbar.sectionAdminManage' },
  { match: /^\/admin\/announcements/, titleKey: 'topbar.adminAnnouncements', eyebrowKey: 'topbar.sectionAdminManage' },
  { match: /^\/admin\/doc-types/, titleKey: 'topbar.adminDocTypes', eyebrowKey: 'topbar.sectionAdminManage' },
  { match: /^\/admin\/programs/, titleKey: 'topbar.adminPrograms', eyebrowKey: 'topbar.sectionAdminManage' },
  { match: /^\/admin\/faq/, titleKey: 'topbar.adminFaq', eyebrowKey: 'topbar.sectionAdminManage' },
  { match: /^\/admin\/trash/, titleKey: 'topbar.adminTrash', eyebrowKey: 'topbar.sectionAdminSystem' },
  { match: /^\/admin\/logs/, titleKey: 'topbar.adminLogs', eyebrowKey: 'topbar.sectionAdminSystem' },
  { match: /^\/admin\/settings/, titleKey: 'topbar.adminSettings', eyebrowKey: 'topbar.sectionAdminSystem' },
  { match: /^\/admin\/email-templates/, titleKey: 'topbar.adminEmailTemplates', eyebrowKey: 'topbar.sectionAdminSystem' },
  { match: /^\/admin\/activity/, titleKey: 'topbar.adminActivity', eyebrowKey: 'topbar.sectionAdminSystem' },
  { match: /^\/executive\/overview/, titleKey: 'topbar.executiveOverview', eyebrowKey: 'topbar.sectionExecutive' },
  { match: /^\/executive\/(programs|branches)/, titleKey: 'topbar.executivePrograms', eyebrowKey: 'topbar.sectionExecutive' },
  { match: /^\/executive\/documents/, titleKey: 'topbar.executiveDocuments', eyebrowKey: 'topbar.sectionExecutive' },
  { match: /^\/profile/, titleKey: 'topbar.profile', eyebrowKey: 'profile.eyebrow' },
  { match: /^\/help/, titleKey: 'topbar.help', eyebrowKey: 'topbar.sectionSupport' },
]

function getPageMeta(pathname, role) {
  const matched = pageMeta.find(item => item.match.test(pathname))
    || { titleKey: 'topbar.workspace', eyebrowKey: 'topbar.workspace' }
  return {
    titleKey: matched.titleByRole?.[role] || matched.titleKey || matched.titleByRole?.user || 'topbar.workspace',
    eyebrowKey: matched.eyebrowByRole?.[role] || matched.eyebrowKey || matched.eyebrowByRole?.user || 'topbar.workspace',
  }
}

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuthStore()
  const { locale, t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const [, setUnreadCount] = useState(0)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const meta = getPageMeta(location.pathname, user?.role)

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
            <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">{t(`roles.${user?.role || 'user'}`)}</p>
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

import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  FileText,
  Users,
  Megaphone,
  Tags,
  Trash2,
  History,
  Settings,
  Mail,
  BarChart3,
  GraduationCap,
  Activity,
  LogOut,
  HelpCircle,
  ClipboardCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { useLanguage } from '../../contexts/LanguageContext'
import { authService, staffService } from '../../services/api'
import irisLogo from '../../assets/LOGO-IRIS.png'

const navByRole = {
  student: [
    { to: '/dashboard', labelKey: 'nav.home' },
    { to: '/documents', labelKey: 'nav.myCertificates' },
    { to: '/student/trash', labelKey: 'nav.studentTrash' },
    { to: '/help', labelKey: 'nav.help' },
  ],
  advisor: [
    { to: '/dashboard', labelKey: 'nav.home' },
    { to: '/advisor/advisees', labelKey: 'nav.advisorAdvisees' },
    { to: '/documents?panel=advisees', labelKey: 'nav.advisorDocuments' },
    { to: '/documents?panel=mine', labelKey: 'nav.advisorMyDocuments' },
    { to: '/student/trash', labelKey: 'nav.studentTrash' },
    { to: '/help', labelKey: 'nav.help' },
  ],
  staff: [
    { to: '/dashboard', labelKey: 'nav.home' },
    { to: '/staff/approvals', labelKey: 'nav.staffApprovals', badge: true },
    { to: '/documents', labelKey: 'nav.myDocuments' },
    { to: '/student/trash', labelKey: 'nav.myTrash' },
    { to: '/help', labelKey: 'nav.help' },
  ],
  admin: [
    { to: '/dashboard', labelKey: 'nav.home' },
    { to: '/documents', labelKey: 'nav.allCertificates' },
    { sectionKey: 'nav.sectionManage' },
    { to: '/admin/users', labelKey: 'nav.users' },
    { to: '/admin/announcements', labelKey: 'nav.announcements' },
    { to: '/admin/doc-types', labelKey: 'nav.documentTypes' },
    { to: '/admin/programs', labelKey: 'nav.programs' },
    { to: '/admin/faq', labelKey: 'nav.faq' },
    { sectionKey: 'nav.sectionSystem' },
    { to: '/admin/trash', labelKey: 'nav.trash' },
    { to: '/admin/logs', labelKey: 'nav.logs' },
    { to: '/admin/activity', labelKey: 'nav.activityLog' },
    { to: '/admin/settings', labelKey: 'nav.settings' },
    { to: '/admin/email-templates', labelKey: 'nav.emailTemplates' },
  ],
  executive: [
    { to: '/executive/overview', labelKey: 'nav.executiveOverview' },
    { to: '/executive/programs', labelKey: 'nav.executivePrograms' },
    { to: '/executive/documents', labelKey: 'nav.executiveDocuments' },
  ],
}

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuthStore()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const items = navByRole[user?.role] || []
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (user?.role !== 'staff') return
    staffService.getStats()
      .then(({ data }) => setPendingCount(data?.pending_count ?? 0))
      .catch(() => {})
  }, [user?.role])

  const handleLogout = async () => {
    try {
      await authService.logout()
    } finally {
      logout()
      navigate('/')
      toast.success(t('common.logoutSuccess'))
    }
  }

  return (
    <aside className="flex h-screen w-72 select-none flex-col overflow-hidden border-r border-primary-900/40 bg-fiet-navy font-sans text-slate-100 shadow-xl shadow-slate-900/10 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950 md:w-64">
      <div className="shrink-0 border-b border-white/10 bg-white/[0.03] px-5 py-5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <img src={irisLogo} alt="FIET-IRIS Logo" className="h-10 w-auto shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold leading-none text-white">FIET IRIS</p>
            <p className="mt-1 text-[11px] font-semibold leading-tight text-primary-100/70 dark:text-slate-400">Integrity Research Information System</p>
          </div>
        </div>
      </div>

      <nav className="scrollbar-hide flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-bold text-primary-100/55 dark:text-slate-500">{t('common.mainMenu')}</p>
        <div className="space-y-1">
          {items.map((item, idx) => {
            if (item.sectionKey) {
              return (
                <p key={`section-${idx}`} className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-primary-100/40 dark:text-slate-600">
                  {t(item.sectionKey)}
                </p>
              )
            }
            const [itemPath, itemQuery = ''] = item.to.split('?')
            const itemPanel = new URLSearchParams(itemQuery).get('panel')
            const currentPanel = new URLSearchParams(location.search).get('panel') || 'advisees'
            const isItemActive = itemPanel
              ? location.pathname === itemPath && currentPanel === itemPanel
              : location.pathname === item.to
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={() =>
                  `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    isItemActive
                      ? 'bg-white text-fiet-navy shadow-sm shadow-slate-950/10 dark:bg-primary-900/30 dark:text-primary-100'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                {() => (
                  <>
                    {isItemActive && <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-primary-500" />}
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-200 ${
                      isItemActive
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-800/60 dark:text-primary-200'
                        : 'bg-white/10 text-slate-300 group-hover:bg-white/15 group-hover:text-primary-200 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:text-primary-300'
                    }`}>
                      {getIcon(item.to, isItemActive)}
                    </div>
                    <span className="truncate flex-1">{t(item.labelKey)}</span>
                    {item.badge && pendingCount > 0 && (
                      <span className="ml-1 shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/10 bg-slate-950/25 px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-3 flex items-center gap-3 px-1">
          <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden">
            {user?.profile_image_url ? (
              <img
                src={user.profile_image_url}
                alt={user?.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary-600 text-sm font-bold text-white">
                {user?.name?.[0] || 'U'}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white dark:text-slate-100">{user?.name}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">{t(`roles.${user?.role || 'user'}`)}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 py-2.5 text-xs font-semibold text-slate-200 transition-all duration-200 hover:border-red-300/40 hover:bg-red-500/15 hover:text-red-100 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-300"
        >
          <LogOut size={14} strokeWidth={2.5} />
          <span>{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  )
}

function getIcon(to, isActive) {
  const iconProps = {
    size: 20,
    strokeWidth: isActive ? 2.5 : 2,
  }

  if (to.includes('dashboard') || to === '/executive/overview') return <Home {...iconProps} />
  if (to === '/student/trash' || to === '/my-trash') return <Trash2 {...iconProps} />
  if (to === '/staff/approvals') return <ClipboardCheck {...iconProps} />
  if (to.includes('documents')) return <FileText {...iconProps} />
  if (to.includes('advisor/advisees')) return <GraduationCap {...iconProps} />
  if (to.includes('admin/users')) return <Users {...iconProps} />
  if (to.includes('admin/announcements')) return <Megaphone {...iconProps} />
  if (to.includes('admin/doc-types')) return <Tags {...iconProps} />
  if (to.includes('admin/trash')) return <Trash2 {...iconProps} />
  if (to.includes('admin/faq')) return <HelpCircle {...iconProps} />
  if (to.includes('admin/logs')) return <History {...iconProps} />
  if (to.includes('admin/activity')) return <Activity {...iconProps} />
  if (to.includes('admin/settings')) return <Settings {...iconProps} />
  if (to.includes('admin/email-templates')) return <Mail {...iconProps} />
  if (to.includes('admin/programs')) return <GraduationCap {...iconProps} />
  if (to.includes('executive/programs') || to.includes('executive/branches')) return <BarChart3 {...iconProps} />
  if (to === '/help') return <HelpCircle {...iconProps} />

  return <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-white/25'}`} />
}

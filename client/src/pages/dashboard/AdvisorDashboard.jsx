import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bell, CheckCircle2, Clock, FileText, GraduationCap, Users } from 'lucide-react'
import { documentService, notificationService, userService } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useLanguage } from '../../contexts/LanguageContext'

const statusBadge = {
  active:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border-amber-200',
  expired:       'bg-red-50 text-red-700 border-red-200',
}

const getDocStatus = (doc) => {
  if (doc.no_expire) return 'active'
  if (doc.days_remaining == null) return doc.status
  if (doc.days_remaining < 0) return 'expired'
  if (doc.days_remaining <= 90) return 'expiring_soon'
  return 'active'
}

const statusKey = (status) => ({
  active:        'status.active',
  expiring_soon: 'status.expiringSoon',
  expired:       'status.expired',
}[status] || status)

const formatDate = (value, locale) => value ? new Date(value).toLocaleDateString(locale) : '-'

export default function AdvisorDashboard() {
  const { user } = useAuthStore()
  const { locale, t } = useLanguage()
  const [docs, setDocs] = useState([])
  const [adviseeSummary, setAdviseeSummary] = useState(null)
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      documentService.getAll({ limit: 10, sort_by: 'expire_date', sort_dir: 'asc' }),
      userService.getMyAdvisees(),
      notificationService.getUnread(),
    ]).then(([d, advisees, n]) => {
      setDocs(d.data?.documents || [])
      setAdviseeSummary(advisees.data?.summary || null)
      setNotifs(n.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const hasUrgent = (adviseeSummary?.with_expired ?? 0) > 0 || (adviseeSummary?.with_expiring ?? 0) > 0

  return (
    <div className="mx-auto max-w-5xl space-y-5">

      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
          {t('dashboard.advisorEyebrow')}
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
          {t('dashboard.greeting', { name: user?.name || '' })}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {t('dashboard.advisorIntro')}
        </p>
      </section>

      {/* Status banner */}
      <section className={`rounded-2xl border p-5 ${
        hasUrgent
          ? 'border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20'
          : 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            hasUrgent
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
          }`}>
            {hasUrgent ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {hasUrgent ? t('advisorDashboard.hasProblemTitle') : t('advisorDashboard.noProblemTitle')}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {hasUrgent
                ? t('advisorDashboard.hasProblemDesc', {
                    expired: adviseeSummary?.with_expired ?? 0,
                    expiring: adviseeSummary?.with_expiring ?? 0,
                  })
                : t('advisorDashboard.noProblemDesc')}
            </p>
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{t('dashboard.adviseeCount')}</p>
            <Users size={15} className="shrink-0 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{adviseeSummary?.total ?? 0}</p>
        </div>

        <div className="rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">{t('dashboard.adviseeExpired')}</p>
            <AlertTriangle size={15} className="shrink-0 text-red-300 dark:text-red-700" />
          </div>
          <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-400">{adviseeSummary?.with_expired ?? 0}</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-white p-4 dark:border-amber-900/50 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">{t('dashboard.adviseeExpiring')}</p>
            <Clock size={15} className="shrink-0 text-amber-300 dark:text-amber-700" />
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">{adviseeSummary?.with_expiring ?? 0}</p>
        </div>

        <div className="rounded-xl border border-primary-200 bg-white p-4 dark:border-primary-900/50 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">{t('advisorAdvisees.pendingDocs')}</p>
            <FileText size={15} className="shrink-0 text-primary-300 dark:text-primary-700" />
          </div>
          <p className="mt-1 text-2xl font-bold text-primary-700 dark:text-primary-400">{adviseeSummary?.pending_documents ?? 0}</p>
        </div>
      </section>

      {/* Main two-column */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]">

        {/* Advisee documents table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('dashboard.advisorDocsTitle')}</h2>
              <p className="mt-0.5 text-xs text-slate-400">{t('advisorDashboard.docsTableDesc')}</p>
            </div>
            <Link
              to="/documents"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {t('common.viewAll')} →
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">{t('common.loading')}</div>
          ) : docs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <GraduationCap size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('advisorDashboard.noAdviseeDocTitle')}</p>
              <p className="mt-1 text-xs text-slate-400">{t('advisorDashboard.noAdviseeDocDesc')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '420px' }}>
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {[t('dashboard.tableName'), t('dashboard.tableType'), t('dashboard.tableExpire'), t('dashboard.tableStatus')].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {docs.map(doc => {
                    const status = getDocStatus(doc)
                    return (
                      <tr key={doc.doc_id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
                        <td className="px-5 py-3.5">
                          <p className="max-w-[160px] truncate font-medium text-slate-700 dark:text-slate-200">{doc.title}</p>
                          {doc.owner_name && (
                            <p className="mt-0.5 max-w-[160px] truncate text-xs text-slate-400">{doc.owner_name}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                            {doc.doc_type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          {doc.no_expire
                            ? <span className="italic text-slate-400">{t('common.noExpire')}</span>
                            : formatDate(doc.expire_date, locale)
                          }
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge[status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {t(statusKey(status))}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('dashboard.notifications')}</h2>
              <p className="mt-0.5 text-xs text-slate-400">{t('advisorDashboard.notificationsDesc')}</p>
            </div>
            <Bell size={16} className="text-slate-400" />
          </div>
          {notifs.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-slate-900">
              {t('common.noNotifications')}
            </p>
          ) : (
            <div className="space-y-2">
              {notifs.slice(0, 5).map(item => (
                <Link
                  key={item.notif_id}
                  to="/documents"
                  className="block rounded-xl bg-amber-50 p-3 transition-colors hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
                >
                  <p className="truncate text-xs font-semibold text-amber-900 dark:text-amber-200">{item.doc_title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-amber-700 dark:text-amber-300">{item.message}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          to="/advisor/advisees"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-primary-300 hover:bg-primary-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-primary-800 dark:hover:bg-primary-950/20"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            <GraduationCap size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('advisorDashboard.quickLinkAdvisees')}</p>
            <p className="mt-0.5 text-xs text-slate-400">{t('advisorDashboard.quickLinkAdviseesDesc')}</p>
          </div>
        </Link>

        <Link
          to="/documents"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('advisorDashboard.quickLinkDocuments')}</p>
            <p className="mt-0.5 text-xs text-slate-400">{t('advisorDashboard.quickLinkDocumentsDesc')}</p>
          </div>
        </Link>
      </section>

    </div>
  )
}

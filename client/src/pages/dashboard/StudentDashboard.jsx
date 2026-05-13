import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bell, CheckCircle2, FileText } from 'lucide-react'
import { documentService, notificationService } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useLanguage } from '../../contexts/LanguageContext'

const statusBadge = {
  active:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border-amber-200',
  expired:       'bg-red-50 text-red-700 border-red-200',
}

const getStatus = (doc) => {
  if (doc.no_expire) return 'active'
  if (doc.days_remaining == null) return doc.status
  if (doc.days_remaining < 0) return 'expired'
  if (doc.days_remaining <= 90) return 'expiring_soon'
  return 'active'
}

const formatDate = (value, locale) => value ? new Date(value).toLocaleDateString(locale) : '-'

const getDueText = (doc, t, locale) => {
  if (doc.no_expire) return t('common.noExpire')
  if (doc.days_remaining == null) return formatDate(doc.expire_date, locale)
  if (doc.days_remaining < 0) return t('common.overdueDays', { days: Math.abs(doc.days_remaining) })
  return t('common.remainingDays', { days: doc.days_remaining })
}

const statusKey = (status) => ({
  active:        'status.active',
  expiring_soon: 'status.expiringSoon',
  expired:       'status.expired',
}[status] || status)

function DocumentItem({ doc, t, locale }) {
  const status = getStatus(doc)
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{doc.title}</p>
          <span className="shrink-0 rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            {doc.doc_type}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {t('common.expireDate')} {formatDate(doc.expire_date, locale)} · {getDueText(doc, t, locale)}
        </p>
      </div>
      <span className={`hidden rounded-full border px-2.5 py-1 text-xs font-semibold sm:inline-flex ${statusBadge[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {t(statusKey(status))}
      </span>
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const { locale, t } = useLanguage()
  const [docs, setDocs]   = useState([])
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      documentService.getAll({ limit: 100, sort_by: 'expire_date', sort_dir: 'asc' }),
      notificationService.getUnread(),
    ]).then(([d, n]) => {
      setDocs(d.data?.documents || [])
      setNotifs(n.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const expired  = docs.filter(doc => getStatus(doc) === 'expired').length
    const expiring = docs.filter(doc => getStatus(doc) === 'expiring_soon').length
    return { total: docs.length, expired, expiring }
  }, [docs])

  const urgentDocs = useMemo(() => (
    docs
      .filter(doc => !doc.no_expire && ['expired', 'expiring_soon'].includes(getStatus(doc)))
      .sort((a, b) => (a.days_remaining ?? 9999) - (b.days_remaining ?? 9999))
      .slice(0, 5)
  ), [docs])

  const hasProblem = stats.expired > 0 || stats.expiring > 0

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
          {t('studentDashboard.todayTitle')}
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
          {t('studentDashboard.greeting', { name: user?.name || '' })}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {t('studentDashboard.intro')}
        </p>
      </section>

      <section className={`rounded-2xl border p-5
        ${hasProblem
          ? 'border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20'
          : 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20'}`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl
            ${hasProblem
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'}`}>
              {hasProblem ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {hasProblem ? t('studentDashboard.hasProblemTitle') : t('studentDashboard.noUrgentTitle')}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {hasProblem
                ? t('studentDashboard.hasProblemDesc', { expired: stats.expired, expiring: stats.expiring })
                : t('studentDashboard.noProblemDesc')}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-semibold text-slate-400">{t('studentDashboard.total')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-white p-4 dark:border-amber-900/50 dark:bg-slate-950">
          <p className="text-xs font-semibold text-amber-600">{t('studentDashboard.expiring')}</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.expiring}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-slate-950">
          <p className="text-xs font-semibold text-red-600">{t('studentDashboard.expired')}</p>
          <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">{stats.expired}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-1 text-sm font-bold text-slate-900 dark:text-slate-100">{t('studentDashboard.tasksTitle')}</h2>
          <p className="mb-4 text-xs text-slate-400">{t('studentDashboard.tasksDesc')}</p>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">{t('common.loading')}</div>
          ) : urgentDocs.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center dark:bg-slate-900">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('studentDashboard.emptyTaskTitle')}</p>
              <p className="mt-1 text-xs text-slate-400">{t('studentDashboard.emptyTaskDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {urgentDocs.map(doc => <DocumentItem key={doc.doc_id} doc={doc} t={t} locale={locale} />)}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('studentDashboard.notifications')}</h2>
              <p className="mt-0.5 text-xs text-slate-400">{t('studentDashboard.notificationsDesc')}</p>
            </div>
            <Bell size={16} className="text-slate-400" />
          </div>
          {notifs.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-slate-900">
              {t('studentDashboard.noNewNotifications')}
            </p>
          ) : (
            <div className="space-y-2">
              {notifs.slice(0, 4).map(item => (
                <div key={item.notif_id} className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/20">
                  <p className="truncate text-xs font-semibold text-amber-900 dark:text-amber-200">{item.doc_title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-amber-700 dark:text-amber-300">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

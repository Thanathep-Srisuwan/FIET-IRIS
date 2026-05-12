import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Bell, CheckCircle2, FileText, FolderOpen, History } from 'lucide-react'
import { documentService, notificationService } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useLanguage } from '../../contexts/LanguageContext'

const statusBadge = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
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
  active: 'status.active',
  expiring_soon: 'status.expiringSoon',
  expired: 'status.expired',
}[status] || status)

function SummaryPill({ label, value, tone }) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  }

  return (
    <div className={`rounded-2xl px-4 py-3 ${tones[tone] || tones.neutral}`}>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-xs font-semibold">{label}</p>
    </div>
  )
}

function DocumentItem({ doc, t, locale }) {
  const status = getStatus(doc)

  return (
    <Link
      to="/documents"
      className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 transition-all hover:border-primary-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
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
      <ArrowRight size={16} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-primary-500" />
    </Link>
  )
}

function EmptyState({ title, desc }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center dark:bg-slate-900">
      <CheckCircle2 size={34} className="mx-auto mb-3 text-emerald-500" />
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{desc}</p>
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const { locale, t } = useLanguage()
  const [docs, setDocs] = useState([])
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
    const expired = docs.filter(doc => getStatus(doc) === 'expired').length
    const expiring = docs.filter(doc => getStatus(doc) === 'expiring_soon').length
    return { total: docs.length, expired, expiring }
  }, [docs])

  const urgentDocs = useMemo(() => (
    docs
      .filter(doc => !doc.no_expire && ['expired', 'expiring_soon'].includes(getStatus(doc)))
      .sort((a, b) => (a.days_remaining ?? 9999) - (b.days_remaining ?? 9999))
      .slice(0, 4)
  ), [docs])

  const nextDoc = urgentDocs[0] || docs.find(doc => !doc.no_expire)
  const hasProblem = stats.expired > 0 || stats.expiring > 0

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">{t('studentDashboard.eyebrow')}</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{t('studentDashboard.greeting', { name: user?.name || '' })}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{t('studentDashboard.intro')}</p>
          </div>
          <Link to="/documents" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
            <FolderOpen size={17} />
            {t('common.openDocuments')}
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className={`rounded-3xl border p-5 shadow-sm dark:border-slate-800 ${hasProblem ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20' : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20'}`}>
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${hasProblem ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'}`}>
              {hasProblem ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {hasProblem ? t('studentDashboard.hasProblemTitle') : t('studentDashboard.noUrgentTitle')}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {hasProblem
                  ? t('studentDashboard.hasProblemDesc', { expired: stats.expired, expiring: stats.expiring })
                  : t('studentDashboard.noProblemDesc')}
              </p>
              {nextDoc && (
                <div className="mt-4 rounded-2xl bg-white/75 p-3 dark:bg-slate-950/50">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('studentDashboard.nextItem')}</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{nextDoc.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{getDueText(nextDoc, t, locale)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-1">
          <SummaryPill label={t('studentDashboard.total')} value={stats.total} tone="neutral" />
          <SummaryPill label={t('studentDashboard.expiring')} value={stats.expiring} tone="amber" />
          <SummaryPill label={t('studentDashboard.expired')} value={stats.expired} tone="red" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('studentDashboard.tasksTitle')}</h2>
              <p className="text-xs text-slate-400">{t('studentDashboard.tasksDesc')}</p>
            </div>
            <Link to="/documents" className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400">{t('studentDashboard.seeInDocuments')}</Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">{t('common.loading')}</div>
          ) : urgentDocs.length === 0 ? (
            <EmptyState title={t('studentDashboard.emptyTaskTitle')} desc={t('studentDashboard.emptyTaskDesc')} />
          ) : (
            <div className="space-y-2">
              {urgentDocs.map(doc => <DocumentItem key={doc.doc_id} doc={doc} t={t} locale={locale} />)}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                <History size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('studentDashboard.versionTitle')}</h2>
                <p className="text-xs text-slate-400">{t('studentDashboard.versionDesc')}</p>
              </div>
            </div>
            <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>1. {t('studentDashboard.stepOpen')}</li>
              <li>2. {t('studentDashboard.stepSelect')}</li>
              <li>3. {t('studentDashboard.stepUpload')}</li>
            </ol>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('studentDashboard.notifications')}</h2>
                <p className="text-xs text-slate-400">{t('studentDashboard.unreadCount', { count: notifs.length })}</p>
              </div>
              <Bell size={18} className="text-slate-400" />
            </div>
            {notifs.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-400 dark:bg-slate-900">{t('studentDashboard.noNewNotifications')}</p>
            ) : (
              <div className="space-y-2">
                {notifs.slice(0, 3).map(item => (
                  <Link key={item.notif_id} to="/documents" className="block rounded-2xl bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
                    <p className="truncate font-semibold text-amber-900 dark:text-amber-200">{item.doc_title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-amber-700 dark:text-amber-300">{item.message}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

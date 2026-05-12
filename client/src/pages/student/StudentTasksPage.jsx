import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, FolderOpen } from 'lucide-react'
import { documentService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'

const getStatus = (doc) => {
  if (doc.no_expire) return 'active'
  if (doc.days_remaining == null) return doc.status
  if (doc.days_remaining < 0) return 'expired'
  if (doc.days_remaining <= 90) return 'expiring_soon'
  return 'active'
}

const formatDate = (value, locale) => value ? new Date(value).toLocaleDateString(locale) : '-'

const dueText = (doc, t, locale) => {
  if (doc.no_expire) return t('common.noExpire')
  if (doc.days_remaining == null) return formatDate(doc.expire_date, locale)
  if (doc.days_remaining < 0) return t('common.overdueDays', { days: Math.abs(doc.days_remaining) })
  return t('common.remainingDays', { days: doc.days_remaining })
}

function TaskCard({ doc, t, locale }) {
  const status = getStatus(doc)
  const isExpired = status === 'expired'

  return (
    <Link to="/documents" className="group block rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-primary-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isExpired ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
          {isExpired ? <AlertTriangle size={20} /> : <Clock size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{doc.title}</p>
            <span className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">{doc.doc_type}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('common.expireDate')} {formatDate(doc.expire_date, locale)} · {dueText(doc, t, locale)}
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('studentTasks.cardDesc')}</p>
        </div>
        <ArrowRight size={17} className="mt-1 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-primary-500" />
      </div>
    </Link>
  )
}

export default function StudentTasksPage() {
  const { locale, t } = useLanguage()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    documentService.getAll({ limit: 100, sort_by: 'expire_date', sort_dir: 'asc' })
      .then(({ data }) => setDocs(data.documents || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tasks = useMemo(() => (
    docs
      .filter(doc => !doc.no_expire && ['expired', 'expiring_soon'].includes(getStatus(doc)))
      .sort((a, b) => (a.days_remaining ?? 9999) - (b.days_remaining ?? 9999))
  ), [docs])

  const expiredCount = tasks.filter(doc => getStatus(doc) === 'expired').length
  const expiringCount = tasks.filter(doc => getStatus(doc) === 'expiring_soon').length

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">{t('studentTasks.eyebrow')}</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{t('studentTasks.title')}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('studentTasks.desc')}</p>
          </div>
          <Link to="/documents" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
            <FolderOpen size={17} />
            {t('common.openDocuments')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-red-50 p-4 text-red-800 dark:bg-red-950/30 dark:text-red-200">
          <p className="text-2xl font-bold">{expiredCount}</p>
          <p className="text-xs font-semibold">{t('studentTasks.expired')}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="text-2xl font-bold">{expiringCount}</p>
          <p className="text-xs font-semibold">{t('studentTasks.expiring')}</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950">{t('common.loading')}</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-950">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500" />
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{t('studentTasks.emptyTitle')}</p>
          <p className="mt-1 text-sm text-slate-400">{t('studentTasks.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(doc => <TaskCard key={doc.doc_id} doc={doc} t={t} locale={locale} />)}
        </div>
      )}
    </div>
  )
}

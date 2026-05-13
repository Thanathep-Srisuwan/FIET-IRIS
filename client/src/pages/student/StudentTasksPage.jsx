import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, CalendarDays, CheckCircle2,
  ChevronLeft, ChevronRight, Clock, FolderOpen, ListTodo,
} from 'lucide-react'
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

// ── Calendar View ────────────────────────────────────────────────────────────
const WEEKDAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function CalendarView({ allDocs }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDay  = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // map: 'YYYY-MM-DD' -> docs[]
  const docsByDate = useMemo(() => {
    const map = {}
    for (const doc of allDocs) {
      if (!doc.expire_date || doc.no_expire) continue
      const key = doc.expire_date.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(doc)
    }
    return map
  }, [allDocs])

  const toKey = (d) => {
    const yy = year
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

  const isToday = (d) => {
    return d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {/* Calendar header */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronLeft size={18} className="text-slate-500" />
        </button>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {MONTHS_TH[month]} {year + 543}
        </p>
        <button onClick={nextMonth} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronRight size={18} className="text-slate-500" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {WEEKDAYS_TH.map((d) => (
          <div key={d} className="py-1 text-[11px] font-bold text-slate-400">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />
          const key  = toKey(d)
          const docs = docsByDate[key] || []
          const hasExpired  = docs.some(doc => getStatus(doc) === 'expired')
          const hasExpiring = docs.some(doc => getStatus(doc) === 'expiring_soon')
          const hasDocs = docs.length > 0

          return (
            <div
              key={d}
              className={`relative flex flex-col items-center rounded-xl py-1.5 ${
                isToday(d) ? 'bg-primary-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <span className={`text-xs font-semibold ${isToday(d) ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                {d}
              </span>
              {hasDocs && (
                <div className="mt-0.5 flex gap-0.5">
                  {hasExpired  && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                  {hasExpiring && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                  {!hasExpired && !hasExpiring && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-red-500" />หมดอายุแล้ว
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-amber-400" />ใกล้หมดอายุ (≤90 วัน)
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />ปกติ
        </div>
      </div>

      {/* Docs expiring this month */}
      {(() => {
        const thisMonthDocs = Object.entries(docsByDate)
          .filter(([k]) => k.startsWith(`${year}-${String(month+1).padStart(2,'0')}`))
          .flatMap(([, docs]) => docs)
          .sort((a, b) => new Date(a.expire_date) - new Date(b.expire_date))

        if (thisMonthDocs.length === 0) return null

        return (
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500">เอกสารในเดือนนี้</p>
            {thisMonthDocs.map(doc => {
              const status = getStatus(doc)
              return (
                <Link key={doc.doc_id} to="/documents" className="flex items-center gap-2 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-900">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${
                    status === 'expired' ? 'bg-red-500' : status === 'expiring_soon' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-300">{doc.title}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{new Date(doc.expire_date).getDate()} {MONTHS_TH[new Date(doc.expire_date).getMonth()]}</span>
                </Link>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StudentTasksPage() {
  const { locale, t } = useLanguage()
  const [docs, setDocs]     = useState([])
  const [allDocs, setAllDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView]     = useState('list') // 'list' | 'calendar'

  useEffect(() => {
    documentService.getAll({ limit: 200, sort_by: 'expire_date', sort_dir: 'asc' })
      .then(({ data }) => {
        const all = data.documents || []
        setAllDocs(all)
        setDocs(all)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tasks = useMemo(() => (
    docs
      .filter(doc => !doc.no_expire && ['expired', 'expiring_soon'].includes(getStatus(doc)))
      .sort((a, b) => (a.days_remaining ?? 9999) - (b.days_remaining ?? 9999))
  ), [docs])

  const expiredCount  = tasks.filter(doc => getStatus(doc) === 'expired').length
  const expiringCount = tasks.filter(doc => getStatus(doc) === 'expiring_soon').length

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">{t('studentTasks.eyebrow')}</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{t('studentTasks.title')}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('studentTasks.desc')}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-xl border border-slate-200 p-0.5 dark:border-slate-700">
              <button
                onClick={() => setView('list')}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  view === 'list'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="มุมมองรายการ"
              >
                <ListTodo size={16} />
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  view === 'calendar'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="มุมมองปฏิทิน"
              >
                <CalendarDays size={16} />
              </button>
            </div>
            <Link
              to="/documents"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <FolderOpen size={17} />
              {t('common.openDocuments')}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
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

      {/* Content */}
      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950">
          {t('common.loading')}
        </div>
      ) : view === 'calendar' ? (
        <CalendarView allDocs={allDocs} />
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

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bell, CheckCircle2, ChevronDown, Clock, FileText, GraduationCap, Loader2, Users, X } from 'lucide-react'
import { documentService, notificationService, userService } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useLanguage } from '../../contexts/LanguageContext'
import { getProgramDisplayName } from '../../constants/programs'

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

function AdviseeModal({ filter, students, onClose }) {
  const { language, locale, t } = useLanguage()
  const [expandedId, setExpandedId] = useState(null)
  const [docsCache, setDocsCache] = useState({})
  const [loadingId, setLoadingId] = useState(null)
  const fetchingRef = useRef(new Set())

  const filtered = useMemo(() => {
    if (!filter || filter === 'all') return students
    if (filter === 'expired') return students.filter(s => s.expired_count > 0)
    if (filter === 'expiring') return students.filter(s => s.expired_count === 0 && s.expiring_count > 0)
    if (filter === 'pending') return students.filter(s => s.pending_count > 0)
    return students
  }, [filter, students])

  const titles = {
    all:      t('advisorAdvisees.totalStudents'),
    expired:  t('advisorAdvisees.withExpired'),
    expiring: t('advisorAdvisees.withExpiring'),
    pending:  t('advisorAdvisees.pendingDocs'),
  }

  const getStudentStatus = (s) => {
    if (s.expired_count > 0) return { label: t('advisorAdvisees.statusExpired'), cls: 'bg-red-50 text-red-700 border-red-200' }
    if (s.expiring_count > 0) return { label: t('advisorAdvisees.statusExpiring'), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    if (s.pending_count > 0) return { label: t('advisorAdvisees.statusPending'), cls: 'bg-sky-50 text-sky-700 border-sky-200' }
    return { label: t('advisorAdvisees.statusOk'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }

  const getDocBadge = (doc) => {
    if (doc.no_expire) return { label: t('status.active'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (doc.days_remaining == null) return { label: doc.status || '-', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
    if (doc.days_remaining < 0) return { label: t('adminDashboard.daysOver', { days: Math.abs(doc.days_remaining) }), cls: 'bg-red-50 text-red-700 border-red-200' }
    if (doc.days_remaining <= 90) return { label: t('adminDashboard.daysLeft', { days: doc.days_remaining }), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    return { label: t('status.active'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }

  const handleToggle = (s) => {
    if (expandedId === s.user_id) { setExpandedId(null); return }
    setExpandedId(s.user_id)
    if (docsCache[s.user_id] || fetchingRef.current.has(s.user_id)) return
    fetchingRef.current.add(s.user_id)
    setLoadingId(s.user_id)
    documentService.getAll({ student_id: s.user_id, limit: 100, sort_by: 'expire_date', sort_dir: 'asc' })
      .then(({ data }) => setDocsCache(prev => ({ ...prev, [s.user_id]: data?.documents || [] })))
      .catch(() => setDocsCache(prev => ({ ...prev, [s.user_id]: [] })))
      .finally(() => { setLoadingId(null); fetchingRef.current.delete(s.user_id) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{titles[filter] || titles.all}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {filtered.length} {t('common.records')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {t('advisorAdvisees.empty')}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(s => {
                const st = getStudentStatus(s)
                const isOpen = expandedId === s.user_id
                const isLoading = loadingId === s.user_id
                const docs = docsCache[s.user_id] || []
                return (
                  <div key={s.user_id}>
                    {/* Student row */}
                    <button
                      type="button"
                      onClick={() => handleToggle(s)}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{s.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {[s.student_id, s.email].filter(Boolean).join(' · ')}
                        </p>
                        {s.program && (
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {getProgramDisplayName(s.program, language)}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
                            {st.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            {s.document_count} {t('advisorAdvisees.docsUnit')}
                          </span>
                        </div>
                        {isLoading
                          ? <Loader2 size={15} className="shrink-0 animate-spin text-slate-400" />
                          : <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        }
                      </div>
                    </button>

                    {/* Document list */}
                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2 py-5 text-xs text-slate-400">
                            <Loader2 size={13} className="animate-spin" />
                            {t('common.loading')}
                          </div>
                        ) : docs.length === 0 ? (
                          <p className="py-5 text-center text-xs text-slate-400">{t('advisorAdvisees.drawerEmpty')}</p>
                        ) : (
                          <ul className="divide-y divide-slate-100 px-5 dark:divide-slate-700/60">
                            {docs.map(doc => {
                              const badge = getDocBadge(doc)
                              return (
                                <li key={doc.doc_id} className="flex items-center gap-3 py-2.5">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{doc.title}</p>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                      <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                        {doc.doc_type}
                                      </span>
                                      {!doc.no_expire && doc.expire_date && (
                                        <span className="text-[11px] text-slate-400">
                                          {new Date(doc.expire_date).toLocaleDateString(locale)}
                                        </span>
                                      )}
                                      {doc.approval_status === 'pending' && (
                                        <span className="rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
                                          {t('advisorAdvisees.statusPending')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                                    {badge.label}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdvisorDashboard() {
  const { user } = useAuthStore()
  const { locale, t } = useLanguage()
  const [docs, setDocs] = useState([])
  const [students, setStudents] = useState([])
  const [adviseeSummary, setAdviseeSummary] = useState(null)
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCard, setActiveCard] = useState(null)

  useEffect(() => {
    Promise.all([
      documentService.getAll({ limit: 10, sort_by: 'expire_date', sort_dir: 'asc' }),
      userService.getMyAdvisees(),
      notificationService.getUnread(),
    ]).then(([d, adv, n]) => {
      setDocs(d.data?.documents || [])
      setStudents(adv.data?.students || [])
      setAdviseeSummary(adv.data?.summary || null)
      setNotifs(n.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const hasUrgent = (adviseeSummary?.with_expired ?? 0) > 0 || (adviseeSummary?.with_expiring ?? 0) > 0

  const getBannerDesc = () => {
    if (!hasUrgent) return t('advisorDashboard.noProblemDesc')
    const expired = adviseeSummary?.with_expired ?? 0
    const expiring = adviseeSummary?.with_expiring ?? 0
    if (expired > 0 && expiring > 0) return t('advisorDashboard.hasProblemDesc', { expired, expiring })
    if (expired > 0) return t('advisorDashboard.hasProblemExpiredOnly', { expired })
    return t('advisorDashboard.hasProblemExpiringOnly', { expiring })
  }

  const toggleCard = (key) => setActiveCard(prev => prev === key ? null : key)

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
              {getBannerDesc()}
            </p>
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { key: 'all',      icon: Users,          label: t('dashboard.adviseeCount'),    value: adviseeSummary?.total ?? 0,              tone: 'slate'  },
          { key: 'expired',  icon: AlertTriangle,  label: t('dashboard.adviseeExpired'),  value: adviseeSummary?.with_expired ?? 0,       tone: 'red'    },
          { key: 'expiring', icon: Clock,          label: t('dashboard.adviseeExpiring'), value: adviseeSummary?.with_expiring ?? 0,      tone: 'amber'  },
          { key: 'pending',  icon: FileText,       label: t('advisorAdvisees.pendingDocs'), value: adviseeSummary?.pending_documents ?? 0, tone: 'blue', hint: t('advisorAdvisees.pendingDocsHint') },
        ].map(({ key, icon: Icon, label, value, tone, hint }) => {
          const tones = {
            slate: { card: 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950', val: 'text-slate-900 dark:text-slate-100', lbl: 'text-slate-500 dark:text-slate-400', hint: 'text-slate-400 dark:text-slate-500', ring: 'ring-2 ring-slate-400' },
            red:   { card: 'border-red-200 bg-white hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-950', val: 'text-red-700 dark:text-red-400', lbl: 'text-red-600 dark:text-red-400', hint: 'text-red-400 dark:text-red-600', ring: 'ring-2 ring-red-400' },
            amber: { card: 'border-amber-200 bg-white hover:bg-amber-50 dark:border-amber-900/50 dark:bg-slate-950', val: 'text-amber-700 dark:text-amber-400', lbl: 'text-amber-600 dark:text-amber-400', hint: 'text-amber-400 dark:text-amber-600', ring: 'ring-2 ring-amber-400' },
            blue:  { card: 'border-primary-200 bg-white hover:bg-primary-50 dark:border-primary-900/50 dark:bg-slate-950', val: 'text-primary-700 dark:text-primary-400', lbl: 'text-primary-600 dark:text-primary-400', hint: 'text-primary-400 dark:text-primary-600', ring: 'ring-2 ring-primary-400' },
          }
          const p = tones[tone] || tones.slate
          const isActive = activeCard === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleCard(key)}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${p.card} ${isActive ? p.ring : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs font-semibold ${p.lbl}`}>{label}</p>
                <Icon size={15} className={`shrink-0 opacity-50`} />
              </div>
              <p className={`mt-1 text-2xl font-bold ${p.val}`}>{value}</p>
              <p className={`mt-1 text-[10px] ${p.hint}`}>
                {hint || t('adminDashboard.clickToView')}
              </p>
            </button>
          )
        })}
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
              to="/documents?panel=advisees"
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
                  to="/documents?panel=advisees"
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

      {activeCard && (
        <AdviseeModal
          filter={activeCard}
          students={students}
          onClose={() => setActiveCard(null)}
        />
      )}
    </div>
  )
}

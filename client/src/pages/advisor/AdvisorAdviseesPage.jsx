import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Clock, FileText, GraduationCap, Search, Users, X, ExternalLink, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { userService, documentService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { getProgramDisplayName } from '../../constants/programs'

const degreeKey = (value) => ({
  master: 'documents.degreeMaster',
  doctoral: 'documents.degreeDoctoral',
}[value] || 'documents.degreeBachelor')

function StatCard({ icon: Icon, label, value, tone = 'slate', onClick, active, hint }) {
  const { t } = useLanguage()
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200',
    red: 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200',
    blue: 'border-primary-200 bg-primary-50 text-primary-800 hover:bg-primary-100 dark:border-primary-900/60 dark:bg-primary-950/20 dark:text-primary-200',
  }
  const activeRing = {
    slate: 'ring-2 ring-slate-400',
    amber: 'ring-2 ring-amber-400',
    red: 'ring-2 ring-red-400',
    blue: 'ring-2 ring-primary-400',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${tones[tone] || tones.slate} ${active ? activeRing[tone] : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-current/70">{label}</p>
        <Icon size={18} className="shrink-0 opacity-70" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-[10px] opacity-60">{hint || t('adminDashboard.clickToView')}</p>
    </button>
  )
}

function StudentDocDrawer({ student, onClose }) {
  const { locale, t } = useLanguage()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student) return
    setLoading(true)
    documentService.getAll({
      student_id: student.user_id,
      limit: 100,
      sort_by: 'expire_date',
      sort_dir: 'asc',
    })
      .then(({ data }) => setDocs(data?.documents || []))
      .catch(() => toast.error(t('advisorAdvisees.loadError')))
      .finally(() => setLoading(false))
  }, [student, t])

  const getDocStatus = (doc) => {
    if (doc.no_expire) return { label: t('status.active'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', days: null }
    if (doc.days_remaining == null) return { label: doc.status, cls: 'bg-slate-100 text-slate-600 border-slate-200', days: null }
    if (doc.days_remaining < 0) return {
      label: t('adminDashboard.daysOver', { days: Math.abs(doc.days_remaining) }),
      cls: 'bg-red-50 text-red-700 border-red-200', days: doc.days_remaining,
    }
    if (doc.days_remaining <= 90) return {
      label: t('adminDashboard.daysLeft', { days: doc.days_remaining }),
      cls: 'bg-amber-50 text-amber-700 border-amber-200', days: doc.days_remaining,
    }
    return { label: t('status.active'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', days: doc.days_remaining }
  }

  const studentStatus = (() => {
    if (!student) return null
    if (student.expired_count > 0) return { label: t('advisorAdvisees.statusExpired'), cls: 'bg-red-50 text-red-700 border-red-200' }
    if (student.expiring_count > 0) return { label: t('advisorAdvisees.statusExpiring'), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    if (student.pending_count > 0) return { label: t('advisorAdvisees.statusPending'), cls: 'bg-sky-50 text-sky-700 border-sky-200' }
    return { label: t('advisorAdvisees.statusOk'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  })()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900">

        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                {t('advisorAdvisees.drawerEyebrow')}
              </p>
              <h2 className="mt-1 truncate text-base font-bold text-slate-900 dark:text-slate-100">
                {student.name}
              </h2>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {[student.student_id, student.email].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <GraduationCap size={12} />
              {t(degreeKey(student.degree_level))}
            </span>
            {studentStatus && (
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${studentStatus.cls}`}>
                {studentStatus.label}
              </span>
            )}
            <span className="text-xs text-slate-400">
              {t('advisorAdvisees.drawerDocCount', { count: student.document_count || 0 })}
            </span>
          </div>
        </div>

        {/* Doc list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              {t('common.loading')}
            </div>
          ) : docs.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
              <FileText size={28} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400">{t('advisorAdvisees.drawerEmpty')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {docs.map(doc => {
                const s = getDocStatus(doc)
                return (
                  <li key={doc.doc_id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {doc.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                            {doc.doc_type}
                          </span>
                          {!doc.no_expire && doc.expire_date && (
                            <span className="text-[11px] text-slate-400">
                              {new Date(doc.expire_date).toLocaleDateString(locale)}
                            </span>
                          )}
                          {doc.approval_status === 'pending' && (
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
                              {t('advisorAdvisees.statusPending')}
                            </span>
                          )}
                          {doc.approval_status === 'approved' && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                              {t('advisorAdvisees.statusApproved')}
                            </span>
                          )}
                          {doc.approval_status === 'rejected' && (
                            <span
                              className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                              title={doc.approval_note || ''}
                            >
                              {t('advisorAdvisees.statusRejected')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
                        {s.label}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <a
            href={`/documents?panel=advisees&search=${encodeURIComponent(student.student_id || student.name)}`}
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 py-2.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-900/50 dark:bg-primary-950/20 dark:text-primary-300 dark:hover:bg-primary-950/40"
          >
            <ExternalLink size={15} />
            {t('advisorAdvisees.drawerOpenFull')}
          </a>
        </div>
      </div>
    </>
  )
}

export default function AdvisorAdviseesPage() {
  const { language, locale, t } = useLanguage()
  const [searchParams] = useSearchParams()
  const [students, setStudents] = useState([])
  const [summary, setSummary] = useState(null)
  const [query, setQuery] = useState('')
  const [degree, setDegree] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') || null)
  const [loading, setLoading] = useState(true)
  const [drawerStudent, setDrawerStudent] = useState(null)

  useEffect(() => {
    const s = searchParams.get('status') || null
    setStatus(s)
  }, [searchParams])

  useEffect(() => {
    userService.getMyAdvisees()
      .then(({ data }) => {
        setStudents(data.students || [])
        setSummary(data.summary || null)
      })
      .catch(() => toast.error(t('advisorAdvisees.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter(student => {
      const text = [student.name, student.email, student.student_id, student.program].filter(Boolean).join(' ').toLowerCase()
      const matchesQuery = !q || text.includes(q)
      const matchesDegree = !degree || (student.degree_level || 'bachelor') === degree
      const matchesStatus = !status
        || (status === 'expired' && student.expired_count > 0)
        || (status === 'expiring' && student.expired_count === 0 && student.expiring_count > 0)
        || (status === 'pending' && student.pending_count > 0)
        || (status === 'ok' && student.expired_count === 0 && student.expiring_count === 0 && student.pending_count === 0)
      return matchesQuery && matchesDegree && matchesStatus
    })
  }, [students, query, degree, status])

  const getStatus = (student) => {
    if (student.expired_count > 0) return { label: t('advisorAdvisees.statusExpired'), cls: 'bg-red-50 text-red-700 border-red-200' }
    if (student.expiring_count > 0) return { label: t('advisorAdvisees.statusExpiring'), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    if (student.pending_count > 0) return { label: t('advisorAdvisees.statusPending'), cls: 'bg-sky-50 text-sky-700 border-sky-200' }
    return { label: t('advisorAdvisees.statusOk'), cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }

  return (
    <div className="max-w-7xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
          {t('advisorAdvisees.eyebrow')}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t('advisorAdvisees.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('advisorAdvisees.desc')}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label={t('advisorAdvisees.totalStudents')} value={summary?.total || 0} tone="slate"
          onClick={() => setStatus(null)} active={status === null} />
        <StatCard icon={AlertTriangle} label={t('advisorAdvisees.withExpired')} value={summary?.with_expired || 0} tone="red"
          onClick={() => setStatus(s => s === 'expired' ? null : 'expired')} active={status === 'expired'} />
        <StatCard icon={Clock} label={t('advisorAdvisees.withExpiring')} value={summary?.with_expiring || 0} tone="amber"
          onClick={() => setStatus(s => s === 'expiring' ? null : 'expiring')} active={status === 'expiring'} />
        <StatCard icon={FileText} label={t('advisorAdvisees.pendingDocs')} value={summary?.pending_documents || 0} tone="blue"
          onClick={() => setStatus(s => s === 'pending' ? null : 'pending')} active={status === 'pending'}
          hint={t('advisorAdvisees.pendingDocsHint')} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field w-full pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('advisorAdvisees.searchPlaceholder')}
            />
          </div>
          <select className="input-field w-full lg:w-48" value={degree} onChange={(e) => setDegree(e.target.value)}>
            <option value="">{t('documents.filterAllDegrees')}</option>
            <option value="bachelor">{t('documents.degreeBachelor')}</option>
            <option value="master">{t('documents.degreeMaster')}</option>
            <option value="doctoral">{t('documents.degreeDoctoral')}</option>
          </select>
          <select className="input-field w-full lg:w-48" value={status || ''} onChange={(e) => setStatus(e.target.value || null)}>
            <option value="">{t('advisorAdvisees.allStatuses')}</option>
            <option value="expired">{t('advisorAdvisees.statusExpired')}</option>
            <option value="expiring">{t('advisorAdvisees.statusExpiring')}</option>
            <option value="pending">{t('advisorAdvisees.statusPending')}</option>
            <option value="ok">{t('advisorAdvisees.statusOk')}</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '860px' }}>
            <thead className="bg-slate-50 text-left dark:bg-slate-900">
              <tr>
                {[t('advisorAdvisees.colStudent'), t('advisorAdvisees.colDegree'), t('advisorAdvisees.colProgram'), t('advisorAdvisees.colDocuments'), t('advisorAdvisees.colStatus'), t('advisorAdvisees.colUpdated'), ''].map((head) => (
                  <th key={head} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="py-14 text-center text-sm text-slate-400">{t('common.loading')}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-14 text-center text-sm text-slate-400">{t('advisorAdvisees.empty')}</td></tr>
              ) : filtered.map(student => {
                const statusInfo = getStatus(student)
                return (
                  <tr
                    key={student.user_id}
                    className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                    onClick={() => setDrawerStudent(student)}
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {student.student_id || '-'} · {student.email}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <GraduationCap size={13} />
                        {t(degreeKey(student.degree_level))}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      {student.program ? getProgramDisplayName(student.program, language) : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{student.document_count}</span>
                      <span className="mx-1">{t('advisorAdvisees.docsUnit')}</span>
                      {(student.expired_count > 0 || student.expiring_count > 0) && (
                        <span className="text-amber-600">
                          ({student.expired_count}/{student.expiring_count})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {student.last_document_at ? new Date(student.last_document_at).toLocaleDateString(locale) : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
                        {t('advisorAdvisees.openDocuments')}
                        <ChevronRight size={13} />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {drawerStudent && (
        <StudentDocDrawer
          student={drawerStudent}
          onClose={() => setDrawerStudent(null)}
        />
      )}
    </div>
  )
}

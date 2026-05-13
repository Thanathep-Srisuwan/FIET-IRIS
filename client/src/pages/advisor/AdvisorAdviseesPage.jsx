import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, FileText, GraduationCap, Search, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { userService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { getProgramDisplayName } from '../../constants/programs'

const degreeKey = (value) => ({
  master: 'documents.degreeMaster',
  doctoral: 'documents.degreeDoctoral',
}[value] || 'documents.degreeBachelor')

function StatCard({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200',
    red: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200',
    blue: 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-900/60 dark:bg-primary-950/20 dark:text-primary-200',
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone] || tones.slate}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-current/70">{label}</p>
        <Icon size={18} className="shrink-0 opacity-70" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

export default function AdvisorAdviseesPage() {
  const { language, locale, t } = useLanguage()
  const [students, setStudents] = useState([])
  const [summary, setSummary] = useState(null)
  const [query, setQuery] = useState('')
  const [degree, setDegree] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
        <Link
          to="/documents"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <FileText size={16} />
          {t('advisorAdvisees.viewDocuments')}
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label={t('advisorAdvisees.totalStudents')} value={summary?.total || 0} tone="slate" />
        <StatCard icon={AlertTriangle} label={t('advisorAdvisees.withExpired')} value={summary?.with_expired || 0} tone="red" />
        <StatCard icon={Clock} label={t('advisorAdvisees.withExpiring')} value={summary?.with_expiring || 0} tone="amber" />
        <StatCard icon={FileText} label={t('advisorAdvisees.pendingDocs')} value={summary?.pending_documents || 0} tone="blue" />
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
          <select className="input-field w-full lg:w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
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
                  <tr key={student.user_id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
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
                      <Link
                        to={`/documents?search=${encodeURIComponent(student.student_id || student.name)}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-950/30"
                      >
                        {t('advisorAdvisees.openDocuments')}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

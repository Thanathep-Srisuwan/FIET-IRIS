import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { documentService, notificationService } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useLanguage } from '../../contexts/LanguageContext'

const statusColor = {
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border border-amber-200',
  expired: 'bg-red-50 text-red-600 border border-red-200',
}

function StatCard({ label, value, color }) {
  const palette = {
    blue: { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', val: '#0c4a6e' },
    orange: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', val: '#7c2d12' },
    red: { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', val: '#881337' },
    green: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', val: '#14532d' },
  }
  const p = palette[color] || palette.blue
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: p.bg, borderColor: p.border }}>
      <p className="mb-1 text-3xl font-bold" style={{ color: p.val }}>{value ?? '0'}</p>
      <p className="text-sm font-medium" style={{ color: p.text }}>{label}</p>
    </div>
  )
}

const statusKey = (status) => ({
  active: 'status.active',
  expiring_soon: 'status.expiringSoon',
  expired: 'status.expired',
}[status] || status)

export default function AdvisorDashboard() {
  const { user } = useAuthStore()
  const { locale, t } = useLanguage()
  const [docs, setDocs] = useState([])
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      documentService.getAll({ limit: 10 }),
      notificationService.getUnread(),
    ]).then(([d, n]) => {
      setDocs(d.data?.documents || [])
      setNotifs(n.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const total = docs.length
  const active = docs.filter(d => d.status === 'active').length
  const expiringSoon = docs.filter(d => d.status === 'expiring_soon').length
  const expired = docs.filter(d => d.status === 'expired').length
  const isStaff = user?.role === 'staff'

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-widest" style={{ color: '#42b5e1' }}>
          {isStaff ? t('dashboard.staffEyebrow') : t('dashboard.advisorEyebrow')}
        </p>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('dashboard.greeting', { name: user?.name || '' })}</h1>
        <p className="mt-0.5 text-sm text-slate-400">{isStaff ? t('dashboard.staffIntro') : t('dashboard.advisorIntro')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t('dashboard.allDocuments')} value={total} color="blue" />
        <StatCard label={t('dashboard.activeDocuments')} value={active} color="green" />
        <StatCard label={t('dashboard.expiringDocuments')} value={expiringSoon} color="orange" />
        <StatCard label={t('dashboard.expiredDocuments')} value={expired} color="red" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {isStaff ? t('dashboard.recentDocsTitle') : t('dashboard.advisorDocsTitle')}
            </h2>
            <Link to="/documents" className="text-xs font-medium" style={{ color: '#42b5e1' }}>{t('common.viewAll')} →</Link>
          </div>
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">{t('common.loading')}</div>
          ) : docs.length === 0 ? (
            <div className="py-16 text-center">
              <p className="mb-3 text-4xl text-slate-300">○</p>
              <p className="text-sm text-slate-400">{t('common.noDocuments')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '480px' }}>
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {[t('dashboard.tableName'), t('dashboard.tableType'), t('dashboard.tableExpire'), t('dashboard.tableStatus')].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {docs.map(doc => (
                    <tr key={doc.doc_id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="max-w-[180px] truncate px-6 py-3.5 font-medium text-slate-700 dark:text-slate-200">{doc.title}</td>
                      <td className="px-6 py-3.5">
                        <span className="rounded px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>{doc.doc_type}</span>
                      </td>
                      <td className="px-6 py-3.5 text-xs tabular-nums text-slate-500">
                        {doc.no_expire ? <span className="italic text-slate-400">{t('common.noExpire')}</span> : doc.expire_date ? new Date(doc.expire_date).toLocaleDateString(locale) : '-'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[doc.status] || 'bg-slate-100 text-slate-500'}`}>
                          {t(statusKey(doc.status))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('dashboard.notifications')}</h2>
            {notifs.length > 0 && <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: '#f7924a' }}>{notifs.length}</span>}
          </div>
          {notifs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-2 text-3xl text-slate-300">○</p>
              <p className="text-xs text-slate-400">{t('common.noNotifications')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifs.slice(0, 6).map(n => (
                <Link key={n.notif_id} to="/documents" className="block rounded-lg border p-3 text-xs transition-shadow hover:shadow-md" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                  <p className="truncate font-semibold text-amber-800">{n.doc_title}</p>
                  <p className="mt-0.5 text-amber-600">{n.message}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { executiveService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'

const MONTHS = {
  th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

function StatCard({ label, value, color, sub }) {
  const palette = {
    blue: { bg: '#f0f9ff', border: '#bae6fd', val: '#0c4a6e', text: '#0369a1' },
    orange: { bg: '#fff7ed', border: '#fed7aa', val: '#7c2d12', text: '#c2410c' },
    red: { bg: '#fff1f2', border: '#fecdd3', val: '#881337', text: '#be123c' },
    green: { bg: '#f0fdf4', border: '#bbf7d0', val: '#14532d', text: '#15803d' },
    slate: { bg: '#f8fafc', border: '#e2e8f0', val: '#1e293b', text: '#475569' },
  }
  const p = palette[color] || palette.slate
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: p.bg, borderColor: p.border }}>
      <p className="mb-1 text-3xl font-bold" style={{ color: p.val }}>{value ?? '0'}</p>
      <p className="text-sm font-medium" style={{ color: p.text }}>{label}</p>
      {sub && <p className="mt-0.5 text-xs" style={{ color: p.text, opacity: 0.7 }}>{sub}</p>}
    </div>
  )
}

export default function ExecutiveDashboard() {
  const { language, locale, t } = useLanguage()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    executiveService.getOverview()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-slate-400">{t('common.loading')}</p>
    </div>
  )

  const { stats, users, trend, topExpiring } = data || {}
  const maxTrend = Math.max(...(trend?.map(item => item.count) || [1]), 1)
  const today = new Date().toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-widest" style={{ color: '#42b5e1' }}>{t('executive.eyebrow')}</p>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('executive.overviewTitle')}</h1>
        <p className="mt-0.5 text-sm text-slate-400">{t('executive.dataAsOf', { date: today })}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t('dashboard.allDocuments')} value={stats?.total_docs} color="blue" />
        <StatCard label={t('dashboard.activeDocuments')} value={stats?.active} color="green" />
        <StatCard label={t('dashboard.expiringDocuments')} value={stats?.expiring_soon} color="orange" />
        <StatCard label={t('dashboard.expiredDocuments')} value={stats?.expired} color="red" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
          <h2 className="mb-5 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('executive.uploadTrend')}</h2>
          {trend?.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-300">{t('executive.noTrendData')}</div>
          ) : (
            <div className="flex h-40 items-end gap-3">
              {trend?.map((item, index) => {
                const month = MONTHS[language]?.[parseInt(item.month?.split('-')[1]) - 1] || item.month
                const height = Math.max((item.count / maxTrend) * 100, 4)
                return (
                  <div key={index} className="flex flex-1 flex-col items-center gap-1">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.count}</p>
                    <div className="w-full rounded-t-lg transition-all duration-500" style={{ height: `${height}%`, backgroundColor: '#42b5e1', opacity: 0.85 }} />
                    <p className="text-xs text-slate-400">{month}</p>
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-4 flex gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="h-3 w-3 rounded" style={{ backgroundColor: '#42b5e1' }} />
              RI {stats?.ri_count} {t('executive.copies')}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="h-3 w-3 rounded" style={{ backgroundColor: '#f7924a' }} />
              IRB {stats?.irb_count} {t('executive.copies')}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('executive.systemUsers')}</h2>
            <div className="space-y-3">
              {[
                { label: t('executive.students'), value: users?.students, color: '#42b5e1' },
                { label: t('executive.advisors'), value: users?.advisors, color: '#10b981' },
              ].map(item => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{item.label}</span>
                    <span className="tabular-nums text-slate-400">{item.value || 0} {t('executive.people')}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(((item.value || 0) / Math.max(users?.total_users || 1, 1)) * 100, 100)}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-xs text-slate-400">{t('executive.totalUsers', { count: users?.total_users || 0 })}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('executive.expiringBranches')}</h2>
            {!topExpiring?.length ? (
              <p className="py-4 text-center text-xs text-slate-400">{t('executive.noExpiringBranches')}</p>
            ) : (
              <div className="space-y-2">
                {topExpiring.map((item, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg p-2.5" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                    <p className="max-w-[160px] truncate text-xs font-medium text-amber-800">{item.department || t('executive.unspecifiedBranch')}</p>
                    <span className="ml-2 flex-shrink-0 text-xs font-bold text-amber-700">{item.expiring_count} {t('executive.copies')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('executive.docTypeRatio')}</h2>
        <div className="grid grid-cols-2 gap-6">
          {[
            { label: 'RI', count: stats?.ri_count, color: '#42b5e1', bg: '#f0f9ff' },
            { label: 'IRB', count: stats?.irb_count, color: '#f7924a', bg: '#fff7ed' },
          ].map(item => {
            const percent = stats?.total_docs ? Math.round(((item.count || 0) / stats.total_docs) * 100) : 0
            return (
              <div key={item.label} className="flex items-center gap-4 rounded-xl p-4" style={{ backgroundColor: item.bg }}>
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: item.color }}>
                  {item.label}
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{item.count || 0}</p>
                  <p className="text-sm text-slate-500">{t('executive.certificateLabel', { type: item.label })}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{t('executive.percentOfTotal', { percent })}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

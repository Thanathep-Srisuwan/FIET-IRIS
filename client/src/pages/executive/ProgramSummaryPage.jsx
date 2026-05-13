import { useEffect, useState } from 'react'
import { executiveService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { getProgramDisplayName } from '../../constants/programs'

const statusColor = {
  active:        { bg: '#f0fdf4', text: '#15803d' },
  expiring_soon: { bg: '#fffbeb', text: '#b45309' },
  expired:       { bg: '#fff1f2', text: '#be123c' },
}

export default function ProgramSummaryPage() {
  const { language, t } = useLanguage()
  const [programs, setPrograms] = useState([])
  const [loading, setLoading]   = useState(true)
  const [sortBy, setSortBy]     = useState('total_docs')

  useEffect(() => {
    executiveService.getPrograms()
      .then(r => setPrograms(r.data.programs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...programs].sort((a, b) => b[sortBy] - a[sortBy])
  const maxDocs = Math.max(...sorted.map(b => b.total_docs), 1)

  const exportCSV = () => {
    const header = [
      t('executive.csvHeaderProgram'),
      t('executive.csvHeaderStudents'),
      t('executive.csvHeaderTotal'),
      t('executive.csvHeaderActive'),
      t('executive.csvHeaderExpiring'),
      t('executive.csvHeaderExpired'),
      'RI', 'IRB',
    ].join(',')
    const rows = sorted.map(b =>
      `"${getProgramDisplayName(b.program, language) || t('executive.unspecifiedProgram')}",${b.user_count},${b.total_docs},${b.active},${b.expiring_soon},${b.expired},${b.ri_count},${b.irb_count}`
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = 'FIET-IRIS_program_summary.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const sortOptions = [
    { key: 'total_docs',    label: t('executive.programSortTotal') },
    { key: 'expiring_soon', label: t('executive.programSortExpiring') },
    { key: 'expired',       label: t('executive.programSortExpired') },
    { key: 'user_count',    label: t('executive.programSortStudents') },
  ]

  const legendItems = [
    ['#10b981', t('executive.programColActive')],
    ['#f59e0b', t('executive.programColExpiring')],
    ['#ef4444', t('executive.programColExpired')],
  ]

  const tableHeaders = [
    t('executive.programColProgram'),
    t('executive.programColStudents'),
    t('executive.programColTotal'),
    t('executive.programColActive'),
    t('executive.programColExpiring'),
    t('executive.programColExpired'),
    'RI', 'IRB',
  ]

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>
            {t('executive.eyebrow')}
          </p>
          <h1 className="text-2xl font-bold text-slate-800">{t('executive.programSummaryTitle')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{t('executive.programSummaryDesc')}</p>
        </div>
        <button onClick={exportCSV}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-all">
          ⬇ Export CSV
        </button>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500">{t('executive.programSortBy')}</p>
        {sortOptions.map(s => (
          <button key={s.key}
            onClick={() => setSortBy(s.key)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: sortBy === s.key ? '#42b5e1' : '#f1f5f9',
              color: sortBy === s.key ? '#fff' : '#64748b',
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-5">{t('executive.programBarTitle')}</h2>
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">{t('common.loading')}</div>
        ) : (
          <div className="space-y-3">
            {sorted.map((b, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 truncate max-w-[280px]">
                    {getProgramDisplayName(b.program, language) || t('executive.unspecifiedProgram')}
                  </span>
                  <span className="text-slate-400 tabular-nums ml-2">
                    {t('executive.programDocs', { count: b.total_docs })}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full transition-all duration-700"
                    style={{ width: `${(b.active / maxDocs) * 100}%`, backgroundColor: '#10b981' }} />
                  <div className="h-full transition-all duration-700"
                    style={{ width: `${(b.expiring_soon / maxDocs) * 100}%`, backgroundColor: '#f59e0b' }} />
                  <div className="h-full transition-all duration-700"
                    style={{ width: `${(b.expired / maxDocs) * 100}%`, backgroundColor: '#ef4444' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100">
          {legendItems.map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: c }} />{l}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '650px' }}>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {tableHeaders.map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">{t('common.loading')}</td></tr>
              ) : sorted.map((b, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-700 max-w-[200px] truncate">
                    {getProgramDisplayName(b.program, language) || <span className="text-slate-400 italic">{t('executive.unspecifiedProgram')}</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-600 tabular-nums">{b.user_count}</td>
                  <td className="px-4 py-3.5 text-center font-semibold text-slate-700 tabular-nums">{b.total_docs}</td>
                  <td className="px-4 py-3.5 text-center tabular-nums">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{ backgroundColor: statusColor.active.bg, color: statusColor.active.text }}>
                      {b.active}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center tabular-nums">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{ backgroundColor: statusColor.expiring_soon.bg, color: statusColor.expiring_soon.text }}>
                      {b.expiring_soon}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center tabular-nums">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{ backgroundColor: statusColor.expired.bg, color: statusColor.expired.text }}>
                      {b.expired}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-500 tabular-nums text-xs">{b.ri_count}</td>
                  <td className="px-4 py-3.5 text-center text-slate-500 tabular-nums text-xs">{b.irb_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

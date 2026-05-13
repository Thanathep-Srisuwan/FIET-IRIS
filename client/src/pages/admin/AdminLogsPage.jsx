import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useLanguage } from '../../contexts/LanguageContext'

const reasonColor = {
  auto_expired: 'bg-red-50 text-red-600 border border-red-200',
  manual_admin: 'bg-amber-50 text-amber-700 border border-amber-200',
  replaced_by_new: 'bg-blue-50 text-blue-700 border border-blue-200',
}

const reasonKey = {
  auto_expired: 'adminLogs.autoExpired',
  manual_admin: 'adminLogs.manualAdmin',
  replaced_by_new: 'adminLogs.replacedByNew',
}

export default function AdminLogsPage() {
  const { locale, t } = useLanguage()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/logs/deletions', { params: { search: debouncedSearch, reason } })
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch {
      toast.error(t('adminLogs.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, reason, t])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const reasonLabel = (value) => t(reasonKey[value] || value)
  const autoCount = logs.filter(item => item.reason === 'auto_expired').length
  const manualCount = logs.filter(item => item.reason === 'manual_admin').length

  const exportCSV = () => {
    const header = [
      t('common.documentName'),
      t('adminLogs.documentOwner'),
      t('adminLogs.fileName'),
      t('adminLogs.reason'),
      t('adminLogs.deletedBy'),
      t('adminLogs.deletedAt'),
    ].join(',')
    const rows = logs.map(item => [
      item.doc_title,
      item.owner_email,
      item.original_file_name,
      reasonLabel(item.reason),
      item.deleted_by_name || t('adminLogs.system'),
      new Date(item.deleted_at).toLocaleString(locale),
    ].map(value => `"${String(value || '').replaceAll('"', '""')}"`).join(','))
    const blob = new Blob(['\ufeff' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'deletion_logs.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest" style={{ color: '#42b5e1' }}>{t('roles.admin')}</p>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('adminLogs.title')}</h1>
          <p className="mt-0.5 text-sm text-slate-400">{t('adminLogs.totalLine', { count: total })}</p>
        </div>
        <button onClick={exportCSV} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-all hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900">
          {t('adminLogs.exportCsv')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: t('common.total'), value: total, bg: '#f0f9ff', border: '#bae6fd', val: '#0c4a6e', text: '#0369a1' },
          { label: t('adminLogs.autoExpired'), value: autoCount, bg: '#fff1f2', border: '#fecdd3', val: '#881337', text: '#be123c' },
          { label: t('adminLogs.manualAdmin'), value: manualCount, bg: '#fffbeb', border: '#fde68a', val: '#78350f', text: '#b45309' },
        ].map(card => (
          <div key={card.label} className="rounded-xl border p-5" style={{ backgroundColor: card.bg, borderColor: card.border }}>
            <p className="mb-1 text-3xl font-bold" style={{ color: card.val }}>{card.value}</p>
            <p className="text-sm font-medium" style={{ color: card.text }}>{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input className="input-field w-full sm:max-w-xs" placeholder={t('adminLogs.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field w-full sm:max-w-[220px]" value={reason} onChange={e => setReason(e.target.value)}>
          <option value="">{t('adminLogs.allReasons')}</option>
          <option value="auto_expired">{t('adminLogs.autoExpired')}</option>
          <option value="manual_admin">{t('adminLogs.manualAdmin')}</option>
          <option value="replaced_by_new">{t('adminLogs.replacedByNew')}</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '700px' }}>
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <tr>
                {[t('common.documentName'), t('adminLogs.documentOwner'), t('adminLogs.fileName'), t('adminLogs.reason'), t('adminLogs.deletedBy'), t('adminLogs.deletedAt')].map(header => (
                  <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-slate-400">{t('common.loading')}</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <p className="mb-3 text-4xl text-slate-300">○</p>
                    <p className="text-sm text-slate-400">{t('adminLogs.empty')}</p>
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.log_id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
                  <td className="max-w-[200px] truncate px-4 py-3.5 font-medium text-slate-800 dark:text-slate-100">{log.doc_title}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{log.owner_email}</td>
                  <td className="max-w-[160px] truncate px-4 py-3.5 text-xs text-slate-500">{log.original_file_name}</td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${reasonColor[log.reason] || 'bg-slate-100 text-slate-500'}`}>{reasonLabel(log.reason)}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{log.deleted_by_name || <span className="italic text-slate-400">{t('adminLogs.system')}</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs tabular-nums text-slate-500">{new Date(log.deleted_at).toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

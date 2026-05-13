import { useCallback, useEffect, useState } from 'react'
import { adminService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import toast from 'react-hot-toast'
import { Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import useDebouncedValue from '../../hooks/useDebouncedValue'

const ACTION_COLORS = {
  create:      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900',
  update:      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900',
  delete:      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900',
  send_email:  'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900',
  bulk_update: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900',
}

const ENTITY_COLORS = {
  doc_type:       'bg-primary-50 text-primary-700 border-primary-100 dark:bg-primary-950/30 dark:text-primary-300 dark:border-primary-900',
  category:       'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900',
  announcement:   'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900',
  setting:        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  email_template: 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900',
  user:           'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900',
}

const LIMIT = 50

export default function AdminActivityPage() {
  const { t, locale } = useLanguage()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await adminService.getActivityLogs({
        page,
        limit: LIMIT,
        search: debouncedSearch || undefined,
        action: filterAction || undefined,
        entity_type: filterEntity || undefined,
      })
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch {
      toast.error(t('adminActivity.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, filterAction, filterEntity, t])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => { setPage(1) }, [debouncedSearch, filterAction, filterEntity])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const formatDate = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleString(locale, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  const actionLabel = (action) => t(`adminActivity.action_${action}`) || action
  const entityLabel = (entity) => t(`adminActivity.entity_${entity}`) || entity

  return (
    <div className="max-w-7xl space-y-5">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">{t('roles.admin')}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('adminActivity.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('adminActivity.desc')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-w-[160px]">
          <p className="text-xs font-semibold text-slate-400">{t('adminActivity.totalLabel')}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{total.toLocaleString()}</p>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('adminActivity.searchPlaceholder')}
            className="input-field pl-9 text-sm py-2"
          />
        </div>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="input-field text-sm py-2 w-full sm:w-44 shrink-0"
        >
          <option value="">{t('adminActivity.allActions')}</option>
          <option value="create">{t('adminActivity.action_create')}</option>
          <option value="update">{t('adminActivity.action_update')}</option>
          <option value="delete">{t('adminActivity.action_delete')}</option>
          <option value="send_email">{t('adminActivity.action_send_email')}</option>
        </select>
        <select
          value={filterEntity}
          onChange={e => setFilterEntity(e.target.value)}
          className="input-field text-sm py-2 w-full sm:w-44 shrink-0"
        >
          <option value="">{t('adminActivity.allEntities')}</option>
          <option value="doc_type">{t('adminActivity.entity_doc_type')}</option>
          <option value="category">{t('adminActivity.entity_category')}</option>
          <option value="announcement">{t('adminActivity.entity_announcement')}</option>
          <option value="setting">{t('adminActivity.entity_setting')}</option>
          <option value="email_template">{t('adminActivity.entity_email_template')}</option>
          <option value="user">{t('adminActivity.entity_user')}</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">{t('common.loading')}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto mb-4 flex items-center justify-center text-slate-400">
              <Activity size={32} />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('adminActivity.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '720px' }}>
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  {[t('adminActivity.colWhen'), t('adminActivity.colWho'), t('adminActivity.colAction'), t('adminActivity.colEntity'), t('adminActivity.colLabel')].map((h, i) => (
                    <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map(log => (
                  <tr key={log.log_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{log.admin_name || '—'}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${ACTION_COLORS[log.action] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {log.entity_type && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${ENTITY_COLORS[log.entity_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {entityLabel(log.entity_type)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300 max-w-xs">
                      <p className="truncate text-sm">{log.entity_label || '—'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {t('adminActivity.pageInfo', { page, total: totalPages })}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

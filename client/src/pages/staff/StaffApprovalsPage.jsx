import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2, CheckSquare, ChevronDown, ClipboardList, ExternalLink,
  History, Loader2, RotateCcw, Search, Square, ThumbsDown, ThumbsUp, X, XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { documentService, staffService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'

const PAGE_SIZE = 20

const approvalColor = {
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50',
  rejected:  'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50',
}

const formatDate = (value, locale) =>
  value ? new Date(value).toLocaleDateString(locale) : '-'

function BatchActionBar({ count, onApprove, onReject, onClear, t }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 dark:border-primary-800/50 dark:bg-primary-950/20">
      <span className="text-sm font-semibold text-primary-800 dark:text-primary-200 flex-1">
        {t('staffApprovals.selected', { count })}
      </span>
      <button
        onClick={onApprove}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        <ThumbsUp size={13} />
        {t('staffApprovals.batchApprove')}
      </button>
      <button
        onClick={onReject}
        className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
      >
        <ThumbsDown size={13} />
        {t('staffApprovals.batchReject')}
      </button>
      <button
        onClick={onClear}
        className="rounded-lg p-1.5 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/30"
      >
        <X size={15} />
      </button>
    </div>
  )
}

function ConfirmModal({ mode, count, onClose, onConfirm, t }) {
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(false)
  const isReject = mode === 'reject'

  const handleConfirm = async () => {
    if (isReject && !note.trim()) { toast.error(t('staffApprovals.rejectNoteRequired')); return }
    setLoading(true)
    await onConfirm(note.trim() || null)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {isReject
              ? t('staffApprovals.confirmRejectTitle', { count })
              : t('staffApprovals.confirmApproveTitle', { count })}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {isReject ? t('staffApprovals.confirmRejectDesc') : t('staffApprovals.confirmApproveDesc')}
          </p>
          {isReject && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('staffApprovals.rejectNoteLabel')}
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder={t('staffApprovals.rejectNotePlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          )}
          {!isReject && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('documents.approvalNotePrefix')}
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder={t('documents.approvalApproveNotePlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                isReject ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isReject ? t('staffApprovals.btnConfirmReject') : t('staffApprovals.btnConfirmApprove')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── History tab ──────────────────────────────────────────────────────────────
function HistoryTab({ t, locale }) {
  const [history, setHistory]     = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [statusFilter, setStatus] = useState('')

  const fetchHistory = useCallback(async (pg = 1, reset = false) => {
    setLoading(true)
    try {
      const params = { page: pg, limit: PAGE_SIZE }
      if (statusFilter) params.status = statusFilter
      const { data } = await staffService.getHistory(params)
      if (reset || pg === 1) {
        setHistory(data?.data || [])
      } else {
        setHistory(prev => [...prev, ...(data?.data || [])])
      }
      setTotal(data?.total || 0)
      setPage(pg)
    } catch {
      toast.error(t('staffApprovals.toastError'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, t])

  useEffect(() => {
    fetchHistory(1, true)
  }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasMore = history.length < total

  return (
    <div className="space-y-4">
      {/* Status filter pills */}
      <div className="flex items-center gap-2">
        {[
          { value: '',         label: t('staffApprovals.historyFilterAll') },
          { value: 'approved', label: t('staffApprovals.historyFilterApproved') },
          { value: 'rejected', label: t('staffApprovals.historyFilterRejected') },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              statusFilter === opt.value
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {loading && history.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            {t('common.loading')}
          </div>
        ) : history.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <History size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('staffApprovals.historyEmpty')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '540px' }}>
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {[
                      t('staffApprovals.historyColTitle'),
                      t('staffApprovals.historyColOwner'),
                      t('staffApprovals.historyColType'),
                      t('staffApprovals.historyColStatus'),
                      t('staffApprovals.historyColNote'),
                      t('staffApprovals.historyColDate'),
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {history.map(doc => (
                    <tr key={doc.doc_id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <p className="truncate font-medium text-slate-700 dark:text-slate-200" title={doc.title}>
                          {doc.title}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 max-w-[130px]">
                        <p className="truncate text-xs text-slate-700 dark:text-slate-300">
                          {doc.owner_name || '-'}
                        </p>
                        {doc.owner_student_id && (
                          <p className="mt-0.5 text-xs text-slate-400">{doc.owner_student_id}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                          {doc.doc_type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${approvalColor[doc.approval_status] || ''}`}>
                          {doc.approval_status === 'approved'
                            ? <CheckCircle2 size={11} />
                            : <XCircle size={11} />
                          }
                          {doc.approval_status === 'approved'
                            ? t('staffApprovals.historyFilterApproved')
                            : t('staffApprovals.historyFilterRejected')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={doc.approval_note || ''}>
                          {doc.approval_note || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(doc.approval_at, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
                <button
                  onClick={() => fetchHistory(page + 1)}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {t('staffApprovals.historyLoadMore')} ({total - history.length})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StaffApprovalsPage() {
  const { locale, t } = useLanguage()

  const [activeTab, setActiveTab] = useState('queue') // 'queue' | 'history'

  const [docs, setDocs]               = useState([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(true)
  const [assignedTypes, setAssignedTypes] = useState([])

  const [search, setSearch]           = useState('')
  const [filterType, setFilterType]   = useState('')
  const searchInputRef = useRef(null)

  const [selected, setSelected]       = useState(new Set())
  const [batchMode, setBatchMode]     = useState(null)
  const [singleMode, setSingleMode]   = useState(null)

  const fetchDocs = useCallback(async (pg = 1, reset = false) => {
    setLoading(true)
    try {
      const params = {
        scope: 'approver',
        page: pg,
        limit: PAGE_SIZE,
        sort_by: 'created_at',
        sort_dir: 'desc',
      }
      if (search.trim()) params.search = search.trim()
      if (filterType)    params.doc_type = filterType

      const { data } = await documentService.getAll(params)
      if (reset || pg === 1) {
        setDocs(data?.documents || [])
      } else {
        setDocs(prev => [...prev, ...(data?.documents || [])])
      }
      setTotal(data?.total || 0)
      setPage(pg)
    } catch {
      toast.error(t('staffApprovals.toastError'))
    } finally {
      setLoading(false)
    }
  }, [search, filterType, t])

  useEffect(() => {
    staffService.getStats().then(({ data }) => {
      setAssignedTypes(data?.assigned_types || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab !== 'queue') return
    setSelected(new Set())
    fetchDocs(1, true)
  }, [search, filterType, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === docs.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(docs.map(d => d.doc_id)))
    }
  }

  const clearSelection = () => setSelected(new Set())

  const removeFromList = (ids) => {
    const idSet = new Set(ids)
    setDocs(prev => prev.filter(d => !idSet.has(d.doc_id)))
    setTotal(prev => Math.max(0, prev - idSet.size))
    setSelected(new Set())
  }

  const handleBatchConfirm = async (note) => {
    const ids = [...selected]
    try {
      if (batchMode === 'approve') {
        const { data } = await documentService.bulkApprove({ ids, note })
        toast.success(t('staffApprovals.toastApproveSuccess', { count: data.approved }))
        removeFromList(ids)
      } else {
        const { data } = await documentService.bulkReject({ ids, note })
        toast.success(t('staffApprovals.toastRejectSuccess', { count: data.rejected }))
        removeFromList(ids)
      }
    } catch {
      toast.error(t('staffApprovals.toastError'))
    } finally {
      setBatchMode(null)
    }
  }

  const handleSingleConfirm = async (note) => {
    const { id, mode } = singleMode
    try {
      if (mode === 'approve') {
        await documentService.approve(id, { note })
        toast.success(t('documents.approvalApproveSuccess'))
      } else {
        await documentService.reject(id, { note })
        toast.success(t('documents.approvalRejectSuccess'))
      }
      removeFromList([id])
    } catch {
      toast.error(t('staffApprovals.toastError'))
    } finally {
      setSingleMode(null)
    }
  }

  const hasMore = docs.length < total

  return (
    <div className="mx-auto max-w-5xl space-y-5">

      {/* Page header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
              {t('common.staff')}
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('staffApprovals.title')}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t('staffApprovals.desc')}
            </p>
          </div>
          {activeTab === 'queue' && (
            <div className="shrink-0 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <ClipboardList size={13} />
                {total} {t('common.records')}
              </span>
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="mt-4 flex gap-1 border-b border-slate-100 dark:border-slate-800">
          {[
            { key: 'queue',   label: t('staffApprovals.tabQueue'),   Icon: ClipboardList },
            { key: 'history', label: t('staffApprovals.tabHistory'), Icon: History },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 border-b-2 px-4 pb-3 pt-1 text-sm font-semibold transition-colors ${
                activeTab === key
                  ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'history' ? (
        <HistoryTab t={t} locale={locale} />
      ) : (
        <>
          {/* Assigned type pills */}
          {assignedTypes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {assignedTypes.map(type => (
                <button
                  key={type.type_id}
                  onClick={() => setFilterType(prev => prev === type.type_code ? '' : type.type_code)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    filterType === type.type_code
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                  }`}
                >
                  {type.type_name || type.type_code}
                </button>
              ))}
              {filterType && (
                <button
                  onClick={() => setFilterType('')}
                  className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                >
                  <RotateCcw size={11} /> {t('staffApprovals.filterAllTypes')}
                </button>
              )}
            </div>
          )}

          {/* Search + filter bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('staffApprovals.filterSearch')}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {assignedTypes.length > 0 && (
              <div className="relative">
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <option value="">{t('staffApprovals.filterAllTypes')}</option>
                  {assignedTypes.map(type => (
                    <option key={type.type_id} value={type.type_code}>
                      {type.type_name || type.type_code}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            )}
          </div>

          {/* Batch action bar */}
          {selected.size > 0 && (
            <BatchActionBar
              count={selected.size}
              onApprove={() => setBatchMode('approve')}
              onReject={() => setBatchMode('reject')}
              onClear={clearSelection}
              t={t}
            />
          )}

          {/* Document table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {loading && docs.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                {t('common.loading')}
              </div>
            ) : docs.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <ClipboardList size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('staffApprovals.emptyTitle')}
                </p>
                <p className="mt-1 text-xs text-slate-400">{t('staffApprovals.emptyDesc')}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: '560px' }}>
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="w-10 px-4 py-3 text-left">
                          <button
                            onClick={toggleAll}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title={t('staffApprovals.selectAll')}
                          >
                            {selected.size === docs.length && docs.length > 0
                              ? <CheckSquare size={15} className="text-primary-600" />
                              : <Square size={15} />
                            }
                          </button>
                        </th>
                        {[
                          t('staffApprovals.colTitle'),
                          t('staffApprovals.colOwner'),
                          t('staffApprovals.colType'),
                          t('staffApprovals.colDate'),
                          t('staffApprovals.colAction'),
                        ].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {docs.map(doc => {
                        const isSelected = selected.has(doc.doc_id)
                        return (
                          <tr
                            key={doc.doc_id}
                            className={`transition-colors ${
                              isSelected
                                ? 'bg-primary-50 dark:bg-primary-950/20'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                          >
                            <td className="px-4 py-3.5">
                              <button
                                onClick={() => toggleSelect(doc.doc_id)}
                                className="text-slate-400 hover:text-primary-600"
                              >
                                {isSelected
                                  ? <CheckSquare size={15} className="text-primary-600" />
                                  : <Square size={15} />
                                }
                              </button>
                            </td>
                            <td className="px-4 py-3.5 max-w-[200px]">
                              <p className="truncate font-medium text-slate-700 dark:text-slate-200" title={doc.title}>
                                {doc.title}
                              </p>
                              {doc.description && (
                                <p className="mt-0.5 truncate text-xs text-slate-400" title={doc.description}>
                                  {doc.description}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3.5 max-w-[130px]">
                              <p className="truncate text-xs text-slate-700 dark:text-slate-300">
                                {doc.owner_name || '-'}
                              </p>
                              {doc.owner_student_id && (
                                <p className="mt-0.5 text-xs text-slate-400">{doc.owner_student_id}</p>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                {doc.doc_type}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                              {formatDate(doc.created_at || doc.upload_date, locale)}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setSingleMode({ id: doc.doc_id, mode: 'approve' })}
                                  title={t('staffApprovals.batchApprove')}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                                >
                                  <ThumbsUp size={12} />
                                </button>
                                <button
                                  onClick={() => setSingleMode({ id: doc.doc_id, mode: 'reject' })}
                                  title={t('staffApprovals.batchReject')}
                                  className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
                                >
                                  <ThumbsDown size={12} />
                                </button>
                                <Link
                                  to={`/documents?doc_id=${doc.doc_id}`}
                                  title={t('staffApprovals.viewDetails')}
                                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                                >
                                  <ExternalLink size={12} />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {hasMore && (
                  <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
                    <button
                      onClick={() => fetchDocs(page + 1)}
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
                    >
                      {loading && <Loader2 size={14} className="animate-spin" />}
                      {t('common.viewAll')} ({total - docs.length} {t('common.records')})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {batchMode && (
        <ConfirmModal
          mode={batchMode}
          count={selected.size}
          onClose={() => setBatchMode(null)}
          onConfirm={handleBatchConfirm}
          t={t}
        />
      )}

      {singleMode && (
        <ConfirmModal
          mode={singleMode.mode}
          count={1}
          onClose={() => setSingleMode(null)}
          onConfirm={handleSingleConfirm}
          t={t}
        />
      )}
    </div>
  )
}

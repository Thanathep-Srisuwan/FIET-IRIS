import { useEffect, useState, useCallback, useRef } from 'react'
import { trashService, docTypeService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import toast from 'react-hot-toast'
import { Calendar, Trash2 } from 'lucide-react'
import useDebouncedValue from '../../hooks/useDebouncedValue'

function DateInput({ value, onChange, min, max }) {
  const pickerRef = useRef(null)

  const toDisplay = (iso) => {
    if (!iso || iso.length !== 10) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }
  const [display, setDisplay] = useState(toDisplay(value))

  useEffect(() => { setDisplay(toDisplay(value)) }, [value])

  const handleTextChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    let out = raw.slice(0, 2)
    if (raw.length > 2) out += '/' + raw.slice(2, 4)
    if (raw.length > 4) out += '/' + raw.slice(4, 8)
    setDisplay(out)
    if (out.length === 10) {
      const [d, m, y] = out.split('/')
      const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      if (!isNaN(new Date(iso).getTime())) onChange(iso)
    } else if (out === '') {
      onChange('')
    }
  }

  const handlePickerChange = (e) => {
    const iso = e.target.value
    onChange(iso)
    setDisplay(toDisplay(iso))
  }

  return (
    <div className="relative flex items-center">
      <input type="text" value={display} onChange={handleTextChange}
        placeholder="dd/mm/yyyy" maxLength={10}
        className="input-field text-sm pr-8" style={{ width: 130 }} />
      <button type="button"
        onClick={() => pickerRef.current?.showPicker()}
        className="absolute right-2.5 text-slate-400 hover:text-slate-600 transition-colors leading-none">
        <Calendar size={15} />
      </button>
      <input ref={pickerRef} type="date" value={value} onChange={handlePickerChange}
        min={min} max={max}
        className="sr-only" style={{ position: 'absolute', right: 0, bottom: 0, opacity: 0, width: 1, height: 1 }} />
    </div>
  )
}

function PurgeBadge({ days }) {
  const { t } = useLanguage()
  if (days === null || days === undefined) return null
  if (days <= 0) return <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-600 text-white">{t('adminTrash.purgeOverdue')}</span>
  if (days <= 3) return <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700">{t('adminTrash.purgeDays', { days })}</span>
  if (days <= 7) return <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-orange-100 text-orange-700">{t('adminTrash.purgeDays', { days })}</span>
  return <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-500">{t('adminTrash.purgeDays', { days })}</span>
}

function ConfirmDialog({ title, message, confirmLabel, confirmStyle, onConfirm, onCancel, loading }) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60 ${confirmStyle}`}>
            {loading ? t('adminTrash.processing') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminTrashPage() {
  const { t, locale } = useLanguage()
  const [docs, setDocs]               = useState([])
  const [total, setTotal]             = useState(0)
  const [docTypes, setDocTypes]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [docType, setDocType]         = useState('')
  const [degreeLevel, setDegreeLevel] = useState('')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [selected, setSelected]       = useState(new Set())
  const [confirm, setConfirm]         = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const DEGREE_OPTIONS = [
    { value: '',         label: t('adminTrash.allDegrees') },
    { value: 'bachelor', label: t('adminTrash.degBachelor') },
    { value: 'master',   label: t('adminTrash.degMaster') },
    { value: 'doctoral', label: t('adminTrash.degDoctoral') },
  ]

  const formatDate = (value, opts) => {
    if (!value) return '—'
    return new Date(value).toLocaleDateString(locale, opts || { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatDateTime = (value) => {
    if (!value) return '—'
    return new Date(value).toLocaleDateString(locale, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  useEffect(() => {
    docTypeService.getAll().then(r => setDocTypes(r.data || [])).catch(() => {})
  }, [])

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const { data } = await trashService.getAll({
        search: debouncedSearch,
        doc_type: docType,
        degree_level: degreeLevel,
        date_from: dateFrom,
        date_to: dateTo,
      })
      setDocs(data.documents || [])
      setTotal(data.total ?? data.documents?.length ?? 0)
    } catch { toast.error(t('adminTrash.loadFailed')) }
    finally { setLoading(false) }
  }, [debouncedSearch, docType, degreeLevel, dateFrom, dateTo])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const allIds        = docs.map(d => d.doc_id)
  const isAllSelected = allIds.length > 0 && allIds.every(id => selected.has(id))
  const isIndeterminate = selected.size > 0 && !isAllSelected

  const toggleAll = () => setSelected(isAllSelected ? new Set() : new Set(allIds))
  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleRestore = async () => {
    setActionLoading(true)
    try {
      await trashService.restore(confirm.doc.doc_id)
      toast.success(t('adminTrash.restoreSuccess'))
      setConfirm(null); fetchDocs()
    } catch (err) { toast.error(err.response?.data?.message || t('common.error')) }
    finally { setActionLoading(false) }
  }

  const handlePermanentDelete = async () => {
    setActionLoading(true)
    try {
      await trashService.permanentDelete(confirm.doc.doc_id)
      toast.success(t('adminTrash.deleteSuccess'))
      setConfirm(null); fetchDocs()
    } catch (err) { toast.error(err.response?.data?.message || t('common.error')) }
    finally { setActionLoading(false) }
  }

  const handleBulkRestore = async () => {
    setActionLoading(true)
    try {
      await trashService.bulkRestore([...selected])
      toast.success(t('adminTrash.bulkRestoreSuccess', { count: selected.size }))
      setConfirm(null); fetchDocs()
    } catch (err) { toast.error(err.response?.data?.message || t('common.error')) }
    finally { setActionLoading(false) }
  }

  const handleBulkPermanentDelete = async () => {
    setActionLoading(true)
    try {
      await trashService.bulkPermanentDelete([...selected])
      toast.success(t('adminTrash.bulkDeleteSuccess', { count: selected.size }))
      setConfirm(null); fetchDocs()
    } catch (err) { toast.error(err.response?.data?.message || t('common.error')) }
    finally { setActionLoading(false) }
  }

  const clearFilters = () => {
    setSearch(''); setDocType(''); setDegreeLevel(''); setDateFrom(''); setDateTo('')
  }
  const hasFilters = search || docType || degreeLevel || dateFrom || dateTo

  const degreeLabel = (level) => {
    if (level === 'master')   return <span className="text-purple-600">{t('adminTrash.degMaster')}</span>
    if (level === 'doctoral') return <span className="text-rose-600">{t('adminTrash.degDoctoral')}</span>
    if (level === 'bachelor') return <span className="text-slate-500">{t('adminTrash.degBachelor')}</span>
    return <span className="text-slate-400">—</span>
  }

  return (
    <div className="space-y-5 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">{t('roles.admin')}</p>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('adminTrash.title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {t('adminTrash.desc', { count: total })}
            <span className="mx-2 text-slate-300">•</span>
            <span className="text-amber-500">{t('adminTrash.autoDeleteNote')}</span>
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <input className="input-field w-full sm:max-w-xs" placeholder={t('adminTrash.searchPlaceholder')}
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field w-full sm:w-auto sm:max-w-[160px]" value={docType} onChange={e => setDocType(e.target.value)}>
          <option value="">{t('adminTrash.allTypes')}</option>
          {docTypes.map(dt => (
            <option key={dt.type_id} value={dt.type_code}>{dt.type_code}</option>
          ))}
        </select>
        <select className="input-field w-full sm:w-auto sm:max-w-[150px]" value={degreeLevel} onChange={e => setDegreeLevel(e.target.value)}>
          {DEGREE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">{t('adminTrash.dateFrom')}</label>
            <DateInput value={dateFrom} onChange={setDateFrom} max={dateTo || undefined} />
          </div>
          <span className="text-slate-400 text-sm mt-4">—</span>
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">{t('adminTrash.dateTo')}</label>
            <DateInput value={dateTo} onChange={setDateTo} min={dateFrom || undefined} />
          </div>
        </div>

        {hasFilters && (
          <button onClick={clearFilters}
            className="text-xs px-3 py-2 rounded-lg text-slate-500 border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors mt-4 sm:mt-0">
            {t('adminTrash.clearFilters')}
          </button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('adminTrash.selectedCount', { count: selected.size })}</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => setConfirm({ type: 'bulk-restore' })}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#42b5e1' }}>
              {t('adminTrash.bulkRestore')}
            </button>
            <button onClick={() => setConfirm({ type: 'bulk-delete' })}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white bg-red-500 transition-opacity hover:opacity-80">
              {t('adminTrash.bulkDelete')}
            </button>
            <button onClick={() => setSelected(new Set())}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-slate-600 border border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '960px' }}>
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox"
                    checked={isAllSelected}
                    ref={el => { if (el) el.indeterminate = isIndeterminate }}
                    onChange={toggleAll}
                    disabled={docs.length === 0}
                    className="w-4 h-4 rounded accent-[#42b5e1] cursor-pointer"
                  />
                </th>
                {[t('adminTrash.colName'), t('adminTrash.colType'), t('adminTrash.colId'), t('adminTrash.colOwner'), t('adminTrash.colDegree'), t('adminTrash.colExpire'), t('adminTrash.colTrashed'), t('adminTrash.colReason'), ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-16 text-slate-400 text-sm">{t('common.loading')}</td></tr>
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Trash2 size={32} />
                      </div>
                      <p className="text-slate-400 text-sm">{t('adminTrash.empty')}</p>
                    </div>
                  </td>
                </tr>
              ) : docs.map(doc => (
                <tr key={doc.doc_id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selected.has(doc.doc_id) ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''}`}>
                  <td className="px-4 py-3.5">
                    <input type="checkbox"
                      checked={selected.has(doc.doc_id)}
                      onChange={() => toggleOne(doc.doc_id)}
                      className="w-4 h-4 rounded accent-[#42b5e1] cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-100 max-w-[180px]">
                    <div className="truncate">{doc.title}</div>
                    <PurgeBadge days={doc.days_until_purge} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded whitespace-nowrap"
                      style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>
                      {doc.doc_type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-500 whitespace-nowrap">
                    {doc.owner_student_id || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap max-w-[120px] truncate">
                    {doc.owner_name}
                  </td>
                  <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                    {degreeLabel(doc.owner_degree_level)}
                  </td>
                  <td className="px-4 py-3.5 text-xs tabular-nums whitespace-nowrap">
                    {doc.no_expire
                      ? <span className="text-slate-400 italic">{t('adminTrash.noExpire')}</span>
                      : doc.expire_date
                        ? <span className="text-red-500 font-medium">{formatDate(doc.expire_date)}</span>
                        : '—'
                    }
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                    {formatDateTime(doc.trashed_at)}
                  </td>
                  <td className="px-4 py-3.5 max-w-[200px]">
                    {doc.trashed_by === null ? (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-600 border border-red-200 whitespace-nowrap dark:bg-red-950/30 dark:text-red-300 dark:border-red-900">
                        {t('adminTrash.autoExpired')}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800">
                        {t('adminTrash.deletedBy', { name: doc.trashed_by_name || t('roles.admin') })}
                      </span>
                    )}
                    {doc.trash_reason && (
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug truncate" title={doc.trash_reason}>
                        {doc.trash_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setConfirm({ type: 'restore', doc })}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium text-white whitespace-nowrap transition-opacity hover:opacity-80"
                        style={{ backgroundColor: '#42b5e1' }}>
                        {t('adminTrash.restoreBtn')}
                      </button>
                      <button onClick={() => setConfirm({ type: 'delete', doc })}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium text-white whitespace-nowrap transition-opacity hover:opacity-80 bg-red-500">
                        {t('adminTrash.deleteBtn')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirm?.type === 'restore' && (
        <ConfirmDialog
          title={t('adminTrash.confirmRestoreTitle')}
          message={t('adminTrash.confirmRestoreMsg', { title: confirm.doc.title })}
          confirmLabel={t('adminTrash.confirmRestoreLabel')}
          confirmStyle="bg-[#42b5e1] hover:bg-[#2fa0cc]"
          onConfirm={handleRestore}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}
      {confirm?.type === 'delete' && (
        <ConfirmDialog
          title={t('adminTrash.confirmDeleteTitle')}
          message={t('adminTrash.confirmDeleteMsg', { title: confirm.doc.title })}
          confirmLabel={t('adminTrash.confirmDeleteLabel')}
          confirmStyle="bg-red-500 hover:bg-red-600"
          onConfirm={handlePermanentDelete}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}

      {confirm?.type === 'bulk-restore' && (
        <ConfirmDialog
          title={t('adminTrash.confirmBulkRestoreTitle')}
          message={t('adminTrash.confirmBulkRestoreMsg', { count: selected.size })}
          confirmLabel={t('adminTrash.confirmBulkRestoreLabel', { count: selected.size })}
          confirmStyle="bg-[#42b5e1] hover:bg-[#2fa0cc]"
          onConfirm={handleBulkRestore}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}
      {confirm?.type === 'bulk-delete' && (
        <ConfirmDialog
          title={t('adminTrash.confirmBulkDeleteTitle')}
          message={t('adminTrash.confirmBulkDeleteMsg', { count: selected.size })}
          confirmLabel={t('adminTrash.confirmBulkDeleteLabel', { count: selected.size })}
          confirmStyle="bg-red-500 hover:bg-red-600"
          onConfirm={handleBulkPermanentDelete}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

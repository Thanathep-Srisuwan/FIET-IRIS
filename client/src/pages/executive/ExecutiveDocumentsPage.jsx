import { useEffect, useState, useCallback } from 'react'
import { executiveService, documentService } from '../../services/api'
import toast from 'react-hot-toast'
import useAcademicOptions from '../../hooks/useAcademicOptions'
import { FileText, Image as ImageIcon, UploadCloud, History, Trash2, ClipboardList } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { getProgramDisplayName } from '../../constants/programs'

const statusColor = {
  active:        'bg-emerald-50 text-emerald-700 border border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border border-amber-200',
  expired:       'bg-red-50 text-red-600 border border-red-200',
}
const timelineIcon = {
  created: FileText,
  file_version_uploaded: UploadCloud,
  trashed: Trash2,
  restored: ClipboardList,
}
const computedStatus = (doc) => {
  if (doc.no_expire) return null
  if (doc.days_remaining == null) return doc.status
  if (doc.days_remaining < 0)   return 'expired'
  if (doc.days_remaining <= 90) return 'expiring_soon'
  return 'active'
}

// ─── FileVersionRow ───────────────────────────────────────────────────────────
function FileVersionRow({ file, docId, isCurrent = false, previewLoading, onPreview }) {
  const { t } = useLanguage()
  const Icon = file.mime_type?.includes('image') ? ImageIcon : FileText
  const handleDownload = async () => {
    try {
      const { data } = await documentService.download(docId, file.file_id)
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url; a.download = file.file_name; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch { toast.error(t('documents.fileDownloadError')) }
  }

  const fileTypeLabel = {
    main: t('documents.fileTypeMain'),
    certificate: t('documents.fileTypeCertificate'),
    attachment: t('documents.fileTypeAttachment'),
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${isCurrent ? 'bg-white border-slate-200' : 'bg-white/70 border-slate-100'}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Icon size={20} className={file.mime_type?.includes('pdf') ? 'text-red-500' : 'text-slate-400'} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{file.file_name}</p>
            {isCurrent && <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">{t('documents.fileCurrent')}</span>}
          </div>
          <p className="text-xs text-slate-400">
            v{file.version_no || 1} · {(file.file_size / 1024).toFixed(1)} KB · {fileTypeLabel[file.file_type] || t('documents.fileTypeAttachment')}
            {file.uploaded_by_name ? ` ${t('documents.fileBy', { name: file.uploaded_by_name })}` : ''}
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0 ml-2">
        {file.mime_type?.includes('pdf') && (
          <button type="button" onClick={() => onPreview(file)} disabled={previewLoading[file.file_id]}
            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50">
            {previewLoading[file.file_id] ? '...' : t('documents.fileView')}
          </button>
        )}
        <button type="button" onClick={handleDownload}
          className="text-xs px-2.5 py-1 rounded-lg text-white" style={{ backgroundColor: '#42b5e1' }}>
          {t('documents.fileDownload')}
        </button>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function ExecDetailModal({ doc, onClose, onRefresh }) {
  const { t, locale } = useLanguage()
  const [currentDoc, setCurrentDoc]       = useState(doc)
  const [previewLoading, setPreviewLoading] = useState({})
  const [versionFiles, setVersionFiles]   = useState([])
  const [versionFileType, setVersionFileType] = useState('attachment')
  const [versionNote, setVersionNote]     = useState('')
  const [uploadingVersion, setUploadingVersion] = useState(false)

  const statusLabel = {
    active: t('documents.statusActive'),
    expiring_soon: t('documents.statusExpiring'),
    expired: t('documents.statusExpired'),
  }

  useEffect(() => { setCurrentDoc(doc) }, [doc])

  const refreshDetail = async () => {
    const { data } = await documentService.getById(currentDoc.doc_id)
    setCurrentDoc(data)
  }

  const handlePreview = async (f) => {
    setPreviewLoading(p => ({ ...p, [f.file_id]: true }))
    try {
      const { data } = await documentService.preview(currentDoc.doc_id, f.file_id)
      const url = URL.createObjectURL(data)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { toast.error(t('documents.filePreviewError')) }
    finally { setPreviewLoading(p => ({ ...p, [f.file_id]: false })) }
  }

  const handleVersionFiles = (newFiles) => {
    setVersionFiles(prev => [...prev, ...Array.from(newFiles)].slice(0, 5))
  }

  const handleUploadVersion = async (e) => {
    e.preventDefault()
    if (versionFiles.length === 0) return toast.error(t('documents.modalVersionSelectError'))
    setUploadingVersion(true)
    try {
      const fd = new FormData()
      fd.append('file_type', versionFileType)
      fd.append('doc_type', currentDoc.doc_type || 'RI')
      if (versionNote.trim()) fd.append('note', versionNote.trim())
      versionFiles.forEach(f => fd.append('files', f))
      await documentService.uploadVersion(currentDoc.doc_id, fd)
      toast.success(t('documents.modalVersionSuccess'))
      setVersionFiles([]); setVersionNote('')
      await refreshDetail()
      if (onRefresh) onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || t('documents.modalVersionError'))
    } finally { setUploadingVersion(false) }
  }

  const files        = currentDoc.files || []
  const currentFiles = files.filter(f => f.is_current === true || f.is_current === 1)
  const previousFiles = files.filter(f => !(f.is_current === true || f.is_current === 1))
  const noExp        = !!currentDoc.no_expire
  const daysLeft     = currentDoc.days_remaining
  const daysColor    = daysLeft < 0 ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-600'
  const status       = computedStatus(currentDoc)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 text-xs font-semibold rounded"
                style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>{currentDoc.doc_type}</span>
              {status && (
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColor[status] || ''}`}>
                  {statusLabel[status] || currentDoc.status}
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-slate-800 mt-1">{currentDoc.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl ml-4 flex-shrink-0">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">{t('documents.modalIssueDate')}</p>
              <p className="text-sm font-semibold text-slate-700">
                {new Date(currentDoc.issue_date).toLocaleDateString(locale)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">{t('documents.modalExpireDate')}</p>
              {noExp ? (
                <p className="text-sm font-semibold text-slate-400 italic">{t('documents.modalNoExpire')}</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700">
                    {currentDoc.expire_date ? new Date(currentDoc.expire_date).toLocaleDateString(locale) : '—'}
                  </p>
                  {daysLeft != null && (
                    <p className={`text-xs mt-0.5 font-medium ${daysColor}`}>
                      {daysLeft < 0
                        ? t('execDocuments.daysOver', { days: Math.abs(daysLeft) })
                        : t('execDocuments.daysLeft', { days: daysLeft })}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('documents.modalOwnerSection')}</p>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ backgroundColor: '#42b5e1' }}>
                {currentDoc.owner_name?.[0]}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-700">{currentDoc.owner_name}</p>
                  {currentDoc.owner_student_id && (
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>{currentDoc.owner_student_id}</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">{currentDoc.owner_email}</p>
                {currentDoc.advisor_name && (
                  <p className="text-xs text-slate-400 mt-0.5">{t('documents.modalAdvisor', { name: currentDoc.advisor_name })}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('documents.modalFilesSection')}</p>
              <span className="text-[11px] text-slate-400">{t('documents.modalFilesTotal', { count: files.length })}</span>
            </div>
            {currentFiles.length > 0 ? (
              <div className="space-y-2">
                {currentFiles.map(f => (
                  <FileVersionRow key={f.file_id} file={f} docId={currentDoc.doc_id}
                    isCurrent previewLoading={previewLoading} onPreview={handlePreview} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-3">{t('documents.modalNoFiles')}</p>
            )}
            {previousFiles.length > 0 && (
              <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60">
                <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-500">
                  {t('documents.modalPreviousVersions', { count: previousFiles.length })}
                </summary>
                <div className="px-3 pb-3 space-y-2">
                  {previousFiles.map(f => (
                    <FileVersionRow key={f.file_id} file={f} docId={currentDoc.doc_id}
                      previewLoading={previewLoading} onPreview={handlePreview} />
                  ))}
                </div>
              </details>
            )}
          </div>

          <form onSubmit={handleUploadVersion} className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <UploadCloud size={17} className="text-[#42b5e1]" />
              <div>
                <p className="text-sm font-semibold text-slate-700">{t('documents.modalVersionTitle')}</p>
                <p className="text-xs text-slate-400">{t('documents.modalVersionDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select className="input-field" value={versionFileType} onChange={e => setVersionFileType(e.target.value)}>
                <option value="main">{t('documents.fileTypeMain')}</option>
                <option value="certificate">{t('documents.fileTypeCertificate')}</option>
                <option value="attachment">{t('documents.fileTypeAttachment')}</option>
              </select>
              <input className="input-field" value={versionNote}
                onChange={e => setVersionNote(e.target.value)}
                placeholder={t('documents.modalVersionNotePlaceholder')} />
            </div>
            <label className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm text-slate-500 hover:bg-slate-50">
              {t('documents.modalVersionSelectFile')}
              <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={e => handleVersionFiles(e.target.files)} />
            </label>
            {versionFiles.length > 0 && (
              <div className="space-y-1">
                {versionFiles.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center justify-between text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => setVersionFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-slate-400 hover:text-red-500 ml-2 flex-shrink-0">✕</button>
                  </div>
                ))}
              </div>
            )}
            <button type="submit" disabled={uploadingVersion || versionFiles.length === 0}
              className="w-full py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: '#42b5e1' }}>
              {uploadingVersion ? t('documents.modalVersionUploadingBtn') : t('documents.modalVersionSaveBtn')}
            </button>
          </form>

          {currentDoc.timeline?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <History size={16} className="text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('documents.modalTimeline')}</p>
              </div>
              <div className="space-y-3">
                {currentDoc.timeline.map(item => {
                  const Icon = timelineIcon[item.event_type] || ClipboardList
                  return (
                    <div key={item.timeline_id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0 flex-1 pb-3 border-b border-slate-100 last:border-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-700">{item.title}</p>
                          <span className="text-[11px] text-slate-400">
                            {new Date(item.created_at).toLocaleString(locale)}
                          </span>
                        </div>
                        {item.detail && <p className="text-xs text-slate-500 mt-1">{item.detail}</p>}
                        {item.actor_name && (
                          <p className="text-[11px] text-slate-400 mt-1">{t('documents.modalTimelineBy', { name: item.actor_name })}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {currentDoc.description && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('documents.modalDescription')}</p>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{currentDoc.description}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#42b5e1' }}>{t('documents.modalCloseBtn')}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ExecutiveDocumentsPage() {
  const { language, locale, t } = useLanguage()
  const academicOptions = useAcademicOptions()
  const [docs, setDocs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [docType, setDocType]   = useState('')
  const [status, setStatus]     = useState('')
  const [degree, setDegree]     = useState('')
  const [program, setProgram]   = useState('')
  const [selected, setSelected] = useState(null)

  const statusLabel = {
    active: t('documents.statusActive'),
    expiring_soon: t('documents.statusExpiring'),
    expired: t('documents.statusExpired'),
  }

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await executiveService.getDocuments({ search, doc_type: docType, status, degree_level: degree, program })
      setDocs(data.documents || [])
    } catch { toast.error(t('execDocuments.loadError')) }
    finally { setLoading(false) }
  }, [search, docType, status, degree, program])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const openDetail = async (doc) => {
    try {
      const { data } = await documentService.getById(doc.doc_id)
      setSelected(data)
    } catch { toast.error(t('execDocuments.loadDetailError')) }
  }

  const exportCSV = () => {
    const headers = [
      t('execDocuments.colTitle'),
      t('execDocuments.colType'),
      t('execDocuments.colOwner'),
      t('execDocuments.colProgram'),
      t('execDocuments.colAdvisor'),
      t('execDocuments.colIssueDate') || 'Issue date',
      t('execDocuments.colExpire'),
      t('execDocuments.colRemaining'),
      t('execDocuments.colStatus'),
    ]
    const rows = docs.map(d =>
      `"${d.title}","${d.doc_type}","${d.owner_name}","${getProgramDisplayName(d.program, language)||''}","${d.advisor_name||''}","${new Date(d.issue_date).toLocaleDateString(locale)}","${d.expire_date ? new Date(d.expire_date).toLocaleDateString(locale) : ''}","${d.days_remaining}","${statusLabel[d.status]||d.status}"`
    )
    const csv  = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = 'FIET-IRIS_all_documents.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const tableHeaders = [
    t('execDocuments.colTitle'),
    t('execDocuments.colType'),
    t('execDocuments.colOwner'),
    t('execDocuments.colProgram'),
    t('execDocuments.colAdvisor'),
    t('execDocuments.colExpire'),
    t('execDocuments.colRemaining'),
    t('execDocuments.colStatus'),
    t('execDocuments.colFiles'),
  ]

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>
            {t('executive.eyebrow')}
          </p>
          <h1 className="text-2xl font-bold text-slate-800">{t('execDocuments.title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{t('execDocuments.total', { count: docs.length })}</p>
        </div>
        <button onClick={exportCSV}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-all">
          ⬇ Export CSV
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <input className="input-field max-w-xs" placeholder={t('execDocuments.filterSearch')}
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field max-w-[140px]" value={docType} onChange={e => setDocType(e.target.value)}>
          <option value="">{t('execDocuments.filterAllTypes')}</option>
          <option value="RI">RI</option>
          <option value="IRB">IRB</option>
        </select>
        <select className="input-field max-w-[160px]" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">{t('execDocuments.filterAllStatus')}</option>
          <option value="active">{t('documents.statusActive')}</option>
          <option value="expiring_soon">{t('documents.statusExpiring')}</option>
          <option value="expired">{t('documents.statusExpired')}</option>
        </select>
        <select className="input-field max-w-[140px]" value={degree}
          onChange={e => { setDegree(e.target.value); setProgram('') }}>
          <option value="">{t('execDocuments.filterAllDegrees')}</option>
          <option value="bachelor">{t('execDocuments.degBachelor')}</option>
          <option value="master">{t('execDocuments.degMaster')}</option>
          <option value="doctoral">{t('execDocuments.degDoctoral')}</option>
        </select>
        <select className="input-field max-w-[220px]" value={program} onChange={e => setProgram(e.target.value)}>
          <option value="">{t('execDocuments.filterAllPrograms')}</option>
          {(degree ? academicOptions.programsByDegree[degree] || [] : academicOptions.programs).map(b => (
            <option key={b} value={b}>{getProgramDisplayName(b, language)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '800px' }}>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {tableHeaders.map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-16 text-slate-400 text-sm">{t('common.loading')}</td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16">
                  <p className="text-slate-300 text-4xl mb-3">○</p>
                  <p className="text-slate-400 text-sm">{t('execDocuments.noDocuments')}</p>
                </td></tr>
              ) : docs.map(d => {
                const days = d.days_remaining
                const daysColor = d.no_expire ? 'text-slate-400' : days < 0 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-slate-500'
                const docStatus = computedStatus(d)
                return (
                  <tr key={d.doc_id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => openDetail(d)}>
                    <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[180px] truncate">{d.title}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded"
                        style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>{d.doc_type}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{d.owner_name}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[140px] truncate">{getProgramDisplayName(d.program, language) || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{d.advisor_name || '—'}</td>
                    <td className="px-4 py-3.5 text-xs tabular-nums whitespace-nowrap">
                      {d.no_expire
                        ? <span className="italic text-slate-400">{t('execDocuments.noExpire')}</span>
                        : <span className="text-slate-500">{d.expire_date ? new Date(d.expire_date).toLocaleDateString(locale) : '—'}</span>
                      }
                    </td>
                    <td className={`px-4 py-3.5 text-xs font-semibold tabular-nums ${daysColor}`}>
                      {d.no_expire ? '—'
                        : days == null ? '—'
                        : days < 0 ? t('execDocuments.daysOver', { days: Math.abs(days) })
                        : t('execDocuments.daysLeft', { days })}
                    </td>
                    <td className="px-4 py-3.5">
                      {docStatus ? (
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColor[docStatus] || 'bg-slate-100 text-slate-500'}`}>
                          {statusLabel[docStatus] || d.status}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                          {t('execDocuments.noExpire')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {d.file_count > 0 ? (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {d.file_count}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <ExecDetailModal
          doc={selected}
          onClose={() => setSelected(null)}
          onRefresh={fetchDocs}
        />
      )}
    </div>
  )
}

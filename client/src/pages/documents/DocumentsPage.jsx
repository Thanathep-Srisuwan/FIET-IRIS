import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { documentService, docTypeService, userService, commentService } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

import { useLanguage } from '../../contexts/LanguageContext'
import toast from 'react-hot-toast'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import useAcademicOptions from '../../hooks/useAcademicOptions'
import { ALL_PROGRAMS, PROGRAMS_BY_DEGREE, getDegreeForProgram, getProgramDisplayName } from '../../constants/programs'
import {
  Calendar,
  X,
  FileText,
  Image as ImageIcon,
  Trash2,
  ClipboardList,
  Users,
  GraduationCap,
  School,
  Paperclip,
  Download,
  UploadCloud,
  History,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const statusColor = {
  active:        'bg-emerald-50 text-emerald-700 border border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border border-amber-200',
  expired:       'bg-red-50 text-red-600 border border-red-200',
}

const approvalColor = {
  pending:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border border-red-200',
}
const approvalLabel = (status, t) => ({
  pending:  t('documents.approvalPending'),
  approved: t('documents.approvalApproved'),
  rejected: t('documents.approvalRejected'),
}[status] || status)
const programsByDegree = PROGRAMS_BY_DEGREE
const allProgramOptions = ALL_PROGRAMS
const LIMIT = 15

const computedStatus = (doc) => {
  if (doc.no_expire) return null
  if (doc.days_remaining == null) return doc.status
  if (doc.days_remaining < 0)   return 'expired'
  if (doc.days_remaining <= 90) return 'expiring_soon'
  return 'active'
}

const groupBadge = (doc, t) => {
  if (!doc.owner_role || doc.owner_role === 'admin') return null
  if (doc.owner_role === 'advisor') return { text: t('documents.roleAdvisor'), bg: '#fef3c7', color: '#92400e' }
  if (doc.owner_role === 'staff')   return { text: t('documents.roleStaff'),   bg: '#dcfce7', color: '#166534' }
  if (doc.owner_role === 'student') {
    switch (doc.owner_degree_level) {
      case 'master':   return { text: t('documents.degreeMaster'),   bg: '#f3e8ff', color: '#6b21a8' }
      case 'doctoral': return { text: t('documents.degreeDoctoral'), bg: '#fee2e2', color: '#991b1b' }
      default:         return { text: t('documents.degreeBachelor'), bg: '#e0f4fb', color: '#0d2d3e' }
    }
  }
  return null
}

const rowBg = (doc) => {
  if (doc.no_expire) return ''
  if (doc.days_remaining < 0)   return 'bg-red-50 hover:bg-red-100'
  if (doc.days_remaining <= 30) return 'bg-amber-50 hover:bg-amber-100'
  return 'hover:bg-slate-50'
}

const timelineIcon = {
  created: FileText,
  file_version_uploaded: UploadCloud,
  trashed: Trash2,
  restored: ClipboardList,
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const getAdminTabs = (t) => [
  { key: 'all',      label: t('documents.tabAll'),     summaryKey: 'all',      params: {} },
  { key: 'bachelor', label: t('documents.tabBachelor'), summaryKey: 'bachelor', params: { owner_role: 'student', degree_level: 'bachelor' } },
  { key: 'master',   label: t('documents.tabMaster'),   summaryKey: 'master',   params: { owner_role: 'student', degree_level: 'master'   } },
  { key: 'doctoral', label: t('documents.tabDoctoral'), summaryKey: 'doctoral', params: { owner_role: 'student', degree_level: 'doctoral' } },
  { key: 'advisor',  label: t('documents.tabAdvisor'),  summaryKey: 'advisor',  params: { owner_role: 'advisor' } },
  { key: 'staff',    label: t('documents.tabStaff'),    summaryKey: 'staff',    params: { owner_role: 'staff'   } },
]

const getAdvisorTabs = (t) => [
  { key: 'all',      label: t('documents.tabAll'),         params: {} },
  { key: 'bachelor', label: t('documents.degreeBachelor'), params: { degree_level: 'bachelor' } },
  { key: 'master',   label: t('documents.degreeMaster'),   params: { degree_level: 'master'   } },
  { key: 'doctoral', label: t('documents.degreeDoctoral'), params: { degree_level: 'doctoral' } },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCards({ summary, activeTab }) {
  const { t } = useLanguage()
  const stats = summary?.[activeTab] ?? summary?.all ?? {}
  const active = Math.max(0, (stats.total || 0) - (stats.expired || 0) - (stats.expiring_soon || 0) - (stats.no_expire_count || 0))
  const cards = [
    { label: t('documents.summaryTotal'),    value: stats.total          || 0, colorClass: 'text-slate-700',   bg: 'bg-slate-100' },
    { label: t('documents.summaryActive'),   value: active,                    colorClass: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: t('documents.summaryExpiring'), value: stats.expiring_soon  || 0, colorClass: 'text-amber-700',   bg: 'bg-amber-50' },
    { label: t('documents.summaryExpired'),  value: stats.expired        || 0, colorClass: 'text-red-700',     bg: 'bg-red-50' },
    { label: t('documents.summaryUpdated'),  value: stats.updated_count  || 0, colorClass: 'text-blue-700',    bg: 'bg-blue-50' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map(card => (
        <div key={card.label} className={`${card.bg} rounded-xl px-4 py-3`}>
          <p className="text-xs text-slate-500 mb-1">{card.label}</p>
          <p className={`text-2xl font-bold ${card.colorClass}`}>{card.value.toLocaleString()}</p>
          <p className="text-xs text-slate-400">{t('documents.summaryUnit')}</p>
        </div>
      ))}
    </div>
  )
}

function TabBar({ tabs, activeTab, onChange, summary }) {
  return (
    <div className="flex gap-0.5 border-b border-slate-200 overflow-x-auto">
      {tabs.map(tab => {
        const stats   = summary?.[tab.summaryKey ?? tab.key]
        const isActive = activeTab === tab.key
        const hasExpired = stats?.expired > 0
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2
              ${isActive
                ? 'border-[#42b5e1] text-[#42b5e1]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            {tab.label}
            {stats != null && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center
                ${hasExpired
                  ? 'bg-red-100 text-red-600'
                  : isActive ? 'bg-[#e0f4fb] text-[#0d2d3e]' : 'bg-slate-100 text-slate-600'}`}>
                {stats.total}
                {hasExpired && <span className="ml-0.5">!</span>}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function SortTh({ children, sortKey, currentSort, onSort, className = '' }) {
  const isActive = currentSort.by === sortKey
  return (
    <th
      className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-slate-700 select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className={`text-xs ${isActive ? 'text-[#42b5e1]' : 'text-slate-300'}`}>
          {isActive ? (currentSort.dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </div>
    </th>
  )
}

function PaginationBar({ page, total, limit, onPageChange }) {
  const { t } = useLanguage()
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  const pages = []
  let start = Math.max(1, page - 2)
  let end   = Math.min(totalPages, start + 4)
  start = Math.max(1, end - 4)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 py-2">
      <p className="text-xs text-slate-400">
        {t('documents.pageShowing', {
          from: ((page - 1) * limit + 1).toLocaleString(),
          to: Math.min(page * limit, total).toLocaleString(),
          total: total.toLocaleString(),
        })}
      </p>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
          <ChevronLeft size={14} /> {t('documents.pagePrev')}
        </button>
        {pages.map(p => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`w-8 h-8 text-xs rounded-lg border transition-colors
              ${p === page ? 'border-[#42b5e1] text-[#42b5e1] bg-[#e0f4fb]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {p}
          </button>
        ))}
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
          {t('documents.pageNext')} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── User Search Input ────────────────────────────────────────────────────────
function UserSearchInput({ value, onChange }) {
  const { t } = useLanguage()
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const [selected, setSelected] = useState(null)
  const wrapRef  = useRef(null)
  const timerRef = useRef(null)

  const roleLabel = useMemo(() => ({
    student:   t('documents.roleStudent'),
    advisor:   t('documents.roleAdvisor'),
    admin:     t('documents.roleAdmin'),
    staff:     t('documents.roleStaff'),
    executive: t('documents.roleExecutive'),
  }), [t])

  useEffect(() => {
    const handleClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleInput = (e) => {
    const q = e.target.value
    setQuery(q); setSelected(null); onChange('')
    clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try { const { data } = await userService.search(q); setResults(data || []); setOpen(true) }
      catch {} finally { setLoading(false) }
    }, 300)
  }

  const handleSelect = (u) => {
    setSelected(u)
    setQuery(`${u.student_id ? `[${u.student_id}] ` : ''}${u.name}`)
    onChange(u.user_id); setOpen(false); setResults([])
  }

  const handleClear = () => { setSelected(null); setQuery(''); onChange(''); setResults([]); setOpen(false) }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <input type="text" value={query} onChange={handleInput} onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={t('documents.userSearchPlaceholder')}
          className="input-field pr-8" />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">...</span>}
        {selected && !loading && (
          <button type="button" onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">✕</button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          {results.map(u => (
            <button key={u.user_id} type="button" onClick={() => handleSelect(u)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2">
                {u.student_id && (
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>{u.student_id}</span>
                )}
                <span className="text-sm font-medium text-slate-700">{u.name}</span>
                <span className="text-xs text-slate-400 ml-auto">{roleLabel[u.role]}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
            </button>
          ))}
        </div>
      )}
      {open && !loading && results.length === 0 && query.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl px-4 py-3 text-sm text-slate-400">
          {t('documents.userSearchNotFound')}
        </div>
      )}
    </div>
  )
}

function FileVersionRow({ file, docId, isCurrent = false, previewLoading, onPreview }) {
  const { t } = useLanguage()
  const fileTypeLabel = {
    main:        t('documents.fileTypeMain'),
    certificate: t('documents.fileTypeCertificate'),
    attachment:  t('documents.fileTypeAttachment'),
  }
  const Icon = file.mime_type?.includes('image') ? ImageIcon : FileText

  const handleDownload = async () => {
    try {
      const { data } = await documentService.download(docId, file.file_id)
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      toast.error(t('documents.fileDownloadError'))
    }
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${isCurrent ? 'bg-white border-slate-200' : 'bg-white/70 border-slate-100'}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Icon size={20} className={file.mime_type?.includes('pdf') ? 'text-red-500' : 'text-slate-400'} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{file.file_name}</p>
            {isCurrent && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                {t('documents.fileCurrent')}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            v{file.version_no || 1} · {(file.file_size / 1024).toFixed(1)} KB · {fileTypeLabel[file.file_type] || t('documents.fileTypeAttachment')}
            {file.uploaded_by_name ? ` ${t('documents.fileBy', { name: file.uploaded_by_name })}` : ''}
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0 ml-2">
        {file.mime_type?.includes('pdf') && (
          <button
            type="button"
            onClick={() => onPreview(file)}
            disabled={previewLoading[file.file_id]}
            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50">
            {previewLoading[file.file_id] ? '...' : t('documents.fileView')}
          </button>
        )}
        <button
          type="button"
          onClick={handleDownload}
          className="text-xs px-2.5 py-1 rounded-lg text-white"
          style={{ backgroundColor: '#42b5e1' }}>
          {t('documents.fileDownload')}
        </button>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ doc, onClose, onDeleted, role, approvalPanel = false, requiresApproval = true }) {
  const { t, locale } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState({})
  const [currentDoc, setCurrentDoc] = useState(doc)
  const [versionFiles, setVersionFiles] = useState([])
  const [versionFileType, setVersionFileType] = useState('attachment')
  const [versionNote, setVersionNote] = useState('')
  const [uploadingVersion, setUploadingVersion] = useState(false)
  const [approvalNote, setApprovalNote] = useState('')
  const [approvalAction, setApprovalAction] = useState(null) // 'approve'|'reject'|null
  const [approvingId, setApprovingId] = useState(null) // 'approve'|'reject'|null
  const [timelineOpen, setTimelineOpen] = useState(false)
  // Comments
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const { user: currentUser } = useAuthStore()

  useEffect(() => {
    commentService.getAll(doc.doc_id)
      .then(({ data }) => setComments(data.comments || []))
      .catch(() => {})
  }, [doc.doc_id])

  const handleApprove = async () => {
    setApprovingId('approve')
    try {
      await documentService.approve(currentDoc.doc_id, { note: approvalNote })
      toast.success(t('documents.approvalApproveSuccess'))
      setCurrentDoc(prev => ({ ...prev, approval_status: 'approved', approval_note: approvalNote }))
      setApprovalNote('')
      setApprovalAction(null)
      onDeleted()
    } catch (err) { toast.error(err.response?.data?.message || t('common.error')) }
    finally { setApprovingId(null) }
  }

  const handleReject = async () => {
    if (!approvalNote.trim()) { toast.error(t('documents.approvalRejectNoteRequired')); return }
    setApprovingId('reject')
    try {
      await documentService.reject(currentDoc.doc_id, { note: approvalNote })
      toast.success(t('documents.approvalRejectSuccess'))
      setCurrentDoc(prev => ({ ...prev, approval_status: 'rejected', approval_note: approvalNote }))
      setApprovalNote('')
      setApprovalAction(null)
      onDeleted()
    } catch (err) { toast.error(err.response?.data?.message || t('common.error')) }
    finally { setApprovingId(null) }
  }

  const handleSendComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSendingComment(true)
    try {
      const { data } = await commentService.create(currentDoc.doc_id, { content: commentText.trim() })
      setComments(prev => [...prev, data.comment])
      setCommentText('')
    } catch (err) { toast.error(err.response?.data?.message || t('common.error')) }
    finally { setSendingComment(false) }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await commentService.remove(currentDoc.doc_id, commentId)
      setComments(prev => prev.filter(c => c.comment_id !== commentId))
    } catch { toast.error(t('documents.commentDeleteError')) }
  }

  const statusLabel = {
    active:        t('documents.statusActive'),
    expiring_soon: t('documents.statusExpiring'),
    expired:       t('documents.statusExpired'),
  }
  const degreeLabel = {
    bachelor: t('documents.degreeBachelor'),
    master:   t('documents.degreeMaster'),
    doctoral: t('documents.degreeDoctoral'),
  }
  const roleLabel = {
    student:   t('documents.roleStudent'),
    advisor:   t('documents.roleAdvisor'),
    admin:     t('documents.roleAdmin'),
    staff:     t('documents.roleStaff'),
    executive: t('documents.roleExecutive'),
  }
  const fileTypeLabel = {
    main:        t('documents.fileTypeMain'),
    certificate: t('documents.fileTypeCertificate'),
    attachment:  t('documents.fileTypeAttachment'),
  }

  useEffect(() => {
    setCurrentDoc(doc)
  }, [doc])

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

  const handleTrash = async () => {
    if (!confirm(t('documents.modalTrashConfirm', { title: currentDoc.title }))) return
    setLoading(true)
    try {
      await documentService.delete(currentDoc.doc_id)
      toast.success(t('documents.modalTrashSuccess'))
      onDeleted(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || t('common.error')) }
    finally { setLoading(false) }
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
      setVersionFiles([])
      setVersionNote('')
      await refreshDetail()
      onDeleted()
    } catch (err) {
      toast.error(err.response?.data?.message || t('documents.modalVersionError'))
    } finally {
      setUploadingVersion(false)
    }
  }

  const files = currentDoc.files || []
  const currentFiles = files.filter(f => f.is_current === true || f.is_current === 1)
  const previousFiles = files.filter(f => !(f.is_current === true || f.is_current === 1))
  const noExp = !!currentDoc.no_expire
  const daysLeft = currentDoc.days_remaining
  const daysColor = daysLeft < 0 ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-600'
  const gb = groupBadge(currentDoc, t)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 text-xs font-semibold rounded"
                style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>{currentDoc.doc_type}</span>
              {gb && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded"
                  style={{ backgroundColor: gb.bg, color: gb.color }}>{gb.text}</span>
              )}
              {(!requiresApproval || !currentDoc.approval_status || currentDoc.approval_status === 'approved') ? (
                computedStatus(currentDoc) && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${statusColor[computedStatus(currentDoc)] || ''}`}>
                    {statusLabel[computedStatus(currentDoc)] || currentDoc.status}
                  </span>
                )
              ) : (
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${approvalColor[currentDoc.approval_status] || ''}`}>
                  {approvalLabel(currentDoc.approval_status, t)}
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
                        ? t('documents.modalDaysOver', { days: Math.abs(daysLeft) })
                        : t('documents.modalDaysLeft', { days: daysLeft })}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {role !== 'student' && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {t('documents.modalOwnerSection')}
              </p>
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
                    {currentDoc.owner_role && (
                      <span className="text-xs text-slate-400">{roleLabel[currentDoc.owner_role]}
                        {currentDoc.owner_degree_level ? ` (${degreeLabel[currentDoc.owner_degree_level] || currentDoc.owner_degree_level})` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{currentDoc.owner_email}</p>
                  {currentDoc.advisor_name && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('documents.modalAdvisor', { name: currentDoc.advisor_name })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {t('documents.modalFilesSection')}
              </p>
              <span className="text-[11px] text-slate-400">
                {t('documents.modalFilesTotal', { count: files.length })}
              </span>
            </div>
            {currentFiles.length > 0 ? (
              <div className="space-y-2">
                {currentFiles.map(f => (
                  <FileVersionRow
                    key={f.file_id}
                    file={f}
                    docId={currentDoc.doc_id}
                    isCurrent
                    previewLoading={previewLoading}
                    onPreview={handlePreview}
                  />
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
                    <FileVersionRow
                      key={f.file_id}
                      file={f}
                      docId={currentDoc.doc_id}
                      previewLoading={previewLoading}
                      onPreview={handlePreview}
                    />
                  ))}
                </div>
              </details>
            )}
          </div>

          {role === 'student' && currentDoc.approval_status === 'rejected' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
              <div className="flex items-start gap-3">
                <XCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-800">{t('documents.studentRejectedBannerTitle')}</p>
                  <p className="mt-0.5 text-xs text-red-600">{t('documents.studentRejectedBannerDesc')}</p>
                </div>
              </div>
              {currentDoc.approval_note && (
                <div className="rounded-lg border border-red-200 bg-white px-3 py-2.5 ml-7">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400">{t('documents.approvalNotePrefix')}</p>
                  <p className="mt-1 text-sm text-red-700">{currentDoc.approval_note}</p>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleUploadVersion} className={`rounded-xl border p-4 space-y-3 ${role === 'student' && currentDoc.approval_status === 'rejected' ? 'border-red-300 bg-red-50/60' : 'border-dashed border-slate-200 bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              <UploadCloud size={17} className={role === 'student' && currentDoc.approval_status === 'rejected' ? 'text-red-500' : 'text-[#42b5e1]'} />
              <div>
                <p className={`text-sm font-semibold ${role === 'student' && currentDoc.approval_status === 'rejected' ? 'text-red-800' : 'text-slate-700'}`}>
                  {role === 'student' && currentDoc.approval_status === 'rejected'
                    ? t('documents.studentRejectedUploadCta')
                    : t('documents.modalVersionTitle')}
                </p>
                <p className="text-xs text-slate-400">{t('documents.modalVersionDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('documents.uploadDocTypeLabel2')}</label>
                <select className="input-field" value={versionFileType} onChange={e => setVersionFileType(e.target.value)}>
                  <option value="main">{t('documents.fileTypeMain')}</option>
                  <option value="certificate">{t('documents.fileTypeCertificate')}</option>
                  <option value="attachment">{t('documents.fileTypeAttachment')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('documents.modalVersionNoteLabel')}</label>
                <input
                  className="input-field"
                  value={versionNote}
                  onChange={e => setVersionNote(e.target.value)}
                  placeholder={t('documents.modalVersionNotePlaceholder')}
                />
              </div>
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

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setTimelineOpen(prev => !prev)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <History size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t('documents.modalTimeline')}</p>
                  <p className="text-xs text-slate-500">{t('documents.modalTimelineDesc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {t('documents.modalTimelineCount', { count: currentDoc.timeline?.length || 0 })}
                </span>
                <ChevronRight size={16} className={`text-slate-400 transition-transform ${timelineOpen ? 'rotate-90' : ''}`} />
              </div>
            </button>
            {timelineOpen && (
              <div className="border-t border-slate-100 px-4 py-3">
                {currentDoc.timeline?.length > 0 ? (
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
                              <p className="text-[11px] text-slate-400 mt-1">
                                {t('documents.modalTimelineBy', { name: item.actor_name })}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">{t('documents.modalTimelineEmpty')}</p>
                )}
              </div>
            )}
          </div>

          {currentDoc.description && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {t('documents.modalDescription')}
              </p>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{currentDoc.description}</p>
            </div>
          )}

          {/* Approval section — admin or staff approver, only for doc types that require approval */}
          {(role === 'admin' || role === 'staff') && approvalPanel && requiresApproval && currentDoc.approval_status !== undefined && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t('documents.approvalSectionTitle')}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{t('documents.approvalSectionDesc')}</p>
                  </div>
                </div>
                <span className={`inline-flex w-fit items-center px-2.5 py-1 text-xs font-semibold rounded-md ${approvalColor[currentDoc.approval_status] || ''}`}>
                  {approvalLabel(currentDoc.approval_status, t)}
                </span>
              </div>
              {currentDoc.approval_note && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('documents.approvalNotePrefix')}</p>
                  <p className="mt-1 text-sm text-slate-600">{currentDoc.approval_note}</p>
                </div>
              )}

              {!approvalAction ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => { setApprovalAction('approve'); setApprovalNote('') }}
                    disabled={approvingId !== null}
                    className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} />
                    {t('documents.approvalApproveBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setApprovalAction('reject'); setApprovalNote('') }}
                    disabled={approvingId !== null}
                    className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    <XCircle size={16} />
                    {t('documents.approvalRejectBtn')}
                  </button>
                </div>
              ) : (
                <div className={`rounded-xl border p-3 space-y-3 ${approvalAction === 'approve' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-start gap-2">
                    {approvalAction === 'approve'
                      ? <CheckCircle2 size={17} className="mt-0.5 text-emerald-700" />
                      : <XCircle size={17} className="mt-0.5 text-red-700" />
                    }
                    <div>
                      <p className={`text-sm font-semibold ${approvalAction === 'approve' ? 'text-emerald-800' : 'text-red-800'}`}>
                        {approvalAction === 'approve' ? t('documents.approvalApproveConfirmTitle') : t('documents.approvalRejectConfirmTitle')}
                      </p>
                      <p className={`mt-0.5 text-xs ${approvalAction === 'approve' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {approvalAction === 'approve' ? t('documents.approvalApproveConfirmDesc') : t('documents.approvalRejectConfirmDesc')}
                      </p>
                    </div>
                  </div>
                  <textarea
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder={approvalAction === 'approve' ? t('documents.approvalApproveNotePlaceholder') : t('documents.approvalRejectNotePlaceholder')}
                    className="input-field min-h-[88px] w-full resize-y bg-white text-sm"
                  />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => { setApprovalAction(null); setApprovalNote('') }}
                      disabled={approvingId !== null}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {t('common.cancel')}
                    </button>
                    {approvalAction === 'approve' ? (
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={approvingId !== null}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {approvingId === 'approve'
                          ? <Loader2 size={14} className="animate-spin" />
                          : <CheckCircle2 size={14} />
                        }
                        {t('documents.approvalConfirmApproveBtn')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={approvingId !== null || !approvalNote.trim()}
                        className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {approvingId === 'reject'
                          ? <Loader2 size={14} className="animate-spin" />
                          : <XCircle size={14} />
                        }
                        {t('documents.approvalConfirmRejectBtn')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {t('documents.commentsTitle', { count: comments.length })}
                  </p>
                  <p className="text-xs text-slate-500">{t('documents.commentsDesc')}</p>
                </div>
              </div>
            </div>
            {comments.length > 0 ? (
              <div className="mb-3 space-y-3">
                {comments.map(c => (
                  <div key={c.comment_id} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                      {c.user_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">{c.user_name}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(c.created_at).toLocaleString(locale)}
                        </span>
                        {(c.user_id === currentUser?.user_id || role === 'admin') && (
                          <button
                            onClick={() => handleDeleteComment(c.comment_id)}
                            className="ml-auto text-slate-300 hover:text-red-400"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center">
                <p className="text-sm font-medium text-slate-500">{t('documents.commentsEmpty')}</p>
                <p className="mt-0.5 text-xs text-slate-400">{t('documents.commentsEmptyDesc')}</p>
              </div>
            )}
            <form onSubmit={handleSendComment} className="space-y-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('documents.commentPlaceholder')}
                className="input-field min-h-[84px] w-full resize-y text-sm"
                disabled={sendingComment}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sendingComment || !commentText.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {sendingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {t('documents.commentSendBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-between">
          {role === 'admin' && (
            <button onClick={handleTrash} disabled={loading}
              className="text-sm text-amber-600 hover:text-amber-800 font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5">
              <span>🗑️</span>{loading ? t('documents.modalTrashingBtn') : t('documents.modalTrashBtn')}
            </button>
          )}
          <button onClick={onClose}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#42b5e1' }}>{t('documents.modalCloseBtn')}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
const parseDMY = (str) => {
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  return `${m[3]}-${m[2]}-${m[1]}`
}

const formatDMY = (iso) => {
  if (!iso) return ''
  const [y, mo, d] = iso.split('-')
  return `${d}/${mo}/${y}`
}

const addYears = (iso, n) => {
  if (!iso) return ''
  const [y, mo, d] = iso.split('-').map(Number)
  const date = new Date(y + n, mo - 1, d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const applyDateMask = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

// ─── DateInput ────────────────────────────────────────────────────────────────
function DateInput({ display, iso, onChange }) {
  const handleText = (raw) => {
    const formatted = applyDateMask(raw)
    onChange(formatted, parseDMY(formatted))
  }
  const handlePicker = (e) => {
    const val = e.target.value
    onChange(formatDMY(val), val)
  }
  return (
    <div className="relative">
      <input
        className="input-field pr-9"
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        value={display}
        onChange={e => handleText(e.target.value)}
        maxLength={10}
      />
      <div className="absolute right-0 top-0 h-full w-9 flex items-center justify-center">
        <Calendar size={16} className="text-slate-400 pointer-events-none" />
        <input
          type="date"
          tabIndex={-1}
          value={iso || ''}
          onChange={handlePicker}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </div>
  )
}

// ─── Export Modal ─────────────────────────────────────────────────────────────
function ExportModal({ onClose, search, docType, status, sort, degreeLevel = '', program = '', ownerRole = '', advisorId = '', programsByDegree: exportProgramsByDegree = programsByDegree, allProgramOptions: exportAllProgramOptions = allProgramOptions }) {
  const { language, locale, t } = useLanguage()
  const [exportMode, setExportMode] = useState('all')
  const [loading, setLoading]       = useState(false)
  const [filterRole, setFilterRole] = useState(ownerRole)
  const [filterDegree, setFilterDegree] = useState(degreeLevel)
  const [filterProgram, setFilterProgram] = useState(program)

  const roleLabel = useMemo(() => ({
    student:   t('documents.roleStudent'),
    advisor:   t('documents.roleAdvisor'),
    admin:     t('documents.roleAdmin'),
    staff:     t('documents.roleStaff'),
    executive: t('documents.roleExecutive'),
  }), [t])

  const degreeLabel = useMemo(() => ({
    bachelor: t('documents.degreeBachelor'),
    master:   t('documents.degreeMaster'),
    doctoral: t('documents.degreeDoctoral'),
  }), [t])

  const statusLabel = useMemo(() => ({
    active:        t('documents.statusActive'),
    expiring_soon: t('documents.statusExpiring'),
    expired:       t('documents.statusExpired'),
  }), [t])

  const modeLabels = useMemo(() => ({
    all:     t('documents.excelModeAll'),
    role:    t('documents.excelModeRole'),
    degree:  t('documents.excelModeDegree'),
    program: t('documents.excelModeProgram'),
  }), [t])

  const exportProgramOptions = filterDegree ? exportProgramsByDegree[filterDegree] || [] : exportAllProgramOptions

  useEffect(() => {
    if (filterProgram && !exportProgramOptions.includes(filterProgram)) setFilterProgram('')
  }, [filterDegree, filterProgram, exportProgramOptions])

  useEffect(() => {
    if (filterProgram && exportMode === 'program') setExportMode('all')
  }, [filterProgram, exportMode])

  const fetchAllDocs = async () => {
    const { data } = await documentService.getAll({
      search, doc_type: docType, status,
      sort_by: sort.by, sort_dir: sort.dir,
      limit: 9999, page: 1,
      ...(filterRole && { owner_role: filterRole }),
      ...(filterDegree && { degree_level: filterDegree }),
      ...(filterProgram && { program: filterProgram }),
      ...(advisorId && { advisor_id: advisorId }),
    })
    return data.documents || []
  }

  const exportFilters = [
    filterRole
      ? t('documents.exportFilterGroup', { value: roleLabel[filterRole] || filterRole })
      : t('documents.exportFilterGroupAll'),
    filterDegree
      ? t('documents.exportFilterLevel', { value: degreeLabel[filterDegree] || filterDegree })
      : t('documents.exportFilterLevelAll'),
    filterProgram
      ? t('documents.exportFilterProgram', { value: filterProgram })
      : t('documents.exportFilterProgramAll'),
  ].join(' | ')

  const formatPrintDate = (date) => date.toLocaleDateString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const compactDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}${m}${d}`
  }
  const safeFilePart = (value) => String(value || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 48)
  const scopeFileParts = () => [
    filterRole && (roleLabel[filterRole] || filterRole),
    filterDegree && (degreeLabel[filterDegree] || filterDegree),
    filterProgram,
  ].filter(Boolean).map(safeFilePart)

  const handleExport = async () => {
    setLoading(true)
    try {
      const docs = await fetchAllDocs()
      const now = new Date()
      const dateStr = formatPrintDate(now)

      const { default: ExcelJS } = await import('exceljs')
      const wb = new ExcelJS.Workbook()
      wb.creator = t('documents.excelSystem')
      wb.created = now

      const ws = wb.addWorksheet(t('documents.excelReport'), {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      })
      ws.pageSetup.margins = { left: 0.35, right: 0.35, top: 0.55, bottom: 0.55, header: 0.25, footer: 0.25 }
      ws.pageSetup.horizontalCentered = true
      ws.pageSetup.printTitlesRow = '1:8'
      ws.views = [{ showGridLines: false }]
      ws.headerFooter = {
        oddFooter: `&L${t('documents.excelSystem')}&C&P / &N&R${t('documents.excelDateLabel', { date: dateStr })}`,
      }

      const N = 10
      ws.columns = [
        { width: 6 }, { width: 30 }, { width: 9 },
        { width: 14 }, { width: 22 }, { width: 10 },
        { width: 28 }, { width: 13 }, { width: 13 },
        { width: 14 },
      ]

      const FNT  = 'TH Sarabun New'
      const fFill   = (c) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } })
      const fBorder = (s = 'thin') => ({ top: { style: s }, bottom: { style: s }, left: { style: s }, right: { style: s } })

      const addMergedRow = (values, height, styles = {}) => {
        const row = ws.addRow(values)
        row.height = height
        ws.mergeCells(row.number, 1, row.number, 2)
        ws.mergeCells(row.number, 3, row.number, 7)
        ws.mergeCells(row.number, 8, row.number, 10)
        row.getCell(1).style = styles.left || {}
        row.getCell(3).style = styles.center || {}
        row.getCell(10).style = styles.right || {}
        return row
      }

      addMergedRow(
        [t('documents.excelSystem'), '', t('documents.excelUniversity'), '', '', '', '', t('documents.excelDateLabel', { date: dateStr }), '', ''],
        21,
        {
          left:   { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'left',   vertical: 'middle' } },
          center: { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'center', vertical: 'middle' } },
          right:  { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'right',  vertical: 'middle' } },
        }
      )
      addMergedRow(['', '', t('documents.excelReport'), '', '', '', '', '', '', ''], 21, {
        center: { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'center', vertical: 'middle' } },
      })
      addMergedRow(['', '', t('documents.excelFaculty'), '', '', '', '', '', '', ''], 21, {
        center: { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'center', vertical: 'middle' } },
      })
      addMergedRow(
        [t('documents.excelMode', { mode: modeLabels[exportMode] }), '', '', '', '', '', '', t('documents.excelTotal', { count: docs.length }), '', ''],
        21,
        {
          left:  { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'right', vertical: 'middle' } },
          right: { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'right', vertical: 'middle' } },
        }
      )
      const filterRow = ws.addRow([t('documents.excelFilter', { filter: exportFilters }), ...Array(N - 1).fill('')])
      filterRow.height = 28
      ws.mergeCells(filterRow.number, 1, filterRow.number, N)
      filterRow.getCell(1).style = { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'right', vertical: 'middle', wrapText: true } }

      const spacer = ws.addRow(Array(N).fill(''))
      spacer.height = 4

      const COL_LABELS = [
        t('documents.excelColNo'),
        t('documents.excelColTitle'),
        t('documents.excelColType'),
        t('documents.excelColStudentId'),
        t('documents.excelColOwner'),
        t('documents.excelColLevel'),
        t('documents.excelColProgram'),
        t('documents.excelColIssueDate'),
        t('documents.excelColExpireDate'),
        t('documents.excelColStatus'),
      ]
      const addTableHeader = () => {
        const hr = ws.addRow(COL_LABELS)
        hr.height = 24
        const s = {
          font: { name: FNT, bold: true, size: 14, color: { argb: 'FF111827' } },
          fill: fFill('FFE5E7EB'),
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          border: fBorder('thin'),
        }
        for (let c = 1; c <= N; c++) hr.getCell(c).style = s
      }

      const docToRow = (doc, index) => [
        index + 1,
        doc.title || '',
        doc.doc_type || '',
        doc.owner_student_id || '',
        doc.owner_name || '',
        degreeLabel[doc.owner_degree_level] || '',
        getProgramDisplayName(doc.owner_program, language) || '',
        doc.issue_date ? new Date(doc.issue_date).toLocaleDateString(locale) : '',
        doc.no_expire ? t('documents.excelNoExpire') : (doc.expire_date ? new Date(doc.expire_date).toLocaleDateString(locale) : ''),
        doc.no_expire ? t('documents.excelNoExpire') : (statusLabel[computedStatus(doc)] || doc.status || ''),
      ]

      const addDataRows = (docList) => {
        docList.forEach((doc, i) => {
          const dr = ws.addRow(docToRow(doc, i))
          dr.height = 21
          const bg = i % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC'
          const base = {
            font: { name: FNT, size: 12, color: { argb: 'FF1B2631' } },
            fill: fFill(bg),
            border: fBorder('thin'),
          }
          for (let c = 1; c <= N; c++) {
            dr.getCell(c).style = {
              ...base,
              alignment: { vertical: 'middle', horizontal: [1, 3, 4, 6, 8, 9, 10].includes(c) ? 'center' : 'left', wrapText: [2, 5, 7, 10].includes(c) },
            }
          }
        })
      }

      const addSection = (label, count) => {
        const sr = ws.addRow([t('documents.excelGroupCount', { label, count }), ...Array(N - 1).fill('')])
        sr.height = 22
        ws.mergeCells(sr.number, 1, sr.number, N)
        sr.getCell(1).style = {
          font: { name: FNT, bold: true, size: 12, color: { argb: 'FF111827' } },
          fill: fFill('FFF1F5F9'),
          alignment: { horizontal: 'left', vertical: 'middle' },
          border: fBorder('thin'),
        }
      }

      const buildGrouped = (allDocs, keyFn, labelFn, orderedKeys = []) => {
        const groups = new Map()
        for (const d of allDocs) {
          const k = keyFn(d); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(d)
        }
        const keys = [...orderedKeys.filter(k => groups.has(k)), ...[...groups.keys()].filter(k => !orderedKeys.includes(k))]
        for (const k of keys) {
          const gDocs = groups.get(k); if (!gDocs?.length) continue
          const sp = ws.addRow(Array(N).fill('')); sp.height = 6
          addSection(labelFn(k), gDocs.length)
          addTableHeader()
          addDataRows(gDocs)
        }
      }

      if (exportMode === 'all') {
        addTableHeader(); addDataRows(docs)
      } else if (exportMode === 'role') {
        buildGrouped(docs, d => d.owner_role || 'other', k => roleLabel[k] || k, ['student', 'advisor', 'staff', 'admin', 'executive'])
      } else if (exportMode === 'degree') {
        buildGrouped(docs,
          d => d.owner_role === 'student' ? (d.owner_degree_level || 'bachelor') : (d.owner_role || 'other'),
          k => k in degreeLabel ? t('documents.excelDegreeGroup', { degree: degreeLabel[k] }) : (roleLabel[k] || k),
          ['bachelor', 'master', 'doctoral', 'advisor', 'staff'])
      } else if (exportMode === 'program') {
        buildGrouped(docs, d => d.owner_program || t('documents.excelUnspecifiedProgram'), k => getProgramDisplayName(k, language), Object.values(exportProgramsByDegree).flat())
      }

      const filenameParts = ['IRIS', compactDate(now), ...scopeFileParts(), modeLabels[exportMode]]
      const exportFilename = `${filenameParts.map(safeFilePart).filter(Boolean).join('_')}.xlsx`

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = exportFilename; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      toast.success(t('documents.exportSuccess', { count: docs.length }))
      onClose()
    } catch (err) { console.error(err); toast.error(t('documents.exportError')) }
    finally { setLoading(false) }
  }

  const opts = [
    { key: 'all',     label: t('documents.exportModeAll'),    desc: t('documents.exportModeAllDesc') },
    { key: 'role',    label: t('documents.exportModeRole'),   desc: t('documents.exportModeRoleDesc') },
    { key: 'degree',  label: t('documents.exportModeDegree'), desc: t('documents.exportModeDegreeDesc') },
    { key: 'program', label: t('documents.exportModeProgram'),desc: t('documents.exportModeProgramDesc') },
  ].filter(opt => !(filterProgram && opt.key === 'program'))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">{t('documents.exportTitle')}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{t('documents.exportDesc')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl ml-4">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 mb-3">
              <Download size={16} className="text-[#42b5e1]" />
              <div>
                <p className="text-sm font-semibold text-slate-700">{t('documents.exportSelectTitle')}</p>
                <p className="text-xs text-slate-400">{t('documents.exportSelectDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select className="input-field text-sm" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="">{t('documents.exportAllRole')}</option>
                <option value="student">{t('documents.roleStudent')}</option>
                <option value="advisor">{t('documents.roleAdvisor')}</option>
                <option value="staff">{t('documents.roleStaff')}</option>
                <option value="admin">{t('documents.roleAdmin')}</option>
                <option value="executive">{t('documents.roleExecutive')}</option>
              </select>
              <select className="input-field text-sm" value={filterDegree} onChange={e => setFilterDegree(e.target.value)}>
                <option value="">{t('documents.exportAllDegree')}</option>
                <option value="bachelor">{t('documents.degreeBachelor')}</option>
                <option value="master">{t('documents.degreeMaster')}</option>
                <option value="doctoral">{t('documents.degreeDoctoral')}</option>
              </select>
              <select className="input-field text-sm sm:col-span-2" value={filterProgram} onChange={e => setFilterProgram(e.target.value)}>
                <option value="">{t('documents.exportAllProgram')}</option>
                {exportProgramOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <ClipboardList size={16} className="text-[#42b5e1]" />
              <p className="text-sm font-semibold text-slate-700">{t('documents.exportFormatTitle')}</p>
            </div>
          {opts.map(opt => (
            <label key={opt.key}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all
                ${exportMode === opt.key
                  ? 'border-[#42b5e1] bg-[#f0f9ff]'
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
              <input type="radio" name="exportMode" value={opt.key}
                checked={exportMode === opt.key}
                onChange={() => setExportMode(opt.key)}
                className="accent-[#42b5e1] flex-shrink-0" />
              {(() => {
                const Icon = { all: ClipboardList, role: Users, degree: GraduationCap, program: School }[opt.key] || ClipboardList
                return <Icon size={20} className="text-[#42b5e1] flex-shrink-0" />
              })()}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">{opt.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
              </div>
              {exportMode === opt.key && (
                <span className="ml-auto flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: '#42b5e1' }}>✓</span>
              )}
            </label>
          ))}
          </div>
        </div>
        <div className="px-5 pb-5 pt-1 border-t border-slate-50 flex gap-3 mt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">
            {t('documents.exportCancelBtn')}
          </button>
          <button type="button" onClick={handleExport} disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#42b5e1' }}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('documents.exportingBtn')}
              </>
            ) : (
              <>
                <Download size={16} />
                {t('documents.exportDownloadBtn')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded, docTypes, docTypeCategories = {}, user }) {
  const { t } = useLanguage()
  const firstType = docTypes[0]?.type_code || ''
  const [form, setForm]             = useState({ title: '', doc_type: firstType, description: '', issue_date: '', expire_date: '', project_category: '', target_user_id: '' })
  const [noExpiry, setNoExpiry]     = useState(false)
  const [files, setFiles]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [dragOver, setDragOver]     = useState(false)
  const [displayIssueDate, setDisplayIssueDate]   = useState('')
  const [displayExpireDate, setDisplayExpireDate] = useState('')

  useEffect(() => {
    if (docTypes.length > 0 && !form.doc_type)
      setForm(p => ({ ...p, doc_type: docTypes[0].type_code }))
  }, [docTypes])

  useEffect(() => {
    if (form.doc_type === 'IRB' && form.issue_date && !noExpiry) {
      const expIso = addYears(form.issue_date, 3)
      setDisplayExpireDate(formatDMY(expIso))
      setForm(p => ({ ...p, expire_date: expIso }))
    }
  }, [form.doc_type, noExpiry])

  const handleIssueDateChange = (display, iso) => {
    setDisplayIssueDate(display)
    const expIso = (form.doc_type === 'IRB' && iso && !noExpiry) ? addYears(iso, 3) : null
    if (expIso) setDisplayExpireDate(formatDMY(expIso))
    setForm(p => ({ ...p, issue_date: iso, ...(expIso ? { expire_date: expIso } : {}) }))
  }

  const handleExpireDateChange = (display, iso) => {
    setDisplayExpireDate(display)
    setForm(p => ({ ...p, expire_date: iso }))
  }

  const handleFiles = (newFiles) => setFiles(prev => [...prev, ...Array.from(newFiles)].slice(0, 5))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (files.length === 0) return toast.error(t('documents.uploadNoFilesError'))
    if (user?.role === 'admin' && !form.target_user_id) return toast.error(t('documents.uploadNoOwnerError'))
    if (!form.issue_date) return toast.error(t('documents.uploadNoIssueDateError'))
    if (!noExpiry && !form.expire_date) return toast.error(t('documents.uploadNoExpireDateError'))
    if ((docTypeCategories[form.doc_type] || []).length > 0 && !form.project_category)
      return toast.error(t('documents.uploadNoCategoryError'))
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'expire_date' && noExpiry) return
        if (v) fd.append(k, v)
      })
      if (noExpiry) fd.append('no_expire', '1')
      files.forEach(f => fd.append('files', f))
      await documentService.upload(fd)
      toast.success(t('documents.uploadSuccess'))
      onUploaded(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || t('common.error')) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{t('documents.uploadTitle')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {user?.role === 'admin' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {t('documents.uploadOwnerLabel')} <span className="text-red-500">*</span>
              </label>
              <UserSearchInput value={form.target_user_id} onChange={(uid) => setForm(p => ({ ...p, target_user_id: uid }))} />
              <p className="text-xs text-slate-400 mt-1">{t('documents.uploadOwnerHint')}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              {t('documents.uploadDocNameLabel')} <span className="text-red-500">*</span>
            </label>
            <input className="input-field" value={form.title} required
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder={t('documents.uploadDocNamePlaceholder')} />
          </div>

          {(() => {
            const currentCategories = docTypeCategories[form.doc_type] || []
            return (
              <div className={`grid gap-3 ${currentCategories.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    {t('documents.uploadDocTypeLabel')} <span className="text-red-500">*</span>
                  </label>
                  <select className="input-field" value={form.doc_type}
                    onChange={e => setForm(p => ({ ...p, doc_type: e.target.value, project_category: '' }))}>
                    {docTypes.map(dt => <option key={dt.type_id} value={dt.type_code}>{dt.type_code}</option>)}
                  </select>
                </div>
                {currentCategories.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      {t('documents.uploadProjectCatLabel')} <span className="text-red-500">*</span>
                    </label>
                    <select className="input-field" value={form.project_category}
                      onChange={e => setForm(p => ({ ...p, project_category: e.target.value }))}>
                      <option value="">{t('documents.uploadProjectCatPlaceholder')}</option>
                      {currentCategories.map(c => (
                        <option key={c.category_id} value={c.category_code}>{c.category_name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )
          })()}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {t('documents.uploadIssueDateLabel')} <span className="text-red-500">*</span>
              </label>
              <DateInput display={displayIssueDate} iso={form.issue_date} onChange={handleIssueDateChange} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {t('documents.uploadExpireDateLabel')} {!noExpiry && <span className="text-red-500">*</span>}
              </label>
              {noExpiry ? (
                <div className="input-field bg-slate-50 text-slate-400 text-sm flex items-center cursor-not-allowed select-none">
                  {t('documents.uploadNoExpireDisplay')}
                </div>
              ) : (
                <DateInput display={displayExpireDate} iso={form.expire_date} onChange={handleExpireDateChange} />
              )}
              <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={noExpiry}
                  onChange={e => {
                    setNoExpiry(e.target.checked)
                    if (e.target.checked) {
                      setForm(p => ({ ...p, expire_date: '' }))
                      setDisplayExpireDate('')
                    }
                  }}
                  className="rounded border-slate-300 text-fiet-blue" />
                <span className="text-xs text-slate-500">{t('documents.uploadNoExpireCheckbox')}</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              {t('documents.uploadDescLabel')}
            </label>
            <textarea className="input-field resize-none" rows={2} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder={t('documents.uploadDescPlaceholder')} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              {t('documents.uploadFilesLabel')} <span className="text-red-500">*</span>
            </label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => document.getElementById('file-input-modal').click()}
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
              style={{ borderColor: dragOver ? '#42b5e1' : '#e2e8f0', backgroundColor: dragOver ? '#f0f9ff' : '#f8fafc' }}>
              <p className="text-2xl mb-1">📎</p>
              <p className="text-sm text-slate-500">{t('documents.uploadDragDrop')}</p>
              <input id="file-input-modal" type="file" multiple className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={e => handleFiles(e.target.files)} />
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-slate-400 hover:text-red-500 ml-2 flex-shrink-0">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">
              {t('documents.uploadCancelBtn')}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: '#42b5e1' }}>
              {loading ? t('documents.uploadingBtn') : t('documents.uploadBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { language, locale, t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const academicOptions = useAcademicOptions()
  const activeProgramsByDegree = academicOptions.programsByDegree || programsByDegree
  const activeProgramOptions = academicOptions.programs || allProgramOptions
  const { user } = useAuthStore()
  const isAdmin   = user?.role === 'admin'
  const isAdvisor = user?.role === 'advisor'
  const isStaff   = user?.role === 'staff'

  const [docs, setDocs]                       = useState([])
  const [docTypes, setDocTypes]               = useState([])
  const [docTypeCategories, setDocTypeCategories] = useState({})
  const [advisors, setAdvisors] = useState([])

  // lookup: type_code → requires_approval
  const docTypeApprovalMap = useMemo(() => {
    const map = {}
    docTypes.forEach(dt => { map[dt.type_code] = !!dt.requires_approval })
    return map
  }, [docTypes])

  // doc types ที่ staff คนนี้เป็น approver
  const staffApproverTypes = useMemo(() => {
    if (!isStaff || !user) return []
    return docTypes.filter(dt => dt.approver_user_id === user.user_id && dt.requires_approval)
  }, [isStaff, user, docTypes])
  const [advisorRelations, setAdvisorRelations] = useState({})
  const [summary, setSummary]   = useState(null)
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)

  const initialAdvisorPanel = isAdvisor && searchParams.get('panel') === 'mine' ? 'mine' : 'advisees'
  const [panel, setPanel]                 = useState(isAdvisor ? initialAdvisorPanel : 'library')
  const [activeTab, setActiveTab]       = useState('all')
  const [search, setSearch]             = useState(searchParams.get('search') || '')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [docType, setDocType]           = useState('')
  const [status, setStatus]             = useState('')
  const [advisorFilter, setAdvisorFilter] = useState('')
  const [degreeFilter, setDegreeFilter] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [sort, setSort]                 = useState({ by: 'created_at', dir: 'desc' })
  const [page, setPage]                 = useState(1)
  const [modal, setModal]               = useState(null)
  const [selected, setSelected]         = useState(null)

  const advisorOwnPanel = isAdvisor && panel === 'mine'
  const hasTabs   = isAdmin || (isAdvisor && !advisorOwnPanel)
  const tabs = isAdmin ? getAdminTabs(t) : (isAdvisor && !advisorOwnPanel) ? getAdvisorTabs(t) : []

  const statusLabel = useMemo(() => ({
    active:        t('documents.statusActive'),
    expiring_soon: t('documents.statusExpiring'),
    expired:       t('documents.statusExpired'),
  }), [t])

  useEffect(() => {
    if (!isAdvisor) return
    const nextPanel = searchParams.get('panel') === 'mine' ? 'mine' : 'advisees'
    const nextSearch = searchParams.get('search') || ''
    if (panel !== nextPanel) setPanel(nextPanel)
    if (search !== nextSearch) setSearch(nextSearch)
  }, [isAdvisor, searchParams])

  // Load reference data
  useEffect(() => {
    docTypeService.getAll().then(r => setDocTypes(r.data || [])).catch(() => {})
    docTypeService.getAllCategories().then(r => setDocTypeCategories(r.data || {})).catch(() => {})
    if (isAdmin) {
      userService.getAdvisors({ include_relations: 1 }).then(r => {
        setAdvisors(r.data?.advisors || [])
        setAdvisorRelations(r.data?.relations || {})
      }).catch(() => {})
      documentService.getSummary().then(r => setSummary(r.data)).catch(() => {})
    }
  }, [isAdmin])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [panel, activeTab, search, docType, status, advisorFilter, degreeFilter, programFilter, sort])

  useEffect(() => {
    const allowedPrograms = degreeFilter ? activeProgramsByDegree[degreeFilter] || [] : activeProgramOptions
    if (programFilter && !allowedPrograms.includes(programFilter)) setProgramFilter('')
  }, [degreeFilter, programFilter])

  useEffect(() => {
    if (advisorOwnPanel) {
      if (degreeFilter) setDegreeFilter('')
      if (programFilter) setProgramFilter('')
      if (advisorFilter) setAdvisorFilter('')
      return
    }
    const tabParams = tabs.find(t => t.key === activeTab)?.params || {}
    if (tabParams.owner_role && tabParams.owner_role !== 'student') {
      setDegreeFilter('')
      setProgramFilter('')
      setAdvisorFilter('')
    }
    if (tabParams.degree_level && degreeFilter) setDegreeFilter('')
  }, [activeTab, degreeFilter, advisorOwnPanel])

  useEffect(() => {
    if (!advisorFilter) return
    const relation = advisorRelations[advisorFilter]
    if (!relation) return
    const activeDegree = ['bachelor', 'master', 'doctoral'].includes(activeTab) ? activeTab : degreeFilter
    const degreeMismatch = activeDegree && relation.degrees.length > 0 && !relation.degrees.includes(activeDegree)
    const programMismatch = programFilter && relation.programs.length > 0 && !relation.programs.includes(programFilter)
    if (degreeMismatch || programMismatch) setAdvisorFilter('')
  }, [advisorFilter, advisorRelations, activeTab, degreeFilter, programFilter])

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const tabParams = tabs.find(tab => tab.key === activeTab)?.params || {}
      const params = {
        ...(advisorOwnPanel ? { owner_role: 'advisor' } : tabParams),
        search: debouncedSearch, doc_type: docType, status,
        ...(isAdmin && panel === 'approval' && { approval_status: 'pending' }),
        ...(isStaff && panel === 'approver' && { scope: 'approver' }),
        sort_by: sort.by, sort_dir: sort.dir,
        page, limit: LIMIT,
        ...(advisorFilter && { advisor_id: advisorFilter }),
        ...(degreeFilter && !tabParams.degree_level && !advisorOwnPanel && { degree_level: degreeFilter }),
        ...(programFilter && !advisorOwnPanel && { program: programFilter }),
      }
      const { data } = await documentService.getAll(params)
      setDocs(data.documents || [])
      setTotal(data.total || 0)
    } catch { toast.error(t('documents.loadError')) }
    finally { setLoading(false) }
  }, [activeTab, debouncedSearch, docType, status, sort, page, advisorFilter, degreeFilter, programFilter, isAdmin, panel, advisorOwnPanel])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const openDetail = async (doc) => {
    try {
      const { data } = await documentService.getById(doc.doc_id)
      setSelected(data); setModal('detail')
    } catch { toast.error(t('documents.loadDetailError')) }
  }

  const handleSort = (key) => {
    setSort(prev => prev.by === key ? { by: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { by: key, dir: 'desc' })
  }

  const handlePanelChange = (nextPanel) => {
    setPanel(nextPanel)
    setActiveTab('all')
    setSearch('')
    setStatus('')
    setAdvisorFilter('')
    setDegreeFilter('')
    setProgramFilter('')
    if (isAdvisor) {
      setSearchParams({ panel: nextPanel })
    }
  }

  const handleTabChange = (key) => { setActiveTab(key); setAdvisorFilter(''); setDegreeFilter(''); setProgramFilter('') }

  const handleDegreeChange = (value) => {
    setDegreeFilter(value)
    if (advisorFilter && value) {
      const rel = advisorRelations[advisorFilter]
      if (rel?.degrees?.length > 0 && !rel.degrees.includes(value)) setAdvisorFilter('')
    }
    if (programFilter && value && !(activeProgramsByDegree[value] || []).includes(programFilter)) {
      setProgramFilter('')
    }
  }

  const handleProgramChange = (value) => {
    setProgramFilter(value)
    if (advisorFilter && value) {
      const rel = advisorRelations[advisorFilter]
      if (rel?.programs?.length > 0 && !rel.programs.includes(value)) setAdvisorFilter('')
    }
    if (!value || degreeTabKey) return
    const inferredDegree = Object.entries(activeProgramsByDegree)
      .find(([, programs]) => programs.includes(value))?.[0] || getDegreeForProgram(value)
    if (inferredDegree && inferredDegree !== degreeFilter) setDegreeFilter(inferredDegree)
  }

  const handleAdvisorChange = (value) => {
    setAdvisorFilter(value)
    if (!value) return
    const rel = advisorRelations[value]
    if (!rel) return
    if (degreeFilter && rel.degrees.length > 0 && !rel.degrees.includes(degreeFilter)) {
      setDegreeFilter('')
      setProgramFilter('')
      return
    }
    if (programFilter && rel.programs.length > 0 && !rel.programs.includes(programFilter)) {
      setProgramFilter('')
    }
  }

  const refreshAll = useCallback(() => {
    fetchDocs()
    if (isAdmin) documentService.getSummary().then(r => setSummary(r.data)).catch(() => {})
  }, [fetchDocs, isAdmin])

  const isStudentTab = ['all', 'bachelor', 'master', 'doctoral'].includes(activeTab)
  const showStudentId = isAdmin || (isAdvisor && !advisorOwnPanel)
  const showOwner     = isAdmin || (isAdvisor && !advisorOwnPanel)
  const showGroup     = isAdmin && activeTab === 'all'
  const showAdvisorFilter = isAdmin && isStudentTab
  const degreeTabKey  = ['bachelor', 'master', 'doctoral'].includes(activeTab) ? activeTab : null
  const showDegreeFilter = (isAdmin || isAdvisor) && !advisorOwnPanel && activeTab === 'all'
  const programFilterDegree = degreeTabKey || degreeFilter
  const currentTabParams = tabs.find(tab => tab.key === activeTab)?.params || {}

  const advisorRelation = advisorFilter ? advisorRelations[advisorFilter] : null
  const availableDegrees = advisorRelation?.degrees?.length > 0
    ? advisorRelation.degrees
    : ['bachelor', 'master', 'doctoral']

  const advisorProgramList = advisorRelation?.programs?.length > 0 ? advisorRelation.programs : null
  const basePrograms = programFilterDegree ? activeProgramsByDegree[programFilterDegree] || [] : activeProgramOptions
  const showProgramFilter = (isAdmin || isAdvisor) && !advisorOwnPanel && (activeTab === 'all' || degreeTabKey != null)
  const programOptions = advisorProgramList ? basePrograms.filter(p => advisorProgramList.includes(p)) : basePrograms

  const filteredAdvisors = advisors.filter(advisor => {
    const relation = advisorRelations[advisor.user_id]
    if (!relation) return !degreeFilter && !programFilter && !degreeTabKey
    const activeDegree = degreeTabKey || degreeFilter
    const degreeOk = !activeDegree || relation.degrees.length === 0 || relation.degrees.includes(activeDegree)
    const programOk = !programFilter || relation.programs.length === 0 || relation.programs.includes(programFilter)
    return degreeOk && programOk
  })

  const pageTitle = isAdmin ? t('documents.titleAdmin')
    : advisorOwnPanel        ? t('documents.titleAdvisorMine')
    : isAdvisor              ? t('documents.titleAdvisor')
    : user?.role === 'staff' ? t('documents.titleStaff')
    : t('documents.titleStudent')

  const roleDisplay = isAdmin ? t('documents.roleDisplayAdmin')
    : isAdvisor              ? t('documents.roleDisplayAdvisor')
    : user?.role === 'staff' ? t('documents.roleDisplayStaff')
    : t('documents.roleDisplayStudent')

  const panelTitle = isAdmin && panel === 'approval' ? t('documents.panelApprovalTitle') : pageTitle
  const panelDesc = isAdmin && panel === 'approval'
    ? t('documents.panelApprovalDesc')
    : advisorOwnPanel
      ? t('documents.panelAdvisorMineDesc')
      : isAdvisor
        ? t('documents.panelAdvisorAdviseesDesc')
        : t('documents.panelLibraryDesc')

  return (
    <div className="space-y-5 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>
            {roleDisplay}
          </p>
          <h1 className="text-2xl font-bold text-slate-800">{panelTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{panelDesc}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button onClick={() => setModal('export')}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all whitespace-nowrap flex items-center gap-1.5">
              <span>⬇</span> {t('documents.exportExcelBtn')}
            </button>
          )}
          {(isAdmin || user?.role === 'student' || user?.role === 'staff' || advisorOwnPanel) && (
            <button onClick={() => setModal('upload')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all whitespace-nowrap"
              style={{ backgroundColor: '#42b5e1' }}>
              {t('documents.uploadDocBtn')}
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handlePanelChange('library')}
            className={`rounded-xl border p-4 text-left transition-all ${
              panel === 'library'
                ? 'border-[#42b5e1] bg-[#f0f9ff] shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <FileText size={20} className={panel === 'library' ? 'text-[#42b5e1]' : 'text-slate-400'} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{t('documents.panelLibraryTitle')}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t('documents.panelLibraryHint')}</p>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handlePanelChange('approval')}
            className={`rounded-xl border p-4 text-left transition-all ${
              panel === 'approval'
                ? 'border-amber-300 bg-amber-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className={panel === 'approval' ? 'text-amber-600' : 'text-slate-400'} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{t('documents.panelApprovalTitle')}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t('documents.panelApprovalHint')}</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Staff approver panel switcher — แสดงเฉพาะ staff ที่มี assigned doc types */}
      {isStaff && staffApproverTypes.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handlePanelChange('library')}
            className={`rounded-xl border p-4 text-left transition-all ${
              panel === 'library'
                ? 'border-[#42b5e1] bg-[#f0f9ff] shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <FileText size={20} className={panel === 'library' ? 'text-[#42b5e1]' : 'text-slate-400'} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{t('documents.panelMyDocsTitle')}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t('documents.panelMyDocsHint')}</p>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handlePanelChange('approver')}
            className={`rounded-xl border p-4 text-left transition-all ${
              panel === 'approver'
                ? 'border-amber-300 bg-amber-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className={panel === 'approver' ? 'text-amber-600' : 'text-slate-400'} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{t('documents.panelStaffApproverTitle')}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t('documents.panelStaffApproverHint', { types: staffApproverTypes.map(dt => dt.type_code).join(', ') })}
                </p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Summary Cards — admin only */}
      {isAdmin && panel === 'library' && summary && <SummaryCards summary={summary} activeTab={activeTab} />}

      {/* Tab Bar */}
      {hasTabs && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <TabBar tabs={tabs} activeTab={activeTab} onChange={handleTabChange} summary={isAdmin && panel === 'library' ? summary : null} />

          {isAdmin && panel === 'approval' && (
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-2 text-sm text-amber-800">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <p>{t('documents.panelApprovalNotice')}</p>
              </div>
            </div>
          )}
          {isStaff && panel === 'approver' && (
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-2 text-sm text-amber-800">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <p>{t('documents.panelStaffApproverNotice')}</p>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <input className="input-field w-full sm:max-w-xs" placeholder={t('documents.filterSearchPlaceholder')}
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input-field w-full sm:w-auto sm:max-w-[150px]" value={docType} onChange={e => setDocType(e.target.value)}>
              <option value="">{t('documents.filterAllTypes')}</option>
              {docTypes.map(dt => <option key={dt.type_id} value={dt.type_code}>{dt.type_code}</option>)}
            </select>
            {panel !== 'approval' && (
              <select className="input-field w-full sm:w-auto sm:max-w-[150px]" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">{t('documents.filterAllExpiryStatus')}</option>
                <option value="active">{t('documents.statusActive')}</option>
                <option value="expiring_soon">{t('documents.statusExpiring')}</option>
                <option value="expired">{t('documents.statusExpired')}</option>
              </select>
            )}
            {showDegreeFilter && (
              <select className="input-field w-full sm:w-auto sm:max-w-[170px]" value={degreeFilter} onChange={e => handleDegreeChange(e.target.value)}>
                <option value="">{t('documents.filterAllDegrees')}</option>
                {availableDegrees.includes('bachelor') && <option value="bachelor">{t('documents.degreeBachelor')}</option>}
                {availableDegrees.includes('master') && <option value="master">{t('documents.degreeMaster')}</option>}
                {availableDegrees.includes('doctoral') && <option value="doctoral">{t('documents.degreeDoctoral')}</option>}
              </select>
            )}
            {showAdvisorFilter && advisors.length > 0 && (
              <select className="input-field w-full sm:w-auto sm:max-w-[180px]" value={advisorFilter} onChange={e => handleAdvisorChange(e.target.value)}>
                <option value="">{t('documents.filterAllAdvisors')}</option>
                {filteredAdvisors.map(a => <option key={a.user_id} value={a.user_id}>{a.name}</option>)}
              </select>
            )}
            {showProgramFilter && (
              <select className="input-field w-full sm:w-auto sm:max-w-[220px]" value={programFilter} onChange={e => handleProgramChange(e.target.value)}>
                <option value="">{t('documents.filterAllPrograms')}</option>
                {programOptions.map(b => <option key={b} value={b}>{getProgramDisplayName(b, language)}</option>)}
              </select>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: showOwner ? '900px' : '680px' }}>
              <thead className="border-b border-slate-200">
                <tr className="bg-slate-50">
                  <SortTh sortKey="title"        currentSort={sort} onSort={handleSort}>{t('documents.colTitle')}</SortTh>
                  <SortTh sortKey="doc_type"     currentSort={sort} onSort={handleSort}>{t('documents.colType')}</SortTh>
                  {showGroup     && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{t('documents.colGroup')}</th>}
                  {showStudentId && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{t('documents.colStudentId')}</th>}
                  {showOwner     && <SortTh sortKey="owner_name" currentSort={sort} onSort={handleSort}>{t('documents.colOwner')}</SortTh>}
                  <SortTh sortKey="issue_date"   currentSort={sort} onSort={handleSort}>{t('documents.colIssueDate')}</SortTh>
                  <SortTh sortKey="expire_date"  currentSort={sort} onSort={handleSort}>{t('documents.colExpireDate')}</SortTh>
                  <SortTh sortKey="days_remaining" currentSort={sort} onSort={handleSort}>{t('documents.colRemaining')}</SortTh>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{t('documents.colExpiryStatus')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{t('documents.colApprovalStatus')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{t('documents.colFiles')}</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={12} className="text-center py-16 text-slate-400 text-sm">{t('common.loading')}</td></tr>
                ) : docs.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-16">
                      <p className="text-slate-300 text-4xl mb-3">○</p>
                      <p className="text-slate-400 text-sm">
                        {isAdmin && panel === 'approval' ? t('documents.noApprovalDocuments') : t('documents.noDocuments')}
                      </p>
                    </td>
                  </tr>
                ) : docs.map(doc => {
                  const noExp = !!doc.no_expire
                  const days  = doc.days_remaining
                  const daysColor = noExp ? 'text-slate-400' : days < 0 ? 'text-red-600 font-semibold' : days <= 30 ? 'text-amber-600 font-semibold' : 'text-slate-500'
                  const gb = showGroup ? groupBadge(doc, t) : null
                  return (
                    <tr key={doc.doc_id}
                      className={`transition-colors cursor-pointer ${rowBg(doc)}`}
                      onClick={() => openDetail(doc)}>
                      <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[180px] truncate">{doc.title}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded whitespace-nowrap"
                          style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>{doc.doc_type}</span>
                      </td>
                      {showGroup && (
                        <td className="px-4 py-3.5">
                          {gb && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded whitespace-nowrap"
                              style={{ backgroundColor: gb.bg, color: gb.color }}>{gb.text}</span>
                          )}
                        </td>
                      )}
                      {showStudentId && (
                        <td className="px-4 py-3.5 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {doc.owner_student_id || '—'}
                        </td>
                      )}
                      {showOwner && (
                        <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap max-w-[130px] truncate">
                          {doc.owner_name}
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-slate-500 text-xs tabular-nums whitespace-nowrap">
                        {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString(locale) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs tabular-nums whitespace-nowrap">
                        {noExp
                          ? <span className="text-slate-400 italic">{t('documents.noExpireShort')}</span>
                          : <span className="text-slate-500">{doc.expire_date ? new Date(doc.expire_date).toLocaleDateString(locale) : '—'}</span>}
                      </td>
                      <td className={`px-4 py-3.5 text-xs tabular-nums whitespace-nowrap ${daysColor}`}>
                        {noExp ? '—' : days == null ? '—' : days < 0
                          ? t('documents.daysOver', { days: Math.abs(days) })
                          : t('documents.daysLeft', { days })}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-md whitespace-nowrap
                          ${noExp ? 'bg-slate-50 text-slate-500 border border-slate-200' : statusColor[computedStatus(doc)] || 'bg-slate-100 text-slate-500'}`}>
                          {noExp ? t('documents.noExpireShort') : statusLabel[computedStatus(doc)] || doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {docTypeApprovalMap[doc.doc_type] !== false && (
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md whitespace-nowrap ${approvalColor[doc.approval_status] || ''}`}>
                            {approvalLabel(doc.approval_status, t)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {doc.file_count > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {doc.file_count}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#42b5e1' }}>
                          {t('documents.viewDetail')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > LIMIT && (
            <div className="px-4 py-3 border-t border-slate-100">
              <PaginationBar page={page} total={total} limit={LIMIT} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Non-tab layout (student / staff) */}
      {!hasTabs && (
        <>
          {/* Filter Bar */}
          <div className="flex flex-wrap gap-3">
            <input className="input-field w-full sm:max-w-xs" placeholder={t('documents.filterSearchStudentPlaceholder')}
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input-field w-full sm:w-auto sm:max-w-[150px]" value={docType} onChange={e => setDocType(e.target.value)}>
              <option value="">{t('documents.filterAllTypes')}</option>
              {docTypes.map(dt => <option key={dt.type_id} value={dt.type_code}>{dt.type_code}</option>)}
            </select>
            <select className="input-field w-full sm:w-auto sm:max-w-[150px]" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">{t('documents.filterAllExpiryStatus')}</option>
              <option value="active">{t('documents.statusActive')}</option>
              <option value="expiring_soon">{t('documents.statusExpiring')}</option>
              <option value="expired">{t('documents.statusExpired')}</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '680px' }}>
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <SortTh sortKey="title"          currentSort={sort} onSort={handleSort}>{t('documents.colTitle')}</SortTh>
                    <SortTh sortKey="doc_type"       currentSort={sort} onSort={handleSort}>{t('documents.colType')}</SortTh>
                    <SortTh sortKey="issue_date"     currentSort={sort} onSort={handleSort}>{t('documents.colIssueDate')}</SortTh>
                    <SortTh sortKey="expire_date"    currentSort={sort} onSort={handleSort}>{t('documents.colExpireDate')}</SortTh>
                    <SortTh sortKey="days_remaining" currentSort={sort} onSort={handleSort}>{t('documents.colRemaining')}</SortTh>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{t('documents.colExpiryStatus')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{t('documents.colApprovalStatus')}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{t('documents.colFiles')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-16 text-slate-400 text-sm">{t('common.loading')}</td></tr>
                  ) : docs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-16">
                        <p className="text-slate-300 text-4xl mb-3">○</p>
                        <p className="text-slate-400 text-sm">{t('documents.noDocuments')}</p>
                      </td>
                    </tr>
                  ) : docs.map(doc => {
                    const noExp = !!doc.no_expire
                    const days  = doc.days_remaining
                    const daysColor = noExp ? 'text-slate-400' : days < 0 ? 'text-red-600 font-semibold' : days <= 30 ? 'text-amber-600 font-semibold' : 'text-slate-500'
                    return (
                      <tr key={doc.doc_id}
                        className={`transition-colors cursor-pointer ${rowBg(doc)}`}
                        onClick={() => openDetail(doc)}>
                        <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[200px] truncate">{doc.title}</td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 text-xs font-semibold rounded whitespace-nowrap"
                            style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>{doc.doc_type}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs tabular-nums whitespace-nowrap">
                          {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString(locale) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs tabular-nums whitespace-nowrap">
                          {noExp
                            ? <span className="text-slate-400 italic">{t('documents.noExpireShort')}</span>
                            : <span className="text-slate-500">{doc.expire_date ? new Date(doc.expire_date).toLocaleDateString(locale) : '—'}</span>}
                        </td>
                        <td className={`px-4 py-3.5 text-xs tabular-nums whitespace-nowrap ${daysColor}`}>
                          {noExp ? '—' : days == null ? '—' : days < 0
                            ? t('documents.daysOver', { days: Math.abs(days) })
                            : t('documents.daysLeft', { days })}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-0.5 text-xs font-medium rounded-md whitespace-nowrap
                            ${noExp ? 'bg-slate-50 text-slate-500 border border-slate-200' : statusColor[computedStatus(doc)] || 'bg-slate-100 text-slate-500'}`}>
                            {noExp ? t('documents.noExpireShort') : statusLabel[computedStatus(doc)] || doc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {docTypeApprovalMap[doc.doc_type] !== false && (
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md whitespace-nowrap ${approvalColor[doc.approval_status] || ''}`}>
                              {approvalLabel(doc.approval_status, t)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {doc.file_count > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {doc.file_count}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#42b5e1' }}>
                            {t('documents.viewDetail')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!loading && total > LIMIT && (
              <div className="px-4 py-3 border-t border-slate-100">
                <PaginationBar page={page} total={total} limit={LIMIT} onPageChange={setPage} />
              </div>
            )}
          </div>
        </>
      )}

      {modal === 'export' && (
        <ExportModal
          onClose={() => setModal(null)}
          search={search} docType={docType} status={status} sort={sort}
          ownerRole={currentTabParams.owner_role || ''}
          degreeLevel={currentTabParams.degree_level || degreeFilter}
          program={programFilter}
          advisorId={advisorFilter}
          programsByDegree={activeProgramsByDegree}
          allProgramOptions={activeProgramOptions}
        />
      )}
      {modal === 'upload' && (
        <UploadModal onClose={() => setModal(null)} onUploaded={refreshAll}
          docTypes={docTypes} docTypeCategories={docTypeCategories} user={user} />
      )}
      {modal === 'detail' && selected && (
        <DetailModal doc={selected} role={user?.role}
          approvalPanel={(isAdmin && panel === 'approval') || (isStaff && panel === 'approver')}
          requiresApproval={docTypeApprovalMap[selected.doc_type] !== false}
          onClose={() => { setModal(null); setSelected(null) }}
          onDeleted={refreshAll} />
      )}
    </div>
  )
}

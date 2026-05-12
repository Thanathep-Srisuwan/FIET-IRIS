import { useEffect, useState, useCallback, useRef } from 'react'
import { documentService, docTypeService, userService } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import useDebouncedValue from '../../hooks/useDebouncedValue'
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
  MoreHorizontal
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────
const statusLabel = { active: 'ปกติ', expiring_soon: 'ใกล้หมดอายุ', expired: 'หมดอายุ' }
const statusColor = {
  active:        'bg-emerald-50 text-emerald-700 border border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border border-amber-200',
  expired:       'bg-red-50 text-red-600 border border-red-200',
}
const degreeLabel = { bachelor: 'ป.ตรี', master: 'ป.โท', doctoral: 'ป.เอก' }
const branchesByDegree = {
  bachelor: [
    'ครุศาสตร์โยธา',
    'ครุศาสตร์เครื่องกล',
    'ครุศาสตร์ไฟฟ้า',
    'ครุศาสตร์อุตสาหการ',
    'เทคโนโลยีการศึกษาและสื่อสารมวลชน',
    'เทคโนโลยีการพิมพ์และบรรจุภัณฑ์',
    'เทคโนโลยีอุตสาหกรรม',
    'วิทยาการคอมพิวเตอร์ประยุกต์ – มัลติมีเดีย',
  ],
  master: [
    'เทคโนโลยีการเรียนรู้และสื่อสารมวลชน',
    'วิศวกรรมเครื่องกล',
    'วิศวกรรมไฟฟ้า',
    'วิศวกรรมโยธา',
    'วิศวกรรมอุตสาหการ',
    'เทคโนโลยีบรรจุภัณฑ์และนวัตกรรมการพิมพ์',
    'คอมพิวเตอร์และเทคโนโลยีสารสนเทศ',
  ],
  doctoral: [
    'นวัตกรรมการเรียนรู้และเทคโนโลยี',
  ],
}
const roleLabel   = { student: 'นักศึกษา', advisor: 'อาจารย์', admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร', staff: 'เจ้าหน้าที่' }
const allBranchOptions = [...new Set(Object.values(branchesByDegree).flat())]
const LIMIT = 15

const getDegreeForBranch = (branch) => {
  if (!branch) return ''
  const matches = Object.entries(branchesByDegree)
    .filter(([, branches]) => branches.includes(branch))
    .map(([degree]) => degree)
  return matches.length === 1 ? matches[0] : ''
}

const computedStatus = (doc) => {
  if (doc.no_expire) return null
  if (doc.days_remaining == null) return doc.status
  if (doc.days_remaining < 0)   return 'expired'
  if (doc.days_remaining <= 90) return 'expiring_soon'
  return 'active'
}

const groupBadge = (doc) => {
  if (!doc.owner_role || doc.owner_role === 'admin') return null
  if (doc.owner_role === 'advisor') return { text: 'อาจารย์',    bg: '#fef3c7', color: '#92400e' }
  if (doc.owner_role === 'staff')   return { text: 'เจ้าหน้าที่', bg: '#dcfce7', color: '#166534' }
  if (doc.owner_role === 'student') {
    switch (doc.owner_degree_level) {
      case 'master':   return { text: 'ป.โท', bg: '#f3e8ff', color: '#6b21a8' }
      case 'doctoral': return { text: 'ป.เอก', bg: '#fee2e2', color: '#991b1b' }
      default:         return { text: 'ป.ตรี', bg: '#e0f4fb', color: '#0d2d3e' }
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

const fileTypeLabel = {
  main: 'เอกสารหลัก',
  certificate: 'บันทึกข้อความรับรอง',
  attachment: 'ไฟล์แนบ',
}

const timelineIcon = {
  created: FileText,
  file_version_uploaded: UploadCloud,
  trashed: Trash2,
  restored: ClipboardList,
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const getAdminTabs = () => [
  { key: 'all',      label: 'ทั้งหมด',     summaryKey: 'all',      params: {} },
  { key: 'bachelor', label: 'นศ. ป.ตรี',   summaryKey: 'bachelor', params: { owner_role: 'student', degree_level: 'bachelor' } },
  { key: 'master',   label: 'นศ. ป.โท',    summaryKey: 'master',   params: { owner_role: 'student', degree_level: 'master'   } },
  { key: 'doctoral', label: 'นศ. ป.เอก',   summaryKey: 'doctoral', params: { owner_role: 'student', degree_level: 'doctoral' } },
  { key: 'advisor',  label: 'อาจารย์',      summaryKey: 'advisor',  params: { owner_role: 'advisor' } },
  { key: 'staff',    label: 'เจ้าหน้าที่', summaryKey: 'staff',    params: { owner_role: 'staff'   } },
]

const getAdvisorTabs = () => [
  { key: 'all',      label: 'ทั้งหมด', params: {} },
  { key: 'bachelor', label: 'ป.ตรี',   params: { degree_level: 'bachelor' } },
  { key: 'master',   label: 'ป.โท',    params: { degree_level: 'master'   } },
  { key: 'doctoral', label: 'ป.เอก',   params: { degree_level: 'doctoral' } },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCards({ summary, activeTab }) {
  const stats = summary?.[activeTab] ?? summary?.all ?? {}
  const active = Math.max(0, (stats.total || 0) - (stats.expired || 0) - (stats.expiring_soon || 0) - (stats.no_expire_count || 0))
  const cards = [
    { label: 'ทั้งหมด',     value: stats.total         || 0, colorClass: 'text-slate-700',   bg: 'bg-slate-100' },
    { label: 'ปกติ',        value: active,                   colorClass: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'ใกล้หมดอายุ', value: stats.expiring_soon || 0, colorClass: 'text-amber-700',   bg: 'bg-amber-50' },
    { label: 'หมดอายุ',     value: stats.expired       || 0, colorClass: 'text-red-700',     bg: 'bg-red-50' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(card => (
        <div key={card.label} className={`${card.bg} rounded-xl px-4 py-3`}>
          <p className="text-xs text-slate-500 mb-1">{card.label}</p>
          <p className={`text-2xl font-bold ${card.colorClass}`}>{card.value.toLocaleString()}</p>
          <p className="text-xs text-slate-400">รายการ</p>
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
        แสดง {((page - 1) * limit + 1).toLocaleString()}–{Math.min(page * limit, total).toLocaleString()} จาก {total.toLocaleString()} รายการ
      </p>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
          <ChevronLeft size={14} /> ก่อนหน้า
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
          ถัดไป <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── User Search Input ────────────────────────────────────────────────────────
function UserSearchInput({ value, onChange }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const [selected, setSelected] = useState(null)
  const wrapRef  = useRef(null)
  const timerRef = useRef(null)

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
          placeholder="พิมพ์รหัสนักศึกษา, ชื่อ หรืออีเมล..."
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
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl px-4 py-3 text-sm text-slate-400">ไม่พบผู้ใช้</div>
      )}
    </div>
  )
}

function FileVersionRow({ file, docId, isCurrent = false, previewLoading, onPreview }) {
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
      toast.error('ไม่สามารถดาวน์โหลดได้')
    }
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${isCurrent ? 'bg-white border-slate-200' : 'bg-white/70 border-slate-100'}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Icon size={20} className={file.mime_type?.includes('pdf') ? 'text-red-500' : 'text-slate-400'} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{file.file_name}</p>
            {isCurrent && <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">ปัจจุบัน</span>}
          </div>
          <p className="text-xs text-slate-400">
            v{file.version_no || 1} · {(file.file_size / 1024).toFixed(1)} KB · {fileTypeLabel[file.file_type] || 'ไฟล์แนบ'}
            {file.uploaded_by_name ? ` · โดย ${file.uploaded_by_name}` : ''}
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
            {previewLoading[file.file_id] ? '...' : 'ดู'}
          </button>
        )}
        <button
          type="button"
          onClick={handleDownload}
          className="text-xs px-2.5 py-1 rounded-lg text-white"
          style={{ backgroundColor: '#42b5e1' }}>
          โหลด
        </button>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ doc, onClose, onDeleted, role }) {
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState({})
  const [currentDoc, setCurrentDoc] = useState(doc)
  const [versionFiles, setVersionFiles] = useState([])
  const [versionFileType, setVersionFileType] = useState('attachment')
  const [versionNote, setVersionNote] = useState('')
  const [uploadingVersion, setUploadingVersion] = useState(false)

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
    } catch { toast.error('ไม่สามารถเปิดไฟล์ได้') }
    finally { setPreviewLoading(p => ({ ...p, [f.file_id]: false })) }
  }

  const handleTrash = async () => {
    if (!confirm(`ย้าย "${currentDoc.title}" ไปถังขยะ?`)) return
    setLoading(true)
    try {
      await documentService.delete(currentDoc.doc_id)
      toast.success('ย้ายเอกสารไปถังขยะสำเร็จ')
      onDeleted(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด') }
    finally { setLoading(false) }
  }

  const handleVersionFiles = (newFiles) => {
    setVersionFiles(prev => [...prev, ...Array.from(newFiles)].slice(0, 5))
  }

  const handleUploadVersion = async (e) => {
    e.preventDefault()
    if (versionFiles.length === 0) return toast.error('กรุณาเลือกไฟล์เวอร์ชันใหม่')
    setUploadingVersion(true)
    try {
      const fd = new FormData()
      fd.append('file_type', versionFileType)
      fd.append('doc_type', currentDoc.doc_type || 'RI')
      if (versionNote.trim()) fd.append('note', versionNote.trim())
      versionFiles.forEach(f => fd.append('files', f))
      await documentService.uploadVersion(currentDoc.doc_id, fd)
      toast.success('เพิ่มเวอร์ชันไฟล์สำเร็จ')
      setVersionFiles([])
      setVersionNote('')
      await refreshDetail()
      onDeleted()
    } catch (err) {
      toast.error(err.response?.data?.message || 'อัปโหลดเวอร์ชันล้มเหลว')
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
  const gb = groupBadge(currentDoc)

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
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColor[computedStatus(currentDoc)] || ''}`}>
                {statusLabel[computedStatus(currentDoc)] || currentDoc.status}
              </span>
            </div>
            <h2 className="text-base font-semibold text-slate-800 mt-1">{currentDoc.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl ml-4 flex-shrink-0">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">วันที่ออกใบประกาศ</p>
              <p className="text-sm font-semibold text-slate-700">
                {new Date(currentDoc.issue_date).toLocaleDateString('th-TH')}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">วันหมดอายุ</p>
              {noExp ? (
                <p className="text-sm font-semibold text-slate-400 italic">ไม่มีวันหมดอายุ</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700">
                    {currentDoc.expire_date ? new Date(currentDoc.expire_date).toLocaleDateString('th-TH') : '—'}
                  </p>
                  {daysLeft != null && (
                    <p className={`text-xs mt-0.5 font-medium ${daysColor}`}>
                      {daysLeft < 0 ? `เกินกำหนด ${Math.abs(daysLeft)} วัน` : `อีก ${daysLeft} วัน`}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {role !== 'student' && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">เจ้าของเอกสาร</p>
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
                  {currentDoc.advisor_name && <p className="text-xs text-slate-400 mt-0.5">อาจารย์: {currentDoc.advisor_name}</p>}
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ไฟล์แนบและเวอร์ชัน</p>
              <span className="text-[11px] text-slate-400">{files.length} ไฟล์ทั้งหมด</span>
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
              <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-3">ยังไม่มีไฟล์แนบ</p>
            )}

            {previousFiles.length > 0 && (
              <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60">
                <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-500">
                  ดูเวอร์ชันก่อนหน้า ({previousFiles.length})
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

          <form onSubmit={handleUploadVersion} className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <UploadCloud size={17} className="text-[#42b5e1]" />
              <div>
                <p className="text-sm font-semibold text-slate-700">เพิ่มเวอร์ชันไฟล์</p>
                <p className="text-xs text-slate-400">ไฟล์ประเภทเดียวกันจะถูกตั้งเป็นเวอร์ชันปัจจุบันอัตโนมัติ</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select className="input-field" value={versionFileType} onChange={e => setVersionFileType(e.target.value)}>
                <option value="main">เอกสารหลัก</option>
                <option value="certificate">บันทึกข้อความรับรอง</option>
                <option value="attachment">ไฟล์แนบ</option>
              </select>
              <input
                className="input-field"
                value={versionNote}
                onChange={e => setVersionNote(e.target.value)}
                placeholder="หมายเหตุเวอร์ชัน (ไม่บังคับ)"
              />
            </div>
            <label className="block cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm text-slate-500 hover:bg-slate-50">
              เลือกไฟล์เวอร์ชันใหม่
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
              {uploadingVersion ? 'กำลังเพิ่มเวอร์ชัน...' : 'บันทึกเวอร์ชันใหม่'}
            </button>
          </form>

          {currentDoc.timeline?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <History size={16} className="text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Timeline</p>
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
                            {new Date(item.created_at).toLocaleString('th-TH')}
                          </span>
                        </div>
                        {item.detail && <p className="text-xs text-slate-500 mt-1">{item.detail}</p>}
                        {item.actor_name && <p className="text-[11px] text-slate-400 mt-1">โดย {item.actor_name}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {currentDoc.description && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">คำอธิบาย</p>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{currentDoc.description}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-between">
          {role === 'admin' && (
            <button onClick={handleTrash} disabled={loading}
              className="text-sm text-amber-600 hover:text-amber-800 font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5">
              <span>🗑️</span>{loading ? 'กำลังดำเนินการ...' : 'ย้ายไปถังขยะ'}
            </button>
          )}
          <button onClick={onClose}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#42b5e1' }}>ปิด</button>
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
        placeholder="วว/ดด/ปปปป"
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
function ExportModal({ onClose, search, docType, status, sort, degreeLevel = '', branch = '', ownerRole = '', advisorId = '' }) {
  const [exportMode, setExportMode] = useState('all')
  const [loading, setLoading]       = useState(false)
  const [filterRole, setFilterRole] = useState(ownerRole)
  const [filterDegree, setFilterDegree] = useState(degreeLevel)
  const [filterBranch, setFilterBranch] = useState(branch)

  const exportBranchOptions = filterDegree ? branchesByDegree[filterDegree] || [] : allBranchOptions

  useEffect(() => {
    if (filterBranch && !exportBranchOptions.includes(filterBranch)) setFilterBranch('')
  }, [filterDegree, filterBranch, exportBranchOptions])

  useEffect(() => {
    if (filterBranch && exportMode === 'branch') setExportMode('all')
  }, [filterBranch, exportMode])

  const fetchAllDocs = async () => {
    const { data } = await documentService.getAll({
      search, doc_type: docType, status,
      sort_by: sort.by, sort_dir: sort.dir,
      limit: 9999, page: 1,
      ...(filterRole && { owner_role: filterRole }),
      ...(filterDegree && { degree_level: filterDegree }),
      ...(filterBranch && { department: filterBranch }),
      ...(advisorId && { advisor_id: advisorId }),
    })
    return data.documents || []
  }

  const exportFilters = [
    filterRole ? `กลุ่ม: ${roleLabel[filterRole] || filterRole}` : 'กลุ่ม: ทั้งหมด',
    filterDegree ? `ระดับ: ${degreeLabel[filterDegree] || filterDegree}` : 'ระดับ: ทั้งหมด',
    filterBranch ? `สาขา: ${filterBranch}` : 'สาขา: ทั้งหมด',
  ].join(' | ')

  const formatPrintDate = (date) => date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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
    filterBranch,
  ].filter(Boolean).map(safeFilePart)

  const handleExport = async () => {
    setLoading(true)
    try {
      const docs = await fetchAllDocs()
      const now = new Date()
      const dateStr = formatPrintDate(now)
      const modeLabels = { all: 'รายการเดียว', role: 'จัดกลุ่มตามบทบาท', degree: 'จัดกลุ่มตามระดับปริญญา', branch: 'จัดกลุ่มตามสาขาวิชา' }

      const { default: ExcelJS } = await import('exceljs')
      const wb = new ExcelJS.Workbook()
      wb.creator = 'ระบบ IRIS'
      wb.created = now

      const ws = wb.addWorksheet('เอกสาร', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      })
      ws.pageSetup.margins = { left: 0.35, right: 0.35, top: 0.55, bottom: 0.55, header: 0.25, footer: 0.25 }
      ws.pageSetup.horizontalCentered = true
      ws.pageSetup.printTitlesRow = '1:8'
      ws.views = [{ showGridLines: false }]
      ws.headerFooter = { oddFooter: '&Lระบบ IRIS&Cหน้า &P / &N&Rพิมพ์เมื่อ ' + dateStr }

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

      addMergedRow(['ระบบ IRIS', '', 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี', '', '', '', '', `วันที่พิมพ์ : ${dateStr}`, '', ''], 21, {
        left: { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'left', vertical: 'middle' } },
        center: { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'center', vertical: 'middle' } },
        right: { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'right', vertical: 'middle' } },
      })
      addMergedRow(['', '', 'รายงานเอกสารใบประกาศ', '', '', '', '', '', '', ''], 21, {
        center: { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'center', vertical: 'middle' } },
      })
      addMergedRow(['', '', 'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี', '', '', '', '', '', '', ''], 21, {
        center: { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'center', vertical: 'middle' } },
      })
      addMergedRow([`รูปแบบ : ${modeLabels[exportMode]}`, '', '', '', '', '', '', `รวมทั้งหมด : ${docs.length} รายการ`, '', ''], 21, {
        left: { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'right', vertical: 'middle' } },
        right: { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'right', vertical: 'middle' } },
      })
      const filterRow = ws.addRow([`เงื่อนไข : ${exportFilters}`, ...Array(N - 1).fill('')])
      filterRow.height = 28
      ws.mergeCells(filterRow.number, 1, filterRow.number, N)
      filterRow.getCell(1).style = { font: { name: FNT, bold: true, size: 14 }, alignment: { horizontal: 'right', vertical: 'middle', wrapText: true } }

      const spacer = ws.addRow(Array(N).fill(''))
      spacer.height = 4

      // ─ Column label row
      const COL_LABELS = ['ลำดับ', 'ชื่อเอกสาร', 'ประเภท', 'รหัสนักศึกษา', 'เจ้าของเอกสาร', 'ระดับ', 'สาขาวิชา', 'วันที่ออก', 'วันหมดอายุ', 'สถานะ']
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
        doc.owner_department || '',
        doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('th-TH') : '',
        doc.no_expire ? 'ไม่มีวันหมดอายุ' : (doc.expire_date ? new Date(doc.expire_date).toLocaleDateString('th-TH') : ''),
        doc.no_expire ? 'ไม่มีวันหมดอายุ' : (statusLabel[computedStatus(doc)] || doc.status || ''),
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
        const sr = ws.addRow([`  ${label}  (${count} รายการ)`, ...Array(N - 1).fill('')])
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
          k => k in degreeLabel ? `นักศึกษา ${degreeLabel[k]}` : (roleLabel[k] || k),
          ['bachelor', 'master', 'doctoral', 'advisor', 'staff'])
      } else if (exportMode === 'branch') {
        buildGrouped(docs, d => d.owner_department || 'ไม่ระบุสาขา', k => k, Object.values(branchesByDegree).flat())
      }

      const filenameParts = ['IRIS', 'ใบประกาศ', compactDate(now), ...scopeFileParts(), modeLabels[exportMode]]
      const exportFilename = `${filenameParts.map(safeFilePart).filter(Boolean).join('_')}.xlsx`

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = exportFilename; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      toast.success(`ส่งออก ${docs.length} รายการสำเร็จ`)
      onClose()
    } catch (err) { console.error(err); toast.error('ส่งออกข้อมูลล้มเหลว') }
    finally { setLoading(false) }
  }

  const opts = [
    { key: 'all',    label: 'รายการเดียว ไม่แบ่งกลุ่ม', desc: 'เรียงข้อมูลทั้งหมดตามตัวกรองที่เลือกไว้ในชีตเดียว' },
    { key: 'role',   label: 'จัดกลุ่มตามบทบาท',         desc: 'แยกหมวดนักศึกษา / อาจารย์ / เจ้าหน้าที่ / กลุ่มอื่น' },
    { key: 'degree', label: 'จัดกลุ่มตามระดับปริญญา', desc: 'แยกหมวด ป.ตรี / ป.โท / ป.เอก และกลุ่มอื่น' },
    { key: 'branch', label: 'จัดกลุ่มตามสาขาวิชา',      desc: 'เหมาะเมื่อส่งออกหลายสาขาในไฟล์เดียว' },
  ].filter(opt => !(filterBranch && opt.key === 'branch'))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">ส่งออกข้อมูล Excel</h2>
            <p className="text-xs text-slate-400 mt-0.5">เลือกข้อมูลก่อน แล้วกำหนดการจัดรูปแบบในไฟล์</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl ml-4">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 mb-3">
              <Download size={16} className="text-[#42b5e1]" />
              <div>
                <p className="text-sm font-semibold text-slate-700">เลือกข้อมูล</p>
                <p className="text-xs text-slate-400">เลือกเฉพาะกลุ่มที่ต้องการได้ เช่น นักศึกษา ป.ตรี หรือสาขาเดียว</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select className="input-field text-sm" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="">ทุกกลุ่มผู้ใช้</option>
                <option value="student">นักศึกษา</option>
                <option value="advisor">อาจารย์</option>
                <option value="staff">เจ้าหน้าที่</option>
                <option value="admin">ผู้ดูแลระบบ</option>
                <option value="executive">ผู้บริหาร</option>
              </select>
              <select className="input-field text-sm" value={filterDegree} onChange={e => setFilterDegree(e.target.value)}>
                <option value="">ทุกระดับปริญญา</option>
                <option value="bachelor">ป.ตรี</option>
                <option value="master">ป.โท</option>
                <option value="doctoral">ป.เอก</option>
              </select>
              <select className="input-field text-sm sm:col-span-2" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                <option value="">ทุกสาขาวิชา</option>
                {exportBranchOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <ClipboardList size={16} className="text-[#42b5e1]" />
              <p className="text-sm font-semibold text-slate-700">จัดรูปแบบในไฟล์ Excel</p>
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
                const Icon = { all: ClipboardList, role: Users, degree: GraduationCap, branch: School }[opt.key] || ClipboardList
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
          <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">ยกเลิก</button>
          <button type="button" onClick={handleExport} disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#42b5e1' }}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                กำลังส่งออก...
              </>
            ) : (
              <>
                <Download size={16} />
                ดาวน์โหลด Excel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded, docTypes, user }) {
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

  // Handle doc_type changing to IRB when issue_date is already filled
  useEffect(() => {
    if (form.doc_type === 'IRB' && form.issue_date && !noExpiry) {
      const expIso = addYears(form.issue_date, 3)
      setDisplayExpireDate(formatDMY(expIso))
      setForm(p => ({ ...p, expire_date: expIso }))
    }
  }, [form.doc_type, noExpiry])

  const handleIssueDateChange = (display, iso) => {
    setDisplayIssueDate(display)
    // Calculate expire immediately when doc_type is IRB
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
    if (files.length === 0) return toast.error('กรุณาแนบไฟล์อย่างน้อย 1 ไฟล์')
    if (user?.role === 'admin' && !form.target_user_id) return toast.error('กรุณาเลือกเจ้าของเอกสาร')
    if (!form.issue_date) return toast.error('กรุณาระบุวันที่ออกในรูปแบบ วว/ดด/ปปปป')
    if (!noExpiry && !form.expire_date) return toast.error('กรุณาระบุวันหมดอายุในรูปแบบ วว/ดด/ปปปป')
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
      toast.success('อัปโหลดเอกสารสำเร็จ')
      onUploaded(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">อัปโหลดเอกสาร</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {user?.role === 'admin' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                เจ้าของเอกสาร <span className="text-red-500">*</span>
              </label>
              <UserSearchInput value={form.target_user_id} onChange={(uid) => setForm(p => ({ ...p, target_user_id: uid }))} />
              <p className="text-xs text-slate-400 mt-1">ค้นหาด้วยรหัสนักศึกษา ชื่อ หรืออีเมล</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              ชื่อเอกสาร <span className="text-red-500">*</span>
            </label>
            <input className="input-field" value={form.title} required
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="กรอกชื่อเอกสาร" />
          </div>

          <div className={`grid gap-3 ${form.doc_type === 'RI' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                ประเภทเอกสาร <span className="text-red-500">*</span>
              </label>
              <select className="input-field" value={form.doc_type}
                onChange={e => setForm(p => ({ ...p, doc_type: e.target.value, project_category: '' }))}>
                {docTypes.map(t => <option key={t.type_id} value={t.type_code}>{t.type_code}</option>)}
              </select>
            </div>
            {form.doc_type === 'RI' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ประเภทโครงการ <span className="text-red-500">*</span></label>
                <select className="input-field" value={form.project_category}
                  onChange={e => setForm(p => ({ ...p, project_category: e.target.value }))}>
                  <option value="">-- โปรดระบุ --</option>
                  <option value="urgent">ทฤษฎี</option>
                  <option value="exempt">ปฏิบัติ</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                วันที่ออก <span className="text-red-500">*</span>
              </label>
              <DateInput display={displayIssueDate} iso={form.issue_date} onChange={handleIssueDateChange} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                วันหมดอายุ {!noExpiry && <span className="text-red-500">*</span>}
              </label>
              {noExpiry ? (
                <div className="input-field bg-slate-50 text-slate-400 text-sm flex items-center cursor-not-allowed select-none">ไม่มีวันหมดอายุ</div>
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
                <span className="text-xs text-slate-500">ไม่มีวันหมดอายุ</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">คำอธิบาย (ไม่บังคับ)</label>
            <textarea className="input-field resize-none" rows={2} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="รายละเอียดเพิ่มเติม" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              ไฟล์แนบ (PDF, DOC, รูปภาพ — สูงสุด 5 ไฟล์) <span className="text-red-500">*</span>
            </label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => document.getElementById('file-input-modal').click()}
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
              style={{ borderColor: dragOver ? '#42b5e1' : '#e2e8f0', backgroundColor: dragOver ? '#f0f9ff' : '#f8fafc' }}>
              <p className="text-2xl mb-1">📎</p>
              <p className="text-sm text-slate-500">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</p>
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
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">ยกเลิก</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: '#42b5e1' }}>
              {loading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { user } = useAuthStore()
  const isAdmin   = user?.role === 'admin'
  const isAdvisor = user?.role === 'advisor'
  const hasTabs   = isAdmin || isAdvisor

  const tabs = isAdmin ? getAdminTabs() : isAdvisor ? getAdvisorTabs() : []

  const [docs, setDocs]         = useState([])
  const [docTypes, setDocTypes] = useState([])
  const [advisors, setAdvisors] = useState([])
  const [advisorRelations, setAdvisorRelations] = useState({})
  const [summary, setSummary]   = useState(null)
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)

  const [activeTab, setActiveTab]       = useState('all')
  const [search, setSearch]             = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [docType, setDocType]           = useState('')
  const [status, setStatus]             = useState('')
  const [advisorFilter, setAdvisorFilter] = useState('')
  const [degreeFilter, setDegreeFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [sort, setSort]                 = useState({ by: 'created_at', dir: 'desc' })
  const [page, setPage]                 = useState(1)
  const [modal, setModal]               = useState(null)
  const [selected, setSelected]         = useState(null)

  // Load reference data
  useEffect(() => {
    docTypeService.getAll().then(r => setDocTypes(r.data || [])).catch(() => {})
    if (isAdmin) {
      userService.getAdvisors({ include_relations: 1 }).then(r => {
        setAdvisors(r.data?.advisors || [])
        setAdvisorRelations(r.data?.relations || {})
      }).catch(() => {})
      documentService.getSummary().then(r => setSummary(r.data)).catch(() => {})
    }
  }, [isAdmin])

  // Reset page when filters change (not when page itself changes)
  useEffect(() => { setPage(1) }, [activeTab, search, docType, status, advisorFilter, degreeFilter, branchFilter, sort])

  useEffect(() => {
    const allowedBranches = degreeFilter ? branchesByDegree[degreeFilter] || [] : allBranchOptions
    if (branchFilter && !allowedBranches.includes(branchFilter)) setBranchFilter('')
  }, [degreeFilter, branchFilter])

  useEffect(() => {
    const tabParams = tabs.find(t => t.key === activeTab)?.params || {}
    if (tabParams.owner_role && tabParams.owner_role !== 'student') {
      setDegreeFilter('')
      setBranchFilter('')
      setAdvisorFilter('')
    }
    if (tabParams.degree_level && degreeFilter) setDegreeFilter('')
  }, [activeTab, degreeFilter])

  useEffect(() => {
    if (!advisorFilter) return
    const relation = advisorRelations[advisorFilter]
    if (!relation) return
    const activeDegree = ['bachelor', 'master', 'doctoral'].includes(activeTab) ? activeTab : degreeFilter
    const degreeMismatch = activeDegree && relation.degrees.length > 0 && !relation.degrees.includes(activeDegree)
    const branchMismatch = branchFilter && relation.branches.length > 0 && !relation.branches.includes(branchFilter)
    if (degreeMismatch || branchMismatch) setAdvisorFilter('')
  }, [advisorFilter, advisorRelations, activeTab, degreeFilter, branchFilter])

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const tabParams = tabs.find(t => t.key === activeTab)?.params || {}
      const params = {
        ...tabParams,
        search: debouncedSearch, doc_type: docType, status,
        sort_by: sort.by, sort_dir: sort.dir,
        page, limit: LIMIT,
        ...(advisorFilter && { advisor_id: advisorFilter }),
        ...(degreeFilter && !tabParams.degree_level && { degree_level: degreeFilter }),
        ...(branchFilter  && { department: branchFilter }),
      }
      const { data } = await documentService.getAll(params)
      setDocs(data.documents || [])
      setTotal(data.total || 0)
    } catch { toast.error('โหลดข้อมูลล้มเหลว') }
    finally { setLoading(false) }
  }, [activeTab, debouncedSearch, docType, status, sort, page, advisorFilter, degreeFilter, branchFilter])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const openDetail = async (doc) => {
    try {
      const { data } = await documentService.getById(doc.doc_id)
      setSelected(data); setModal('detail')
    } catch { toast.error('โหลดรายละเอียดล้มเหลว') }
  }

  const handleSort = (key) => {
    setSort(prev => prev.by === key ? { by: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { by: key, dir: 'desc' })
  }

  const handleTabChange = (key) => { setActiveTab(key); setAdvisorFilter(''); setDegreeFilter(''); setBranchFilter('') }

  const handleDegreeChange = (value) => {
    setDegreeFilter(value)
    setAdvisorFilter('')
    if (branchFilter && value && !(branchesByDegree[value] || []).includes(branchFilter)) {
      setBranchFilter('')
    }
  }

  const handleBranchChange = (value) => {
    setBranchFilter(value)
    setAdvisorFilter('')
    if (!value || degreeTabKey) return
    const inferredDegree = getDegreeForBranch(value)
    if (inferredDegree && inferredDegree !== degreeFilter) setDegreeFilter(inferredDegree)
  }

  const refreshAll = useCallback(() => {
    fetchDocs()
    if (isAdmin) documentService.getSummary().then(r => setSummary(r.data)).catch(() => {})
  }, [fetchDocs, isAdmin])

  const isStudentTab = ['all', 'bachelor', 'master', 'doctoral'].includes(activeTab)
  const showStudentId = isAdmin || isAdvisor
  const showOwner     = isAdmin || isAdvisor
  const showGroup     = isAdmin && activeTab === 'all'
  const showAdvisorFilter = isAdmin && isStudentTab
  const degreeTabKey  = ['bachelor', 'master', 'doctoral'].includes(activeTab) ? activeTab : null
  const showDegreeFilter = (isAdmin || isAdvisor) && activeTab === 'all'
  const branchFilterDegree = degreeTabKey || degreeFilter
  const showBranchFilter = (isAdmin || isAdvisor) && (activeTab === 'all' || degreeTabKey != null)
  const branchOptions = branchFilterDegree ? branchesByDegree[branchFilterDegree] || [] : allBranchOptions
  const currentTabParams = tabs.find(t => t.key === activeTab)?.params || {}
  const filteredAdvisors = advisors.filter(advisor => {
    const relation = advisorRelations[advisor.user_id]
    if (!relation) return !degreeFilter && !branchFilter && !degreeTabKey
    const activeDegree = degreeTabKey || degreeFilter
    const degreeOk = !activeDegree || relation.degrees.length === 0 || relation.degrees.includes(activeDegree)
    const branchOk = !branchFilter || relation.branches.length === 0 || relation.branches.includes(branchFilter)
    return degreeOk && branchOk
  })

  const pageTitle = isAdmin ? 'ใบประกาศทั้งหมด'
    : isAdvisor             ? 'ใบประกาศนักศึกษาในที่ปรึกษา'
    : user?.role === 'staff' ? 'เอกสารของฉัน'
    : 'ใบประกาศของฉัน'

  const roleDisplay = isAdmin ? 'ผู้ดูแลระบบ'
    : isAdvisor              ? 'อาจารย์'
    : user?.role === 'staff' ? 'เจ้าหน้าที่'
    : 'นักศึกษา'

  return (
    <div className="space-y-5 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>
            {roleDisplay}
          </p>
          <h1 className="text-2xl font-bold text-slate-800">{pageTitle}</h1>
          {/* <p className="text-slate-400 text-sm mt-0.5">
            {hasTabs
              ? `กลุ่มนี้ ${total.toLocaleString()} รายการ`
              : `ทั้งหมด ${total.toLocaleString()} รายการ`}
          </p> */}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button onClick={() => setModal('export')}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all whitespace-nowrap flex items-center gap-1.5">
              <span>⬇</span> ส่งออก Excel
            </button>
          )}
          {(isAdmin || user?.role === 'student' || user?.role === 'staff') && (
            <button onClick={() => setModal('upload')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all whitespace-nowrap"
              style={{ backgroundColor: '#42b5e1' }}>
              + อัปโหลดเอกสาร
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards — admin only */}
      {isAdmin && summary && <SummaryCards summary={summary} activeTab={activeTab} />}

      {/* Tab Bar */}
      {hasTabs && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <TabBar tabs={tabs} activeTab={activeTab} onChange={handleTabChange} summary={isAdmin ? summary : null} />

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <input className="input-field w-full sm:max-w-xs" placeholder="ค้นหาชื่อเอกสาร, เจ้าของ, รหัส..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input-field w-full sm:w-auto sm:max-w-[150px]" value={docType} onChange={e => setDocType(e.target.value)}>
              <option value="">ทุกประเภท</option>
              {docTypes.map(t => <option key={t.type_id} value={t.type_code}>{t.type_code}</option>)}
            </select>
            <select className="input-field w-full sm:w-auto sm:max-w-[150px]" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">ทุกสถานะ</option>
              <option value="active">ปกติ</option>
              <option value="expiring_soon">ใกล้หมดอายุ</option>
              <option value="expired">หมดอายุ</option>
            </select>
            {showDegreeFilter && (
              <select className="input-field w-full sm:w-auto sm:max-w-[170px]" value={degreeFilter} onChange={e => handleDegreeChange(e.target.value)}>
                <option value="">ทุกระดับปริญญา</option>
                <option value="bachelor">ป.ตรี</option>
                <option value="master">ป.โท</option>
                <option value="doctoral">ป.เอก</option>
              </select>
            )}
            {showAdvisorFilter && advisors.length > 0 && (
              <select className="input-field w-full sm:w-auto sm:max-w-[180px]" value={advisorFilter} onChange={e => setAdvisorFilter(e.target.value)}>
                <option value="">ทุกอาจารย์</option>
                {filteredAdvisors.map(a => <option key={a.user_id} value={a.user_id}>{a.name}</option>)}
              </select>
            )}
            {showBranchFilter && (
              <select className="input-field w-full sm:w-auto sm:max-w-[220px]" value={branchFilter} onChange={e => handleBranchChange(e.target.value)}>
                <option value="">ทุกสาขา</option>
                {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: showOwner ? '780px' : '580px' }}>
              <thead className="border-b border-slate-200">
                <tr className="bg-slate-50">
                  <SortTh sortKey="title"        currentSort={sort} onSort={handleSort}>ชื่อเอกสาร</SortTh>
                  <SortTh sortKey="doc_type"     currentSort={sort} onSort={handleSort}>ประเภท</SortTh>
                  {showGroup     && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">กลุ่ม</th>}
                  {showStudentId && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">รหัส</th>}
                  {showOwner     && <SortTh sortKey="owner_name" currentSort={sort} onSort={handleSort}>เจ้าของ</SortTh>}
                  <SortTh sortKey="issue_date"   currentSort={sort} onSort={handleSort}>วันออก</SortTh>
                  <SortTh sortKey="expire_date"  currentSort={sort} onSort={handleSort}>วันหมดอายุ</SortTh>
                  <SortTh sortKey="days_remaining" currentSort={sort} onSort={handleSort}>คงเหลือ</SortTh>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">สถานะ</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={12} className="text-center py-16 text-slate-400 text-sm">กำลังโหลด...</td></tr>
                ) : docs.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-16">
                      <p className="text-slate-300 text-4xl mb-3">○</p>
                      <p className="text-slate-400 text-sm">ไม่พบเอกสาร</p>
                    </td>
                  </tr>
                ) : docs.map(doc => {
                  const noExp = !!doc.no_expire
                  const days  = doc.days_remaining
                  const daysColor = noExp ? 'text-slate-400' : days < 0 ? 'text-red-600 font-semibold' : days <= 30 ? 'text-amber-600 font-semibold' : 'text-slate-500'
                  const gb = showGroup ? groupBadge(doc) : null
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
                        {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('th-TH') : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs tabular-nums whitespace-nowrap">
                        {noExp
                          ? <span className="text-slate-400 italic">ไม่มีวันหมดอายุ</span>
                          : <span className="text-slate-500">{doc.expire_date ? new Date(doc.expire_date).toLocaleDateString('th-TH') : '—'}</span>}
                      </td>
                      <td className={`px-4 py-3.5 text-xs tabular-nums whitespace-nowrap ${daysColor}`}>
                        {noExp ? '—' : days == null ? '—' : days < 0 ? `เกิน ${Math.abs(days)} วัน` : `${days} วัน`}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap
                          ${noExp ? 'bg-slate-50 text-slate-500 border border-slate-200' : statusColor[computedStatus(doc)] || 'bg-slate-100 text-slate-500'}`}>
                          {noExp ? 'ไม่มีวันหมดอายุ' : statusLabel[computedStatus(doc)] || doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#42b5e1' }}>ดูรายละเอียด →</span>
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
            <input className="input-field w-full sm:max-w-xs" placeholder="ค้นหาชื่อเอกสาร..."
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input-field w-full sm:w-auto sm:max-w-[150px]" value={docType} onChange={e => setDocType(e.target.value)}>
              <option value="">ทุกประเภท</option>
              {docTypes.map(t => <option key={t.type_id} value={t.type_code}>{t.type_code}</option>)}
            </select>
            <select className="input-field w-full sm:w-auto sm:max-w-[150px]" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">ทุกสถานะ</option>
              <option value="active">ปกติ</option>
              <option value="expiring_soon">ใกล้หมดอายุ</option>
              <option value="expired">หมดอายุ</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '560px' }}>
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <SortTh sortKey="title"         currentSort={sort} onSort={handleSort}>ชื่อเอกสาร</SortTh>
                    <SortTh sortKey="doc_type"      currentSort={sort} onSort={handleSort}>ประเภท</SortTh>
                    <SortTh sortKey="issue_date"    currentSort={sort} onSort={handleSort}>วันออก</SortTh>
                    <SortTh sortKey="expire_date"   currentSort={sort} onSort={handleSort}>วันหมดอายุ</SortTh>
                    <SortTh sortKey="days_remaining" currentSort={sort} onSort={handleSort}>คงเหลือ</SortTh>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">สถานะ</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-16 text-slate-400 text-sm">กำลังโหลด...</td></tr>
                  ) : docs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16">
                        <p className="text-slate-300 text-4xl mb-3">○</p>
                        <p className="text-slate-400 text-sm">ไม่พบเอกสาร</p>
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
                          {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('th-TH') : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs tabular-nums whitespace-nowrap">
                          {noExp
                            ? <span className="text-slate-400 italic">ไม่มีวันหมดอายุ</span>
                            : <span className="text-slate-500">{doc.expire_date ? new Date(doc.expire_date).toLocaleDateString('th-TH') : '—'}</span>}
                        </td>
                        <td className={`px-4 py-3.5 text-xs tabular-nums whitespace-nowrap ${daysColor}`}>
                          {noExp ? '—' : days == null ? '—' : days < 0 ? `เกิน ${Math.abs(days)} วัน` : `${days} วัน`}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap
                            ${noExp ? 'bg-slate-50 text-slate-500 border border-slate-200' : statusColor[computedStatus(doc)] || 'bg-slate-100 text-slate-500'}`}>
                            {noExp ? 'ไม่มีวันหมดอายุ' : statusLabel[computedStatus(doc)] || doc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#42b5e1' }}>ดูรายละเอียด →</span>
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
          branch={branchFilter}
          advisorId={advisorFilter}
        />
      )}
      {modal === 'upload' && (
        <UploadModal onClose={() => setModal(null)} onUploaded={refreshAll}
          docTypes={docTypes} user={user} />
      )}
      {modal === 'detail' && selected && (
        <DetailModal doc={selected} role={user?.role}
          onClose={() => { setModal(null); setSelected(null) }}
          onDeleted={refreshAll} />
      )}
    </div>
  )
}

import { useEffect, useState, useCallback, useRef } from 'react'
import { documentService, docTypeService, userService } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

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
const LIMIT = 15

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
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
          ← ก่อนหน้า
        </button>
        {pages.map(p => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`w-8 h-8 text-xs rounded-lg border transition-colors
              ${p === page ? 'border-[#42b5e1] text-[#42b5e1] bg-[#e0f4fb]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {p}
          </button>
        ))}
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
          ถัดไป →
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

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ doc, onClose, onDeleted, role }) {
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState({})

  const handlePreview = async (f) => {
    setPreviewLoading(p => ({ ...p, [f.file_id]: true }))
    try {
      const { data } = await documentService.preview(doc.doc_id, f.file_id)
      const url = URL.createObjectURL(data)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { toast.error('ไม่สามารถเปิดไฟล์ได้') }
    finally { setPreviewLoading(p => ({ ...p, [f.file_id]: false })) }
  }

  const handleTrash = async () => {
    if (!confirm(`ย้าย "${doc.title}" ไปถังขยะ?`)) return
    setLoading(true)
    try {
      await documentService.delete(doc.doc_id)
      toast.success('ย้ายเอกสารไปถังขยะสำเร็จ')
      onDeleted(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด') }
    finally { setLoading(false) }
  }

  const noExp = !!doc.no_expire
  const daysLeft = doc.days_remaining
  const daysColor = daysLeft < 0 ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-600'
  const gb = groupBadge(doc)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 text-xs font-semibold rounded"
                style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>{doc.doc_type}</span>
              {gb && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded"
                  style={{ backgroundColor: gb.bg, color: gb.color }}>{gb.text}</span>
              )}
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColor[computedStatus(doc)] || ''}`}>
                {statusLabel[computedStatus(doc)] || doc.status}
              </span>
            </div>
            <h2 className="text-base font-semibold text-slate-800 mt-1">{doc.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl ml-4 flex-shrink-0">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">วันที่ออกใบประกาศ</p>
              <p className="text-sm font-semibold text-slate-700">
                {new Date(doc.issue_date).toLocaleDateString('th-TH')}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">วันหมดอายุ</p>
              {noExp ? (
                <p className="text-sm font-semibold text-slate-400 italic">ไม่มีวันหมดอายุ</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700">
                    {doc.expire_date ? new Date(doc.expire_date).toLocaleDateString('th-TH') : '—'}
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
                  {doc.owner_name?.[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-700">{doc.owner_name}</p>
                    {doc.owner_student_id && (
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>{doc.owner_student_id}</span>
                    )}
                    {doc.owner_role && (
                      <span className="text-xs text-slate-400">{roleLabel[doc.owner_role]}
                        {doc.owner_degree_level ? ` (${degreeLabel[doc.owner_degree_level] || doc.owner_degree_level})` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{doc.owner_email}</p>
                  {doc.advisor_name && <p className="text-xs text-slate-400 mt-0.5">อาจารย์: {doc.advisor_name}</p>}
                </div>
              </div>
            </div>
          )}

          {doc.files?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">ไฟล์แนบ</p>
              <div className="space-y-2">
                {doc.files.map(f => (
                  <div key={f.file_id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-lg flex-shrink-0">{f.mime_type?.includes('pdf') ? '📄' : '🖼️'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{f.file_name}</p>
                        <p className="text-xs text-slate-400">
                          {(f.file_size / 1024).toFixed(1)} KB ·{' '}
                          {f.file_type === 'main' ? 'เอกสารหลัก' : f.file_type === 'certificate' ? 'บันทึกข้อความรับรอง' : 'ไฟล์แนบ'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      {f.mime_type?.includes('pdf') && (
                        <button
                          onClick={() => handlePreview(f)}
                          disabled={previewLoading[f.file_id]}
                          className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50">
                          {previewLoading[f.file_id] ? '...' : 'ดู'}
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          try {
                            const { data } = await documentService.download(doc.doc_id, f.file_id)
                            const url = URL.createObjectURL(data)
                            const a = document.createElement('a')
                            a.href = url; a.download = f.file_name; a.click()
                            setTimeout(() => URL.revokeObjectURL(url), 10000)
                          } catch { toast.error('ไม่สามารถดาวน์โหลดได้') }
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg text-white"
                        style={{ backgroundColor: '#42b5e1' }}>โหลด</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {doc.description && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">คำอธิบาย</p>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{doc.description}</p>
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
        <svg className="w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
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
function ExportModal({ onClose, search, docType, status, sort }) {
  const [exportMode, setExportMode] = useState('all')
  const [loading, setLoading]       = useState(false)

  const fetchAllDocs = async () => {
    const { data } = await documentService.getAll({
      search, doc_type: docType, status,
      sort_by: sort.by, sort_dir: sort.dir,
      limit: 9999, page: 1,
    })
    return data.documents || []
  }

const handleExport = async () => {
    setLoading(true)
    try {
      const docs = await fetchAllDocs()
      const now = new Date()
      const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
      const modeLabels = { all: 'ทั้งหมด', role: 'แบ่งตามบทบาท', degree: 'แบ่งตามระดับการศึกษา', branch: 'แบ่งตามสาขาวิชา' }

      const { default: ExcelJS } = await import('exceljs')
      const wb = new ExcelJS.Workbook()
      wb.creator = 'ระบบ IRIS'
      wb.created = now

      const ws = wb.addWorksheet('เอกสาร', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      })
      ws.pageSetup.margins = { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }

      const N = 12
      ws.columns = [
        { width: 22 }, { width: 8  }, { width: 13 },
        { width: 16 }, { width: 10 }, { width: 10 },
        { width: 22 }, { width: 16 }, { width: 14 },
        { width: 14 }, { width: 11 }, { width: 12 },
      ]

      const FNT  = 'TH Sarabun New'
      const fFill   = (c) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } })
      const fBorder = (s = 'thin') => ({ top: { style: s }, bottom: { style: s }, left: { style: s }, right: { style: s } })
      const fillRow = (row, argb) => { for (let c = 1; c <= N; c++) row.getCell(c).fill = fFill(argb) }

      // ─ Document header (rows 1-3)
      const docHeaders = [
        { left: 'ระบบ IRIS', center: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี', right: `ที่พิมพ์: ${dateStr}`, h: 26, cSz: 12 },
        { left: '',          center: 'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี',     right: '',                  h: 20, cSz: 11 },
        { left: '',          center: 'รายงานเอกสารใบประกาศ — ระบบ IRIS',        right: '',                  h: 24, cSz: 13 },
      ]
      docHeaders.forEach(({ left, center, right, h, cSz }, ri) => {
        const row = ws.addRow([left, '', '', center, '', '', '', '', '', right, '', ''])
        row.height = h
        const rn = ri + 1
        ws.mergeCells(rn, 1, rn, 3)
        ws.mergeCells(rn, 4, rn, 9)
        ws.mergeCells(rn, 10, rn, 12)
        row.getCell(1).style  = { font: { name: FNT, bold: true, size: 11, color: { argb: 'FF1B2631' } }, alignment: { horizontal: 'left',   vertical: 'middle' } }
        row.getCell(4).style  = { font: { name: FNT, bold: true, size: cSz, color: { argb: 'FF1B2631' } }, alignment: { horizontal: 'center', vertical: 'middle' } }
        row.getCell(10).style = { font: { name: FNT, size: 9,    color: { argb: 'FF64748B' } },           alignment: { horizontal: 'right',  vertical: 'middle' } }
      })

      // ─ Info row (row 4)
      const r4 = ws.addRow([`รูปแบบรายงาน: ${modeLabels[exportMode]}`, '', '', `รวมทั้งหมด: ${docs.length} รายการ`, '', '', '', '', '', '', '', ''])
      r4.height = 18
      ws.mergeCells(r4.number, 1, r4.number, 3)
      ws.mergeCells(r4.number, 4, r4.number, 12)
      r4.getCell(1).style = { font: { name: FNT, size: 10, color: { argb: 'FF1B2631' } },             alignment: { horizontal: 'left', vertical: 'middle' } }
      r4.getCell(4).style = { font: { name: FNT, size: 10, bold: true, color: { argb: 'FF1B2631' } }, alignment: { horizontal: 'left', vertical: 'middle' } }

      // ─ Spacer
      const spacer = ws.addRow(Array(N).fill(''))
      spacer.height = 5
      fillRow(spacer, 'FFFFFFFF')

      // ─ Column label row
      const COL_LABELS = ['ชื่อเอกสาร', 'ประเภท', 'รหัสนักศึกษา', 'เจ้าของเอกสาร', 'บทบาท', 'ระดับการศึกษา', 'สาขาวิชา', 'อาจารย์ที่ปรึกษา', 'วันที่ออกใบประกาศ', 'วันหมดอายุ', 'คงเหลือ (วัน)', 'สถานะ']
      const addTableHeader = () => {
        const hr = ws.addRow(COL_LABELS)
        hr.height = 26
        const s = {
          font: { name: FNT, bold: true, size: 10, color: { argb: 'FF0D2D3E' } },
          fill: fFill('FF42B5E1'),
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          border: fBorder('medium'),
        }
        for (let c = 1; c <= N; c++) hr.getCell(c).style = s
      }

      const docToRow = (doc) => [
        doc.title || '',
        doc.doc_type || '',
        doc.owner_student_id || '',
        doc.owner_name || '',
        roleLabel[doc.owner_role] || doc.owner_role || '',
        degreeLabel[doc.owner_degree_level] || '',
        doc.owner_department || '',
        doc.advisor_name || '',
        doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('th-TH') : '',
        doc.no_expire ? 'ไม่มีวันหมดอายุ' : (doc.expire_date ? new Date(doc.expire_date).toLocaleDateString('th-TH') : ''),
        doc.no_expire ? '' : (doc.days_remaining ?? ''),
        doc.no_expire ? 'ไม่มีวันหมดอายุ' : (statusLabel[computedStatus(doc)] || doc.status || ''),
      ]

      const addDataRows = (docList) => {
        docList.forEach((doc, i) => {
          const dr = ws.addRow(docToRow(doc))
          dr.height = 16
          const bg = i % 2 === 0 ? 'FFFFFFFF' : 'FFE0F4FB'
          const base = {
            font: { name: FNT, size: 10, color: { argb: 'FF1B2631' } },
            fill: fFill(bg),
            border: { bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } },
          }
          for (let c = 1; c <= N; c++) {
            dr.getCell(c).style = { ...base, alignment: { vertical: 'middle', horizontal: c === 11 ? 'center' : 'left' } }
          }
        })
      }

      const addSection = (label, count) => {
        const sr = ws.addRow([`  ${label}  (${count} รายการ)`, ...Array(N - 1).fill('')])
        sr.height = 22
        ws.mergeCells(sr.number, 1, sr.number, N)
        sr.getCell(1).style = { font: { name: FNT, bold: true, size: 10, color: { argb: 'FFFFFFFF' } }, fill: fFill('FF1A5276'), alignment: { horizontal: 'left', vertical: 'middle' } }
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

      let suffix = 'all'
      if (exportMode === 'all') {
        addTableHeader(); addDataRows(docs)
      } else if (exportMode === 'role') {
        suffix = 'by_role'
        buildGrouped(docs, d => d.owner_role || 'other', k => roleLabel[k] || k, ['student', 'advisor', 'staff', 'admin', 'executive'])
      } else if (exportMode === 'degree') {
        suffix = 'by_degree'
        buildGrouped(docs,
          d => d.owner_role === 'student' ? (d.owner_degree_level || 'bachelor') : (d.owner_role || 'other'),
          k => k in degreeLabel ? `นักศึกษา ${degreeLabel[k]}` : (roleLabel[k] || k),
          ['bachelor', 'master', 'doctoral', 'advisor', 'staff'])
      } else if (exportMode === 'branch') {
        suffix = 'by_branch'
        buildGrouped(docs, d => d.owner_department || 'ไม่ระบุสาขา', k => k, Object.values(branchesByDegree).flat())
      }

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `iris_documents_${suffix}_${now.toISOString().slice(0, 10)}.xlsx`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      toast.success(`ส่งออก ${docs.length} รายการสำเร็จ`)
      onClose()
    } catch (err) { console.error(err); toast.error('ส่งออกข้อมูลล้มเหลว') }
    finally { setLoading(false) }
  }

  const opts = [
    { key: 'all',    icon: '📋', label: 'ทั้งหมด',              desc: 'ส่งออกเอกสารทั้งหมดในไฟล์เดียว' },
    { key: 'role',   icon: '👥', label: 'แบ่งตามบทบาท',         desc: 'แยกหมวด: นักศึกษา / อาจารย์ / เจ้าหน้าที่' },
    { key: 'degree', icon: '🎓', label: 'แบ่งตามระดับการศึกษา', desc: 'แยกหมวด: ป.ตรี / ป.โท / ป.เอก / อาจารย์ / เจ้าหน้าที่' },
    { key: 'branch', icon: '🏫', label: 'แบ่งตามสาขาวิชา',      desc: 'แยกหมวดตามสาขาวิชาทุกสาขา' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">ส่งออกข้อมูล Excel</h2>
            <p className="text-xs text-slate-400 mt-0.5">เลือกรูปแบบการจัดกลุ่มในไฟล์ที่ส่งออก</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl ml-4">✕</button>
        </div>
        <div className="p-5 space-y-2">
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
              <span className="text-xl flex-shrink-0">{opt.icon}</span>
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
        <div className="px-5 pb-5 pt-1 border-t border-slate-50 flex gap-3 mt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">ยกเลิก</button>
          <button type="button" onClick={handleExport} disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#42b5e1' }}>
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                กำลังส่งออก...
              </>
            ) : '⬇ ดาวน์โหลด Excel'}
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
  const [summary, setSummary]   = useState(null)
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)

  const [activeTab, setActiveTab]       = useState('all')
  const [search, setSearch]             = useState('')
  const [docType, setDocType]           = useState('')
  const [status, setStatus]             = useState('')
  const [advisorFilter, setAdvisorFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [sort, setSort]                 = useState({ by: 'created_at', dir: 'desc' })
  const [page, setPage]                 = useState(1)
  const [modal, setModal]               = useState(null)
  const [selected, setSelected]         = useState(null)

  // Load reference data
  useEffect(() => {
    docTypeService.getAll().then(r => setDocTypes(r.data || [])).catch(() => {})
    if (isAdmin) {
      userService.getAdvisors().then(r => setAdvisors(r.data?.advisors || [])).catch(() => {})
      documentService.getSummary().then(r => setSummary(r.data)).catch(() => {})
    }
  }, [isAdmin])

  // Reset page when filters change (not when page itself changes)
  useEffect(() => { setPage(1) }, [activeTab, search, docType, status, advisorFilter, branchFilter, sort])

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const tabParams = tabs.find(t => t.key === activeTab)?.params || {}
      const params = {
        ...tabParams,
        search, doc_type: docType, status,
        sort_by: sort.by, sort_dir: sort.dir,
        page, limit: LIMIT,
        ...(advisorFilter && { advisor_id: advisorFilter }),
        ...(branchFilter  && { department: branchFilter }),
      }
      const { data } = await documentService.getAll(params)
      setDocs(data.documents || [])
      setTotal(data.total || 0)
    } catch { toast.error('โหลดข้อมูลล้มเหลว') }
    finally { setLoading(false) }
  }, [activeTab, search, docType, status, sort, page, advisorFilter, branchFilter])

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

  const handleTabChange = (key) => { setActiveTab(key); setAdvisorFilter(''); setBranchFilter('') }

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
  const showBranchFilter = (isAdmin || isAdvisor) && degreeTabKey != null
  const branchOptions = degreeTabKey ? branchesByDegree[degreeTabKey] : []

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
            {showAdvisorFilter && advisors.length > 0 && (
              <select className="input-field w-full sm:w-auto sm:max-w-[180px]" value={advisorFilter} onChange={e => setAdvisorFilter(e.target.value)}>
                <option value="">ทุกอาจารย์</option>
                {advisors.map(a => <option key={a.user_id} value={a.user_id}>{a.name}</option>)}
              </select>
            )}
            {showBranchFilter && (
              <select className="input-field w-full sm:w-auto sm:max-w-[220px]" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
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

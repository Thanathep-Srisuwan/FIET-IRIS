import { useEffect, useState, useCallback, useRef } from 'react'
import { documentService, docTypeService, userService } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

const statusLabel = { active: 'ปกติ', expiring_soon: 'ใกล้หมดอายุ', expired: 'หมดอายุ' }
const statusColor = {
  active:        'bg-emerald-50 text-emerald-700 border border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border border-amber-200',
  expired:       'bg-red-50 text-red-600 border border-red-200',
}
const roleLabel = { student: 'นักศึกษา', advisor: 'อาจารย์', admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร' }

// ─── User Search Input (สำหรับ admin เลือกเจ้าของเอกสาร) ─────────────────────
function UserSearchInput({ value, onChange }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const [selected, setSelected] = useState(null)
  const wrapRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleInput = (e) => {
    const q = e.target.value
    setQuery(q)
    setSelected(null)
    onChange('')
    clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await userService.search(q)
        setResults(data || [])
        setOpen(true)
      } catch {} finally { setLoading(false) }
    }, 300)
  }

  const handleSelect = (u) => {
    setSelected(u)
    setQuery(`${u.student_id ? `[${u.student_id}] ` : ''}${u.name}`)
    onChange(u.user_id)
    setOpen(false)
    setResults([])
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    onChange('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="พิมพ์รหัสนักศึกษา, ชื่อ หรืออีเมล..."
          className="input-field pr-8"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">...</span>
        )}
        {selected && !loading && (
          <button type="button" onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          {results.map(u => (
            <button
              key={u.user_id}
              type="button"
              onClick={() => handleSelect(u)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-2">
                {u.student_id && (
                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>
                    {u.student_id}
                  </span>
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
          ไม่พบผู้ใช้
        </div>
      )}
    </div>
  )
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
function DetailModal({ doc, onClose, onDeleted, role }) {
  const [loading, setLoading] = useState(false)

  const handleTrash = async () => {
    if (!confirm(`ย้าย "${doc.title}" ไปถังขยะ?`)) return
    setLoading(true)
    try {
      await documentService.delete(doc.doc_id)
      toast.success('ย้ายเอกสารไปถังขยะสำเร็จ')
      onDeleted()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally { setLoading(false) }
  }

  const noExp = !!doc.no_expire
  const daysLeft = doc.days_remaining
  const daysColor = daysLeft < 0 ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 text-xs font-semibold rounded"
                style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>
                {doc.doc_type}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColor[doc.status]}`}>
                {statusLabel[doc.status]}
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
                        style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>
                        {doc.owner_student_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{doc.owner_email}</p>
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
                      <span className="text-lg flex-shrink-0">
                        {f.mime_type?.includes('pdf') ? '📄' : '🖼️'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{f.file_name}</p>
                        <p className="text-xs text-slate-400">
                          {(f.file_size / 1024).toFixed(1)} KB ·{' '}
                          {f.file_type === 'main' ? 'เอกสารหลัก'
                            : f.file_type === 'certificate' ? 'บันทึกข้อความรับรอง'
                            : 'ไฟล์แนบ'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      {f.mime_type?.includes('pdf') && (
                        <a href={`/api/documents/${doc.doc_id}/files/${f.file_id}/preview`}
                          target="_blank" rel="noreferrer"
                          className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all">
                          ดู
                        </a>
                      )}
                      <a href={`/api/documents/${doc.doc_id}/files/${f.file_id}/download`}
                        className="text-xs px-2.5 py-1 rounded-lg text-white"
                        style={{ backgroundColor: '#42b5e1' }}>
                        โหลด
                      </a>
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
              <span>🗑️</span>
              {loading ? 'กำลังดำเนินการ...' : 'ย้ายไปถังขยะ'}
            </button>
          )}
          <button onClick={onClose}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#42b5e1' }}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded, docTypes, user }) {
  const firstType = docTypes[0]?.type_code || ''
  const [form, setForm] = useState({
    title: '', doc_type: firstType, description: '',
    issue_date: '', expire_date: '', project_category: '',
    target_user_id: '',
  })
  const [noExpiry, setNoExpiry]   = useState(false)
  const [files, setFiles]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [dragOver, setDragOver]   = useState(false)

  useEffect(() => {
    if (docTypes.length > 0 && !form.doc_type)
      setForm(p => ({ ...p, doc_type: docTypes[0].type_code }))
  }, [docTypes])

  const handleFiles = (newFiles) => {
    setFiles(prev => [...prev, ...Array.from(newFiles)].slice(0, 5))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (files.length === 0) return toast.error('กรุณาแนบไฟล์อย่างน้อย 1 ไฟล์')
    if (user?.role === 'admin' && !form.target_user_id)
      return toast.error('กรุณาเลือกเจ้าของเอกสาร')
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
      onUploaded()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally { setLoading(false) }
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

          {/* เจ้าของเอกสาร — admin only — ค้นหาด้วย student_id */}
          {user?.role === 'admin' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                เจ้าของเอกสาร <span className="text-red-500">*</span>
              </label>
              <UserSearchInput
                value={form.target_user_id}
                onChange={(uid) => setForm(p => ({ ...p, target_user_id: uid }))}
              />
              <p className="text-xs text-slate-400 mt-1">ค้นหาด้วยรหัสนักศึกษา ชื่อ หรืออีเมล</p>
            </div>
          )}

          {/* ชื่อเอกสาร */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ชื่อเอกสาร</label>
            <input className="input-field" value={form.title} required
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="กรอกชื่อเอกสาร" />
          </div>

          {/* ประเภท */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ประเภทเอกสาร</label>
              <select className="input-field" value={form.doc_type}
                onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}>
                {docTypes.map(t => (
                  <option key={t.type_id} value={t.type_code}>{t.type_code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ประเภทโครงการ</label>
              <select className="input-field" value={form.project_category}
                onChange={e => setForm(p => ({ ...p, project_category: e.target.value }))}>
                <option value="">-- ยังไม่ระบุ --</option>
                <option value="urgent">เร่งด่วน</option>
                <option value="exempt">ยกเว้น</option>
                <option value="evaluation">ประเมิน</option>
              </select>
            </div>
          </div>

          {/* วันที่ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">วันที่ออก</label>
              <input className="input-field" type="date" value={form.issue_date} required
                onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">วันหมดอายุ</label>
              {noExpiry ? (
                <div className="input-field bg-slate-50 text-slate-400 text-sm flex items-center cursor-not-allowed select-none">
                  ไม่มีวันหมดอายุ
                </div>
              ) : (
                <input className="input-field" type="date" value={form.expire_date} required={!noExpiry}
                  onChange={e => setForm(p => ({ ...p, expire_date: e.target.value }))} />
              )}
              <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={noExpiry}
                  onChange={e => {
                    setNoExpiry(e.target.checked)
                    if (e.target.checked) setForm(p => ({ ...p, expire_date: '' }))
                  }}
                  className="rounded border-slate-300 text-fiet-blue"
                />
                <span className="text-xs text-slate-500">ไม่มีวันหมดอายุ</span>
              </label>
            </div>
          </div>

          {/* คำอธิบาย */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">คำอธิบาย (ไม่บังคับ)</label>
            <textarea className="input-field resize-none" rows={2} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="รายละเอียดเพิ่มเติม" />
          </div>

          {/* Drop zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              ไฟล์แนบ (PDF, DOC, รูปภาพ — สูงสุด 5 ไฟล์)
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
  const [docs, setDocs]         = useState([])
  const [docTypes, setDocTypes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [docType, setDocType]   = useState('')
  const [status, setStatus]     = useState('')
  const [modal, setModal]       = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    docTypeService.getAll().then(r => setDocTypes(r.data || [])).catch(() => {})
  }, [])

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await documentService.getAll({ search, doc_type: docType, status })
      setDocs(data.documents || [])
    } catch { toast.error('โหลดข้อมูลล้มเหลว') }
    finally { setLoading(false) }
  }, [search, docType, status])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const openDetail = async (doc) => {
    try {
      const { data } = await documentService.getById(doc.doc_id)
      setSelected(data)
      setModal('detail')
    } catch { toast.error('โหลดรายละเอียดล้มเหลว') }
  }

  const showStudentId = user?.role !== 'student'
  const showOwner     = user?.role !== 'student'

  const pageTitle = user?.role === 'admin' ? 'ใบประกาศทั้งหมด'
    : user?.role === 'advisor' ? 'ใบประกาศนักศึกษาในที่ปรึกษา'
    : 'ใบประกาศของฉัน'

  return (
    <div className="space-y-5 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>
            {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'advisor' ? 'อาจารย์' : 'นักศึกษา'}
          </p>
          <h1 className="text-2xl font-bold text-slate-800">{pageTitle}</h1>
          <p className="text-slate-400 text-sm mt-0.5">ทั้งหมด {docs.length} รายการ</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'student') && (
          <button onClick={() => setModal('upload')}
            className="self-start sm:self-auto px-4 py-2 rounded-lg text-sm font-medium text-white transition-all whitespace-nowrap"
            style={{ backgroundColor: '#42b5e1' }}>
            + อัปโหลดเอกสาร
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <input className="input-field w-full sm:max-w-xs" placeholder="ค้นหาชื่อเอกสารหรือเจ้าของ..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field w-full sm:w-auto sm:max-w-[160px]" value={docType} onChange={e => setDocType(e.target.value)}>
          <option value="">ทุกประเภท</option>
          {docTypes.map(t => (
            <option key={t.type_id} value={t.type_code}>{t.type_code}</option>
          ))}
        </select>
        <select className="input-field w-full sm:w-auto sm:max-w-[160px]" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          <option value="active">ปกติ</option>
          <option value="expiring_soon">ใกล้หมดอายุ</option>
          <option value="expired">หมดอายุ</option>
        </select>
      </div>

      {/* Table — horizontal scroll on small screens */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: showOwner ? '750px' : '600px' }}>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {[
                  'ชื่อเอกสาร', 'ประเภท',
                  ...(showStudentId ? ['รหัส'] : []),
                  ...(showOwner     ? ['เจ้าของ'] : []),
                  'วันออก', 'วันหมดอายุ', 'คงเหลือ', 'สถานะ', '',
                ].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-16 text-slate-400 text-sm">กำลังโหลด...</td></tr>
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <p className="text-slate-300 text-4xl mb-3">○</p>
                    <p className="text-slate-400 text-sm">ไม่พบเอกสาร</p>
                  </td>
                </tr>
              ) : docs.map(doc => {
                const noExp = !!doc.no_expire
                const days = doc.days_remaining
                const daysColor = noExp ? 'text-slate-400' : days < 0 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-slate-500'
                return (
                  <tr key={doc.doc_id} className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => openDetail(doc)}>
                    <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[180px] truncate">{doc.title}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded whitespace-nowrap"
                        style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>
                        {doc.doc_type}
                      </span>
                    </td>
                    {showStudentId && (
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {doc.owner_student_id || '—'}
                      </td>
                    )}
                    {showOwner && (
                      <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap max-w-[120px] truncate">
                        {doc.owner_name}
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-slate-500 text-xs tabular-nums whitespace-nowrap">
                      {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('th-TH') : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs tabular-nums whitespace-nowrap">
                      {noExp
                        ? <span className="text-slate-400 italic">ไม่มีวันหมดอายุ</span>
                        : <span className="text-slate-500">{doc.expire_date ? new Date(doc.expire_date).toLocaleDateString('th-TH') : '—'}</span>
                      }
                    </td>
                    <td className={`px-4 py-3.5 text-xs font-semibold tabular-nums whitespace-nowrap ${daysColor}`}>
                      {noExp ? '—' : days == null ? '—' : days < 0 ? `เกิน ${Math.abs(days)} วัน` : `${days} วัน`}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${noExp ? 'bg-slate-50 text-slate-500 border border-slate-200' : statusColor[doc.status] || 'bg-slate-100 text-slate-500'}`}>
                        {noExp ? 'ไม่มีวันหมดอายุ' : statusLabel[doc.status] || doc.status}
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
      </div>

      {modal === 'upload' && (
        <UploadModal
          onClose={() => setModal(null)}
          onUploaded={fetchDocs}
          docTypes={docTypes}
          user={user}
        />
      )}
      {modal === 'detail' && selected && (
        <DetailModal doc={selected} role={user?.role}
          onClose={() => { setModal(null); setSelected(null) }}
          onDeleted={fetchDocs} />
      )}
    </div>
  )
}

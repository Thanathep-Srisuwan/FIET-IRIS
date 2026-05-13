import { useEffect, useState, useCallback } from 'react'
import { executiveService, documentService } from '../../services/api'
import toast from 'react-hot-toast'
import useAcademicOptions from '../../hooks/useAcademicOptions'
import { FileText, Image as ImageIcon, UploadCloud, History, Trash2, ClipboardList } from 'lucide-react'

const statusColor = {
  active:        'bg-emerald-50 text-emerald-700 border border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border border-amber-200',
  expired:       'bg-red-50 text-red-600 border border-red-200',
}
const statusLabel  = { active: 'ปกติ', expiring_soon: 'ใกล้หมดอายุ', expired: 'หมดอายุ' }
const fileTypeLabel = { main: 'เอกสารหลัก', certificate: 'บันทึกข้อความรับรอง', attachment: 'ไฟล์แนบ' }
const timelineIcon  = {
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
  const Icon = file.mime_type?.includes('image') ? ImageIcon : FileText
  const handleDownload = async () => {
    try {
      const { data } = await documentService.download(docId, file.file_id)
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url; a.download = file.file_name; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch { toast.error('ไม่สามารถดาวน์โหลดได้') }
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
          <button type="button" onClick={() => onPreview(file)} disabled={previewLoading[file.file_id]}
            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50">
            {previewLoading[file.file_id] ? '...' : 'ดู'}
          </button>
        )}
        <button type="button" onClick={handleDownload}
          className="text-xs px-2.5 py-1 rounded-lg text-white" style={{ backgroundColor: '#42b5e1' }}>
          โหลด
        </button>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function ExecDetailModal({ doc, onClose, onRefresh }) {
  const [currentDoc, setCurrentDoc]       = useState(doc)
  const [previewLoading, setPreviewLoading] = useState({})
  const [versionFiles, setVersionFiles]   = useState([])
  const [versionFileType, setVersionFileType] = useState('attachment')
  const [versionNote, setVersionNote]     = useState('')
  const [uploadingVersion, setUploadingVersion] = useState(false)

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
    } catch { toast.error('ไม่สามารถเปิดไฟล์ได้') }
    finally { setPreviewLoading(p => ({ ...p, [f.file_id]: false })) }
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
      setVersionFiles([]); setVersionNote('')
      await refreshDetail()
      if (onRefresh) onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'อัปโหลดเวอร์ชันล้มเหลว')
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
        {/* Header */}
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
          {/* Dates */}
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

          {/* Owner */}
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
                </div>
                <p className="text-xs text-slate-400 truncate">{currentDoc.owner_email}</p>
                {currentDoc.advisor_name && <p className="text-xs text-slate-400 mt-0.5">อาจารย์: {currentDoc.advisor_name}</p>}
              </div>
            </div>
          </div>

          {/* Files */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ไฟล์แนบและเวอร์ชัน</p>
              <span className="text-[11px] text-slate-400">{files.length} ไฟล์ทั้งหมด</span>
            </div>
            {currentFiles.length > 0 ? (
              <div className="space-y-2">
                {currentFiles.map(f => (
                  <FileVersionRow key={f.file_id} file={f} docId={currentDoc.doc_id}
                    isCurrent previewLoading={previewLoading} onPreview={handlePreview} />
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
                    <FileVersionRow key={f.file_id} file={f} docId={currentDoc.doc_id}
                      previewLoading={previewLoading} onPreview={handlePreview} />
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Upload Version Form */}
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
              <input className="input-field" value={versionNote}
                onChange={e => setVersionNote(e.target.value)}
                placeholder="หมายเหตุเวอร์ชัน (ไม่บังคับ)" />
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

          {/* Timeline */}
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

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#42b5e1' }}>ปิด</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ExecutiveDocumentsPage() {
  const academicOptions = useAcademicOptions()
  const [docs, setDocs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [docType, setDocType]   = useState('')
  const [status, setStatus]     = useState('')
  const [degree, setDegree]     = useState('')
  const [program, setProgram]   = useState('')
  const [selected, setSelected] = useState(null)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await executiveService.getDocuments({ search, doc_type: docType, status, degree_level: degree, program })
      setDocs(data.documents || [])
    } catch { toast.error('โหลดข้อมูลล้มเหลว') }
    finally { setLoading(false) }
  }, [search, docType, status, degree, program])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const openDetail = async (doc) => {
    try {
      const { data } = await documentService.getById(doc.doc_id)
      setSelected(data)
    } catch { toast.error('โหลดรายละเอียดล้มเหลว') }
  }

  const exportCSV = () => {
    const header = 'ชื่อเอกสาร,ประเภท,เจ้าของ,หลักสูตร,อาจารย์ที่ปรึกษา,วันออก,วันหมดอายุ,คงเหลือ,สถานะ'
    const rows = docs.map(d =>
      `"${d.title}","${d.doc_type}","${d.owner_name}","${d.program||''}","${d.advisor_name||''}","${new Date(d.issue_date).toLocaleDateString('th-TH')}","${new Date(d.expire_date).toLocaleDateString('th-TH')}","${d.days_remaining}","${statusLabel[d.status]||d.status}"`
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = 'FIET-IRIS_all_documents.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>ผู้บริหาร</p>
          <h1 className="text-2xl font-bold text-slate-800">เอกสารทั้งคณะ</h1>
          <p className="text-slate-400 text-sm mt-0.5">ทั้งหมด {docs.length} รายการ</p>
        </div>
        <button onClick={exportCSV}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-all">
          ⬇ Export CSV
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <input className="input-field max-w-xs" placeholder="ค้นหาชื่อเอกสารหรือเจ้าของ..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field max-w-[140px]" value={docType} onChange={e => setDocType(e.target.value)}>
          <option value="">ทุกประเภท</option>
          <option value="RI">RI</option>
          <option value="IRB">IRB</option>
        </select>
        <select className="input-field max-w-[160px]" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          <option value="active">ปกติ</option>
          <option value="expiring_soon">ใกล้หมดอายุ</option>
          <option value="expired">หมดอายุ</option>
        </select>
        <select className="input-field max-w-[140px]" value={degree}
          onChange={e => { setDegree(e.target.value); setProgram('') }}>
          <option value="">ทุกระดับ</option>
          <option value="bachelor">ป.ตรี</option>
          <option value="master">ป.โท</option>
          <option value="doctoral">ป.เอก</option>
        </select>
        <select className="input-field max-w-[220px]" value={program} onChange={e => setProgram(e.target.value)}>
          <option value="">ทุกหลักสูตร</option>
          {(degree ? academicOptions.programsByDegree[degree] || [] : academicOptions.programs).map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '800px' }}>
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['ชื่อเอกสาร','ประเภท','เจ้าของ','หลักสูตร','อาจารย์ที่ปรึกษา','วันหมดอายุ','คงเหลือ','สถานะ','ไฟล์'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-16 text-slate-400 text-sm">กำลังโหลด...</td></tr>
            ) : docs.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-16">
                <p className="text-slate-300 text-4xl mb-3">○</p>
                <p className="text-slate-400 text-sm">ไม่พบเอกสาร</p>
              </td></tr>
            ) : docs.map(d => {
              const days = d.days_remaining
              const daysColor = d.no_expire ? 'text-slate-400' : days < 0 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-slate-500'
              const status = computedStatus(d)
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
                  <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[140px] truncate">{d.program || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{d.advisor_name || '—'}</td>
                  <td className="px-4 py-3.5 text-xs tabular-nums whitespace-nowrap">
                    {d.no_expire
                      ? <span className="italic text-slate-400">ไม่มีวันหมดอายุ</span>
                      : <span className="text-slate-500">{d.expire_date ? new Date(d.expire_date).toLocaleDateString('th-TH') : '—'}</span>
                    }
                  </td>
                  <td className={`px-4 py-3.5 text-xs font-semibold tabular-nums ${daysColor}`}>
                    {d.no_expire ? '—' : days == null ? '—' : days < 0 ? `เกิน ${Math.abs(days)} วัน` : `${days} วัน`}
                  </td>
                  <td className="px-4 py-3.5">
                    {status ? (
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColor[status] || 'bg-slate-100 text-slate-500'}`}>
                        {statusLabel[status] || d.status}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                        ไม่มีวันหมดอายุ
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

      {/* Detail Modal */}
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

import { useEffect, useState, useCallback } from 'react'
import { trashService, docTypeService } from '../../services/api'
import toast from 'react-hot-toast'

const DEGREE_OPTIONS = [
  { value: '',         label: 'ทุกระดับ' },
  { value: 'bachelor', label: 'ป.ตรี' },
  { value: 'master',   label: 'ป.โท' },
  { value: 'doctoral', label: 'ป.เอก' },
]

function PurgeBadge({ days }) {
  if (days === null || days === undefined) return null
  if (days <= 0)  return <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-600 text-white">ครบกำหนด</span>
  if (days <= 3)  return <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700">ลบใน {days} ว.</span>
  if (days <= 7)  return <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-orange-100 text-orange-700">ลบใน {days} ว.</span>
  return <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-500">ลบใน {days} ว.</span>
}

function ConfirmDialog({ title, message, confirmLabel, confirmStyle, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
            ยกเลิก
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60 ${confirmStyle}`}>
            {loading ? 'กำลังดำเนินการ...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminTrashPage() {
  const [docs, setDocs]               = useState([])
  const [total, setTotal]             = useState(0)
  const [docTypes, setDocTypes]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [docType, setDocType]         = useState('')
  const [degreeLevel, setDegreeLevel] = useState('')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [selected, setSelected]       = useState(new Set())
  const [confirm, setConfirm]         = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    docTypeService.getAll().then(r => setDocTypes(r.data || [])).catch(() => {})
  }, [])

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const { data } = await trashService.getAll({
        search,
        doc_type: docType,
        degree_level: degreeLevel,
        date_from: dateFrom,
        date_to: dateTo,
      })
      setDocs(data.documents || [])
      setTotal(data.total ?? data.documents?.length ?? 0)
    } catch { toast.error('โหลดข้อมูลล้มเหลว') }
    finally { setLoading(false) }
  }, [search, docType, degreeLevel, dateFrom, dateTo])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  // --- Selection ---
  const allIds        = docs.map(d => d.doc_id)
  const isAllSelected = allIds.length > 0 && allIds.every(id => selected.has(id))
  const isIndeterminate = selected.size > 0 && !isAllSelected

  const toggleAll = () => setSelected(isAllSelected ? new Set() : new Set(allIds))
  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // --- Single actions ---
  const handleRestore = async () => {
    setActionLoading(true)
    try {
      await trashService.restore(confirm.doc.doc_id)
      toast.success('กู้คืนเอกสารสำเร็จ')
      setConfirm(null); fetchDocs()
    } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด') }
    finally { setActionLoading(false) }
  }

  const handlePermanentDelete = async () => {
    setActionLoading(true)
    try {
      await trashService.permanentDelete(confirm.doc.doc_id)
      toast.success('ลบเอกสารถาวรสำเร็จ')
      setConfirm(null); fetchDocs()
    } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด') }
    finally { setActionLoading(false) }
  }

  // --- Bulk actions ---
  const handleBulkRestore = async () => {
    setActionLoading(true)
    try {
      await trashService.bulkRestore([...selected])
      toast.success(`กู้คืนสำเร็จ ${selected.size} รายการ`)
      setConfirm(null); fetchDocs()
    } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด') }
    finally { setActionLoading(false) }
  }

  const handleBulkPermanentDelete = async () => {
    setActionLoading(true)
    try {
      await trashService.bulkPermanentDelete([...selected])
      toast.success(`ลบถาวรสำเร็จ ${selected.size} รายการ`)
      setConfirm(null); fetchDocs()
    } catch (err) { toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด') }
    finally { setActionLoading(false) }
  }

  const clearFilters = () => {
    setSearch(''); setDocType(''); setDegreeLevel(''); setDateFrom(''); setDateTo('')
  }
  const hasFilters = search || docType || degreeLevel || dateFrom || dateTo

  return (
    <div className="space-y-5 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>
            ผู้ดูแลระบบ
          </p>
          <h1 className="text-2xl font-bold text-slate-800">ถังขยะ</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            เอกสารที่ถูกย้ายมาจากการหมดอายุหรือการลบ — {total} รายการ
            <span className="ml-2 text-slate-300">•</span>
            <span className="ml-2 text-amber-500">เอกสารในถังจะถูกลบถาวรอัตโนมัติหลัง 30 วัน</span>
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <input className="input-field w-full sm:max-w-xs" placeholder="ค้นหาชื่อเอกสารหรือเจ้าของ..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field w-full sm:w-auto sm:max-w-[160px]" value={docType} onChange={e => setDocType(e.target.value)}>
          <option value="">ทุกประเภท</option>
          {docTypes.map(t => (
            <option key={t.type_id} value={t.type_code}>{t.type_code}</option>
          ))}
        </select>
        <select className="input-field w-full sm:w-auto sm:max-w-[150px]" value={degreeLevel} onChange={e => setDegreeLevel(e.target.value)}>
          {DEGREE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">ย้ายตั้งแต่</label>
            <input type="date" className="input-field text-sm" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} max={dateTo || undefined} />
          </div>
          <span className="text-slate-400 text-sm mt-4">—</span>
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">ถึงวันที่</label>
            <input type="date" className="input-field text-sm" value={dateTo}
              onChange={e => setDateTo(e.target.value)} min={dateFrom || undefined} />
          </div>
        </div>

        {hasFilters && (
          <button onClick={clearFilters}
            className="text-xs px-3 py-2 rounded-lg text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors mt-4 sm:mt-0">
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-medium text-blue-700">เลือก {selected.size} รายการ</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => setConfirm({ type: 'bulk-restore' })}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#42b5e1' }}>
              กู้คืนที่เลือก
            </button>
            <button onClick={() => setConfirm({ type: 'bulk-delete' })}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white bg-red-500 transition-opacity hover:opacity-80">
              ลบถาวรที่เลือก
            </button>
            <button onClick={() => setSelected(new Set())}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '960px' }}>
            <thead className="bg-slate-50 border-b border-slate-200">
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
                {['ชื่อเอกสาร', 'ประเภท', 'รหัส', 'เจ้าของ', 'ระดับ', 'วันหมดอายุ', 'ย้ายเข้าถัง', 'เหตุผล / สาเหตุ', ''].map(h => (
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
                  <td colSpan={10} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl">🗑️</div>
                      <p className="text-slate-400 text-sm">ถังขยะว่างเปล่า</p>
                    </div>
                  </td>
                </tr>
              ) : docs.map(doc => (
                <tr key={doc.doc_id}
                  className={`hover:bg-slate-50 transition-colors ${selected.has(doc.doc_id) ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-4 py-3.5">
                    <input type="checkbox"
                      checked={selected.has(doc.doc_id)}
                      onChange={() => toggleOne(doc.doc_id)}
                      className="w-4 h-4 rounded accent-[#42b5e1] cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[180px]">
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
                  <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap max-w-[120px] truncate">
                    {doc.owner_name}
                  </td>
                  <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                    {doc.owner_degree_level === 'master'   ? <span className="text-purple-600">ป.โท</span>
                    : doc.owner_degree_level === 'doctoral' ? <span className="text-rose-600">ป.เอก</span>
                    : doc.owner_degree_level === 'bachelor' ? <span className="text-slate-500">ป.ตรี</span>
                    : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-xs tabular-nums whitespace-nowrap">
                    {doc.no_expire
                      ? <span className="text-slate-400 italic">ไม่มีวันหมดอายุ</span>
                      : doc.expire_date
                        ? <span className="text-red-500 font-medium">{new Date(doc.expire_date).toLocaleDateString('th-TH')}</span>
                        : '—'
                    }
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                    {doc.trashed_at ? new Date(doc.trashed_at).toLocaleDateString('th-TH', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    }) : '—'}
                  </td>
                  <td className="px-4 py-3.5 max-w-[200px]">
                    {/* High-level reason badge */}
                    {doc.trashed_by === null ? (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-600 border border-red-200 whitespace-nowrap">
                        หมดอายุอัตโนมัติ
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                        ลบโดย {doc.trashed_by_name || 'แอดมิน'}
                      </span>
                    )}
                    {/* Detailed reason */}
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
                        กู้คืน
                      </button>
                      <button onClick={() => setConfirm({ type: 'delete', doc })}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium text-white whitespace-nowrap transition-opacity hover:opacity-80 bg-red-500">
                        ลบถาวร
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm dialogs — single */}
      {confirm?.type === 'restore' && (
        <ConfirmDialog
          title="กู้คืนเอกสาร"
          message={`กู้คืน "${confirm.doc.title}" กลับสู่ระบบ? ระบบจะคำนวณสถานะตามวันหมดอายุโดยอัตโนมัติ`}
          confirmLabel="กู้คืน"
          confirmStyle="bg-[#42b5e1] hover:bg-[#2fa0cc]"
          onConfirm={handleRestore}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}
      {confirm?.type === 'delete' && (
        <ConfirmDialog
          title="ลบเอกสารถาวร"
          message={`ลบ "${confirm.doc.title}" ออกอย่างถาวร? เจ้าของเอกสารจะได้รับการแจ้งเตือนทางอีเมลและระบบ`}
          confirmLabel="ลบถาวร"
          confirmStyle="bg-red-500 hover:bg-red-600"
          onConfirm={handlePermanentDelete}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}

      {/* Confirm dialogs — bulk */}
      {confirm?.type === 'bulk-restore' && (
        <ConfirmDialog
          title="กู้คืนหลายรายการ"
          message={`กู้คืนเอกสารที่เลือก ${selected.size} รายการ? ระบบจะคำนวณสถานะแต่ละรายการโดยอัตโนมัติ`}
          confirmLabel={`กู้คืน ${selected.size} รายการ`}
          confirmStyle="bg-[#42b5e1] hover:bg-[#2fa0cc]"
          onConfirm={handleBulkRestore}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}
      {confirm?.type === 'bulk-delete' && (
        <ConfirmDialog
          title="ลบถาวรหลายรายการ"
          message={`ลบเอกสารที่เลือก ${selected.size} รายการออกอย่างถาวร? เจ้าของแต่ละรายการจะได้รับการแจ้งเตือนทางอีเมลและระบบ`}
          confirmLabel={`ลบถาวร ${selected.size} รายการ`}
          confirmStyle="bg-red-500 hover:bg-red-600"
          onConfirm={handleBulkPermanentDelete}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

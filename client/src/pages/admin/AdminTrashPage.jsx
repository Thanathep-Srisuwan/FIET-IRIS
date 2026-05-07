import { useEffect, useState, useCallback } from 'react'
import { trashService, docTypeService } from '../../services/api'
import toast from 'react-hot-toast'

const reasonLabel = (doc) => doc.trashed_by === null ? 'หมดอายุอัตโนมัติ' : `โดย ${doc.trashed_by_name || 'แอดมิน'}`

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
  const [docs, setDocs]         = useState([])
  const [docTypes, setDocTypes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [docType, setDocType]   = useState('')
  const [confirm, setConfirm]   = useState(null) // { type: 'restore'|'delete', doc }
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    docTypeService.getAll().then(r => setDocTypes(r.data || [])).catch(() => {})
  }, [])

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await trashService.getAll({ search, doc_type: docType })
      setDocs(data.documents || [])
    } catch { toast.error('โหลดข้อมูลล้มเหลว') }
    finally { setLoading(false) }
  }, [search, docType])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleRestore = async () => {
    setActionLoading(true)
    try {
      await trashService.restore(confirm.doc.doc_id)
      toast.success('กู้คืนเอกสารสำเร็จ')
      setConfirm(null)
      fetchDocs()
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally { setActionLoading(false) }
  }

  const handlePermanentDelete = async () => {
    setActionLoading(true)
    try {
      await trashService.permanentDelete(confirm.doc.doc_id)
      toast.success('ลบเอกสารถาวรสำเร็จ')
      setConfirm(null)
      fetchDocs()
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally { setActionLoading(false) }
  }

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
            เอกสารที่ถูกย้ายมาจากการหมดอายุหรือการลบ — {docs.length} รายการ
          </p>
        </div>

        {/* Info badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
          style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
          <span>⚠️</span>
          เฉพาะแอดมินเท่านั้น
        </div>
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '800px' }}>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['ชื่อเอกสาร', 'ประเภท', 'รหัส', 'เจ้าของ', 'วันหมดอายุ', 'ย้ายเข้าถัง', 'เหตุผล', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16 text-slate-400 text-sm">กำลังโหลด...</td></tr>
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl">🗑️</div>
                      <p className="text-slate-400 text-sm">ถังขยะว่างเปล่า</p>
                    </div>
                  </td>
                </tr>
              ) : docs.map(doc => (
                <tr key={doc.doc_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[180px] truncate">{doc.title}</td>
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
                  <td className="px-4 py-3.5">
                    {doc.trashed_by === null ? (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-600 border border-red-200 whitespace-nowrap">
                        หมดอายุอัตโนมัติ
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                        ลบโดย {doc.trashed_by_name || 'แอดมิน'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirm({ type: 'restore', doc })}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium text-white whitespace-nowrap transition-opacity hover:opacity-80"
                        style={{ backgroundColor: '#42b5e1' }}>
                        กู้คืน
                      </button>
                      <button
                        onClick={() => setConfirm({ type: 'delete', doc })}
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

      {/* Confirm dialogs */}
      {confirm?.type === 'restore' && (
        <ConfirmDialog
          title="กู้คืนเอกสาร"
          message={`กู้คืน "${confirm.doc.title}" กลับสู่ระบบ? ระบบจะคำนวณสถานะตามวันหมดอายุของเอกสารโดยอัตโนมัติ`}
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
          message={`ลบ "${confirm.doc.title}" ออกอย่างถาวร? ไฟล์ทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้อีก`}
          confirmLabel="ลบถาวร"
          confirmStyle="bg-red-500 hover:bg-red-600"
          onConfirm={handlePermanentDelete}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

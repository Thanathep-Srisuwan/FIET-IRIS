import { useEffect, useState, useCallback } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const reasonLabel = {
  auto_expired:    'หมดอายุอัตโนมัติ',
  manual_admin:    'ลบโดย Admin',
  replaced_by_new: 'แทนด้วยเอกสารใหม่',
}
const reasonColor = {
  auto_expired:    'bg-red-50 text-red-600 border border-red-200',
  manual_admin:    'bg-amber-50 text-amber-700 border border-amber-200',
  replaced_by_new: 'bg-blue-50 text-blue-700 border border-blue-200',
}

export default function AdminLogsPage() {
  const [logs, setLogs]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [reason, setReason]   = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/logs/deletions', { params: { search, reason } })
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch { toast.error('โหลดข้อมูลล้มเหลว') }
    finally { setLoading(false) }
  }, [search, reason])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const exportCSV = () => {
    const header = 'ชื่อเอกสาร,เจ้าของ,ชื่อไฟล์,เหตุผล,ลบโดย,วันที่ลบ'
    const rows = logs.map(l =>
      `"${l.doc_title}","${l.owner_email}","${l.original_file_name}","${reasonLabel[l.reason] || l.reason}","${l.deleted_by_name || 'ระบบ'}","${new Date(l.deleted_at).toLocaleString('th-TH')}"`
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = 'FIET-IRIS_deletion_logs.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // สรุปตามเหตุผล
  const autoCount   = logs.filter(l => l.reason === 'auto_expired').length
  const manualCount = logs.filter(l => l.reason === 'manual_admin').length
  const replacedCount = logs.filter(l => l.reason === 'replaced_by_new').length
  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>
            ผู้ดูแลระบบ
          </p>
          <h1 className="text-2xl font-bold text-slate-800">ประวัติการลบเอกสาร</h1>
          <p className="text-slate-400 text-sm mt-0.5">ทั้งหมด {total} รายการ</p>
        </div>
        <button onClick={exportCSV}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-all">
          ⬇ Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'ทั้งหมด',              value: total,       bg: '#f0f9ff', border: '#bae6fd', val: '#0c4a6e', text: '#0369a1' },
          { label: 'หมดอายุอัตโนมัติ',    value: autoCount,   bg: '#fff1f2', border: '#fecdd3', val: '#881337', text: '#be123c' },
          { label: 'ลบโดย Admin',          value: manualCount, bg: '#fffbeb', border: '#fde68a', val: '#78350f', text: '#b45309' },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-5 border"
            style={{ backgroundColor: c.bg, borderColor: c.border }}>
            <p className="text-3xl font-bold mb-1" style={{ color: c.val }}>{c.value}</p>
            <p className="text-sm font-medium" style={{ color: c.text }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input className="input-field w-full sm:max-w-xs"
          placeholder="ค้นหาชื่อเอกสารหรืออีเมล..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field w-full sm:max-w-[180px]" value={reason}
          onChange={e => setReason(e.target.value)}>
          <option value="">ทุกเหตุผล</option>
          <option value="auto_expired">หมดอายุอัตโนมัติ</option>
          <option value="manual_admin">ลบโดย Admin</option>
          <option value="replaced_by_new">แทนด้วยเอกสารใหม่</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '700px' }}>
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['ชื่อเอกสาร','เจ้าของเอกสาร','ชื่อไฟล์','เหตุผล','ลบโดย','วันที่ลบ'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-16 text-slate-400 text-sm">กำลังโหลด...</td></tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <p className="text-slate-300 text-4xl mb-3">○</p>
                  <p className="text-slate-400 text-sm">ยังไม่มีประวัติการลบเอกสาร</p>
                </td>
              </tr>
            ) : logs.map(log => (
              <tr key={log.log_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[200px] truncate">
                  {log.doc_title}
                </td>
                <td className="px-4 py-3.5 text-slate-500 text-xs">{log.owner_email}</td>
                <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[160px] truncate">
                  {log.original_file_name}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${reasonColor[log.reason] || 'bg-slate-100 text-slate-500'}`}>
                    {reasonLabel[log.reason] || log.reason}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                  {log.deleted_by_name || (
                    <span className="text-slate-400 italic">ระบบอัตโนมัติ</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-slate-500 text-xs tabular-nums whitespace-nowrap">
                  {new Date(log.deleted_at).toLocaleString('th-TH', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

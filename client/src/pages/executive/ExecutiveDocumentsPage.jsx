import { useEffect, useState, useCallback } from 'react'
import { executiveService } from '../../services/api'
import toast from 'react-hot-toast'

const BRANCHES_BY_DEGREE = {
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
const ALL_BRANCHES = Object.values(BRANCHES_BY_DEGREE).flat()
const statusColor = {
  active:        'bg-emerald-50 text-emerald-700 border border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border border-amber-200',
  expired:       'bg-red-50 text-red-600 border border-red-200',
}
const statusLabel = { active: 'ปกติ', expiring_soon: 'ใกล้หมดอายุ', expired: 'หมดอายุ' }

export default function ExecutiveDocumentsPage() {
  const [docs, setDocs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [docType, setDocType] = useState('')
  const [status, setStatus]   = useState('')
  const [degree, setDegree]   = useState('')
  const [branch, setBranch]   = useState('')

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await executiveService.getDocuments({ search, doc_type: docType, status, degree_level: degree, branch })
      setDocs(data.documents || [])
    } catch { toast.error('โหลดข้อมูลล้มเหลว') }
    finally { setLoading(false) }
  }, [search, docType, status, degree, branch])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const exportCSV = () => {
    const header = 'ชื่อเอกสาร,ประเภท,เจ้าของ,สาขา,อาจารย์ที่ปรึกษา,วันออก,วันหมดอายุ,คงเหลือ,สถานะ'
    const rows = docs.map(d =>
      `"${d.title}","${d.doc_type}","${d.owner_name}","${d.department||''}","${d.advisor_name||''}","${new Date(d.issue_date).toLocaleDateString('th-TH')}","${new Date(d.expire_date).toLocaleDateString('th-TH')}","${d.days_remaining}","${statusLabel[d.status]||d.status}"`
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
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
          <p className="text-slate-400 text-sm mt-0.5">ทั้งหมด {docs.length} รายการ (อ่านอย่างเดียว)</p>
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
          onChange={e => { setDegree(e.target.value); setBranch('') }}>
          <option value="">ทุกระดับ</option>
          <option value="bachelor">ป.ตรี</option>
          <option value="master">ป.โท</option>
          <option value="doctoral">ป.เอก</option>
        </select>
        <select className="input-field max-w-[220px]" value={branch} onChange={e => setBranch(e.target.value)}>
          <option value="">ทุกสาขา</option>
          {(degree ? BRANCHES_BY_DEGREE[degree] || [] : ALL_BRANCHES).map(b => (
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
              {['ชื่อเอกสาร','ประเภท','เจ้าของ','สาขา','อาจารย์ที่ปรึกษา','วันหมดอายุ','คงเหลือ','สถานะ'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-16 text-slate-400 text-sm">กำลังโหลด...</td></tr>
            ) : docs.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16">
                <p className="text-slate-300 text-4xl mb-3">○</p>
                <p className="text-slate-400 text-sm">ไม่พบเอกสาร</p>
              </td></tr>
            ) : docs.map(d => {
              const days = d.days_remaining
              const daysColor = days < 0 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-slate-500'
              return (
                <tr key={d.doc_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[180px] truncate">{d.title}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded"
                      style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>{d.doc_type}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{d.owner_name}</td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[140px] truncate">{d.department || '—'}</td>
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
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColor[d.status] || 'bg-slate-100 text-slate-500'}`}>
                      {statusLabel[d.status] || d.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

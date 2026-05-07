import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { documentService, userService, notificationService, docTypeService } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

const statusColor = {
  active:        'bg-emerald-50 text-emerald-700 border border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border border-amber-200',
  expired:       'bg-red-50 text-red-600 border border-red-200',
}
const statusLabel = { active: 'ปกติ', expiring_soon: 'ใกล้หมดอายุ', expired: 'หมดอายุ' }

const TYPE_COLORS = ['#42b5e1', '#f7924a', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b']

function StatCard({ label, value, color }) {
  const palette = {
    blue:   { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', val: '#0c4a6e' },
    orange: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', val: '#7c2d12' },
    red:    { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', val: '#881337' },
    slate:  { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', val: '#1e293b' },
  }
  const p = palette[color] || palette.slate
  return (
    <div className="rounded-xl p-5 border" style={{ backgroundColor: p.bg, borderColor: p.border }}>
      <p className="text-3xl font-bold mb-1" style={{ color: p.val }}>{value ?? '0'}</p>
      <p className="text-sm font-medium" style={{ color: p.text }}>{label}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const [docs, setDocs]       = useState([])
  const [users, setUsers]     = useState([])
  const [notifs, setNotifs]   = useState([])
  const [docTypes, setDocTypes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      documentService.getAll({ limit: 8 }),
      userService.getAll(),
      notificationService.getUnread(),
      docTypeService.getAll(),
    ]).then(([d, u, n, t]) => {
      setDocs(d.data?.documents || [])
      setUsers(u.data?.users    || [])
      setNotifs(n.data          || [])
      setDocTypes(t.data        || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const totalDocs    = docs.length
  const expiringSoon = docs.filter(d => d.status === 'expiring_soon').length
  const expired      = docs.filter(d => d.status === 'expired').length
  const totalUsers   = users.length

  // คำนวณจำนวนเอกสารแต่ละประเภทจาก doc types จริง
  const typeCounts = docTypes.map((t, i) => ({
    label: t.type_code,
    count: docs.filter(d => d.doc_type === t.type_code).length,
    color: TYPE_COLORS[i % TYPE_COLORS.length],
  }))
  const maxBar = Math.max(...typeCounts.map(t => t.count), 1)

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>
          Admin
        </p>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="เอกสารทั้งหมด"    value={totalDocs}    color="blue"   />
        <StatCard label="ใกล้หมดอายุ"      value={expiringSoon} color="orange"  />
        <StatCard label="หมดอายุแล้ว"      value={expired}      color="red"    />
        <StatCard label="ผู้ใช้งานทั้งหมด"  value={totalUsers}   color="slate"  />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ตารางเอกสาร */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">เอกสารล่าสุดในระบบ</h2>
            <Link to="/documents" className="text-xs font-medium" style={{ color: '#42b5e1' }}>
              ดูทั้งหมด →
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">กำลังโหลดข้อมูล...</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-300 text-4xl mb-3">○</p>
              <p className="text-slate-400 text-sm">ยังไม่มีเอกสารในระบบ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '480px' }}>
              <thead className="bg-slate-50">
                <tr>
                  {['ชื่อเอกสาร','ประเภท','วันหมดอายุ','สถานะ'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {docs.map(doc => (
                  <tr key={doc.doc_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-700 max-w-[200px] truncate">
                      {doc.title}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded"
                        style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>
                        {doc.doc_type}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs tabular-nums">
                      {doc.no_expire ? <span className="italic text-slate-400">ไม่มีวันหมดอายุ</span> : doc.expire_date ? new Date(doc.expire_date).toLocaleDateString('th-TH') : '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColor[doc.status] || 'bg-slate-100 text-slate-500'}`}>
                        {statusLabel[doc.status] || doc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Chart — dynamic ตาม DOC_TYPES */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">สัดส่วนประเภทเอกสาร</h2>
            {typeCounts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีประเภทเอกสาร</p>
            ) : (
              <>
                <div className="space-y-4">
                  {typeCounts.map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-600">{item.label}</span>
                        <span className="text-slate-400 tabular-nums">{item.count} ฉบับ</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(item.count / maxBar) * 100}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`mt-5 pt-4 border-t border-slate-100 grid gap-2 text-center`}
                  style={{ gridTemplateColumns: `repeat(${Math.min(typeCounts.length, 3)}, 1fr)` }}>
                  {typeCounts.map(item => (
                    <div key={item.label} className="bg-slate-50 rounded-lg py-3">
                      <p className="text-xl font-bold" style={{ color: item.color }}>{item.count}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* การแจ้งเตือน */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">การแจ้งเตือน</h2>
              {notifs.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: '#f7924a' }}>
                  {notifs.length}
                </span>
              )}
            </div>
            {notifs.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-300 text-3xl mb-2">○</p>
                <p className="text-slate-400 text-xs">ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifs.slice(0, 4).map(n => (
                  <div key={n.notif_id}
                    className="p-3 rounded-lg border text-xs"
                    style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                    <p className="font-semibold text-amber-800 truncate">{n.doc_title}</p>
                    <p className="text-amber-600 mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

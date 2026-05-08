import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminService, docTypeService } from '../../services/api'

const statusColor = {
  active:        'bg-emerald-50 text-emerald-700 border border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-700 border border-amber-200',
  expired:       'bg-red-50 text-red-600 border border-red-200',
}
const statusLabel = { active: 'ปกติ', expiring_soon: 'ใกล้หมดอายุ', expired: 'หมดอายุ' }

const TYPE_COLORS = ['#42b5e1', '#f7924a', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#84cc16']

const USER_GROUPS = [
  { key: 'bachelor', label: 'ปริญญาตรี',      color: '#42b5e1' },
  { key: 'master',   label: 'ปริญญาโท',       color: '#8b5cf6' },
  { key: 'doctoral', label: 'ปริญญาเอก',      color: '#f43f5e' },
  { key: 'advisor',  label: 'อาจารย์',    color: '#10b981' },
  { key: 'staff',    label: 'เจ้าหน้าที่', color: '#f7924a' },
]

function StatCard({ label, value, color, sub, onClick }) {
  const palette = {
    blue:   { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', val: '#0c4a6e' },
    orange: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', val: '#7c2d12' },
    red:    { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', val: '#881337' },
    slate:  { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', val: '#1e293b' },
  }
  const p = palette[color] || palette.slate
  return (
    <div
      className={`rounded-xl p-5 border transition-shadow ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      style={{ backgroundColor: p.bg, borderColor: p.border }}
      onClick={onClick}
    >
      <p className="text-3xl font-bold mb-1" style={{ color: p.val }}>{value ?? '0'}</p>
      <p className="text-sm font-medium" style={{ color: p.text }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: p.text, opacity: 0.6 }}>{sub}</p>}
      {onClick && <p className="text-xs mt-1.5 font-medium" style={{ color: p.text, opacity: 0.5 }}>คลิกเพื่อดูทั้งหมด →</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats]       = useState(null)
  const [docTypes, setDocTypes] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      adminService.getStats(),
      docTypeService.getAll(),
    ]).then(([s, t]) => {
      setStats(s.data)
      setDocTypes(t.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const docStats       = stats?.docStats       || {}
  const userBreakdown  = stats?.userBreakdown  || []
  const expiryTimeline = stats?.expiryTimeline || {}
  const recentActivity = stats?.recentActivity || []
  const alertDocs      = stats?.alertDocs      || []

  // จับคู่กับ USER_GROUPS เพื่อให้ลำดับคงที่
  const groupData = USER_GROUPS.map(g => {
    const found = userBreakdown.find(r => r.grp === g.key)
    return { ...g, user_count: found?.user_count ?? 0, doc_count: found?.doc_count ?? 0 }
  })

  // doc type chart data
  const typeCounts = docTypes.map((t, i) => {
    const count = recentActivity.filter(a => a.doc_type === t.type_code).length
    return { label: t.type_code, color: TYPE_COLORS[i % TYPE_COLORS.length] }
  })
  // ใช้ userBreakdown doc_count รวม แทน
  const totalDocsByType = docTypes.map((t, i) => ({
    label: t.type_code,
    color: TYPE_COLORS[i % TYPE_COLORS.length],
  }))

  const maxTimeline = Math.max(
    expiryTimeline.within_30 || 0,
    expiryTimeline.within_60 || 0,
    expiryTimeline.within_90 || 0,
    expiryTimeline.already_expired || 0,
    1,
  )

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>Admin</p>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      </div>

      {/* ── Row 1: Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="เอกสารทั้งหมด" value={docStats.total}
          color="blue" onClick={() => navigate('/documents')}
        />
        <StatCard
          label="ใกล้หมดอายุ" value={docStats.expiring_soon}
          color="orange" onClick={() => navigate('/documents')}
        />
        <StatCard
          label="หมดอายุแล้ว" value={docStats.expired}
          color="red" onClick={() => navigate('/documents')}
        />
        <StatCard
          label="ปกติ" value={docStats.active}
          color="slate"
          sub={`จากทั้งหมด ${docStats.total ?? 0} ฉบับ`}
        />
      </div>

      {/* ── Row 2: User Breakdown ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 mb-3">ผู้ใช้งานในระบบ</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {groupData.map(g => (
            <div key={g.key}
              className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/admin/users')}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                <p className="text-xs font-semibold text-slate-500">{g.label}</p>
              </div>
              <p className="text-2xl font-bold mb-0.5" style={{ color: g.color }}>{g.user_count}</p>
              <p className="text-xs text-slate-400">{g.doc_count} เอกสาร</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 3: Recent Docs ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">เอกสารอัปโหลดล่าสุด</h2>
            <Link to="/documents" className="text-xs font-medium" style={{ color: '#42b5e1' }}>
              ดูทั้งหมด →
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">กำลังโหลดข้อมูล...</div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-300 text-3xl mb-2">○</p>
              <p className="text-slate-400 text-sm">ยังไม่มีเอกสารในระบบ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '480px' }}>
                <thead className="bg-slate-50">
                  <tr>
                    {['ชื่อเอกสาร', 'ประเภท', 'เจ้าของ', 'วันที่อัปโหลด', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentActivity.map(doc => (
                    <tr key={doc.doc_id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate('/documents')}>
                      <td className="px-5 py-3.5 font-medium text-slate-700 max-w-[180px] truncate">
                        {doc.doc_title}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded"
                          style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>
                          {doc.doc_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[120px] truncate">
                        {doc.owner_name}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 tabular-nums whitespace-nowrap">
                        {new Date(doc.created_at).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#42b5e1' }}>
                          ดูรายละเอียด →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* ── Row 4: Expiry Timeline + Notifications ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Expiry Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">เอกสารตามระยะหมดอายุ</h2>
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">กำลังโหลด...</div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'หมดอายุแล้ว',       value: expiryTimeline.already_expired, color: '#ef4444', bg: '#fef2f2' },
                { label: 'หมดอายุใน 30 วัน',  value: expiryTimeline.within_30,       color: '#f97316', bg: '#fff7ed' },
                { label: 'หมดอายุใน 31-60 วัน', value: expiryTimeline.within_60,     color: '#eab308', bg: '#fefce8' },
                { label: 'หมดอายุใน 61-90 วัน', value: expiryTimeline.within_90,     color: '#22c55e', bg: '#f0fdf4' },
              ].map(item => (
                <div key={item.label}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:brightness-95"
                  style={{ backgroundColor: item.bg }}
                  onClick={() => navigate('/documents')}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: item.color }}>
                        {item.value ?? 0} ฉบับ
                      </p>
                    </div>
                    <div className="h-1.5 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${((item.value ?? 0) / maxTimeline) * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications — เอกสารหมดอายุ/ใกล้หมดอายุ */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">การแจ้งเตือนเอกสาร</h2>
            {alertDocs.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: '#f7924a' }}>
                {alertDocs.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">กำลังโหลด...</div>
          ) : alertDocs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-300 text-3xl mb-2">○</p>
              <p className="text-slate-400 text-xs">ไม่มีเอกสารที่ต้องแจ้งเตือน</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {alertDocs.map(doc => {
                const expired = doc.days_remaining < 0
                return (
                  <div key={doc.doc_id}
                    className="p-3 rounded-lg border text-xs cursor-pointer hover:shadow-sm transition-shadow"
                    style={expired
                      ? { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }
                      : { backgroundColor: '#fffbeb', borderColor: '#fde68a' }}
                    onClick={() => navigate('/documents')}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-semibold truncate ${expired ? 'text-red-800' : 'text-amber-800'}`}>
                        {doc.doc_title}
                      </p>
                      <span className={`flex-shrink-0 text-xs font-bold ${expired ? 'text-red-600' : 'text-amber-600'}`}>
                        {expired
                          ? `เกิน ${Math.abs(doc.days_remaining)} วัน`
                          : `อีก ${doc.days_remaining} วัน`}
                      </span>
                    </div>
                    <p className={`mt-0.5 ${expired ? 'text-red-500' : 'text-amber-500'}`}>
                      {doc.owner_name} · {doc.doc_type}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  )
}

import { useEffect, useState } from 'react'
import { executiveService } from '../../services/api'

const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function StatCard({ label, value, color, sub }) {
  const palette = {
    blue:   { bg: '#f0f9ff', border: '#bae6fd', val: '#0c4a6e', text: '#0369a1' },
    orange: { bg: '#fff7ed', border: '#fed7aa', val: '#7c2d12', text: '#c2410c' },
    red:    { bg: '#fff1f2', border: '#fecdd3', val: '#881337', text: '#be123c' },
    green:  { bg: '#f0fdf4', border: '#bbf7d0', val: '#14532d', text: '#15803d' },
    slate:  { bg: '#f8fafc', border: '#e2e8f0', val: '#1e293b', text: '#475569' },
  }
  const p = palette[color] || palette.slate
  return (
    <div className="rounded-xl p-5 border" style={{ backgroundColor: p.bg, borderColor: p.border }}>
      <p className="text-3xl font-bold mb-1" style={{ color: p.val }}>{value ?? '0'}</p>
      <p className="text-sm font-medium" style={{ color: p.text }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: p.text, opacity: 0.7 }}>{sub}</p>}
    </div>
  )
}

export default function ExecutiveDashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    executiveService.getOverview()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400 text-sm">กำลังโหลดข้อมูล...</p>
    </div>
  )

  const { stats, users, trend, topExpiring } = data || {}
  const maxTrend = Math.max(...(trend?.map(t => t.count) || [1]), 1)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>
          ผู้บริหาร
        </p>
        <h1 className="text-2xl font-bold text-slate-800">ภาพรวมคณะ FIET</h1>
        <p className="text-slate-400 text-sm mt-0.5">ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="เอกสารทั้งหมด"   value={stats?.total_docs}    color="blue"   />
        <StatCard label="ปกติ"            value={stats?.active}        color="green"  />
        <StatCard label="ใกล้หมดอายุ"    value={stats?.expiring_soon} color="orange" />
        <StatCard label="หมดอายุแล้ว"    value={stats?.expired}       color="red"    />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* กราฟแนวโน้ม */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-5">แนวโน้มการอัปโหลดเอกสาร (6 เดือนล่าสุด)</h2>
          {trend?.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-300 text-sm">ยังไม่มีข้อมูล</div>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {trend?.map((t, i) => {
                const month = MONTH_TH[parseInt(t.month?.split('-')[1]) - 1]
                const h = Math.max((t.count / maxTrend) * 100, 4)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs font-semibold text-slate-600">{t.count}</p>
                    <div className="w-full rounded-t-lg transition-all duration-500"
                      style={{ height: `${h}%`, backgroundColor: '#42b5e1', opacity: 0.85 }} />
                    <p className="text-xs text-slate-400">{month}</p>
                  </div>
                )
              })}
            </div>
          )}
          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#42b5e1' }} />
              RI {stats?.ri_count} ฉบับ
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f7924a' }} />
              IRB {stats?.irb_count} ฉบับ
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* ผู้ใช้งาน */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">ผู้ใช้งานในระบบ</h2>
            <div className="space-y-3">
              {[
                { label: 'นักศึกษา', value: users?.students, color: '#42b5e1' },
                { label: 'อาจารย์',  value: users?.advisors, color: '#10b981' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600">{item.label}</span>
                    <span className="text-slate-400 tabular-nums">{item.value || 0} คน</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(((item.value || 0) / Math.max(users?.total_users || 1, 1)) * 100, 100)}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-400 pt-1">รวมทั้งหมด {users?.total_users || 0} คน</p>
            </div>
          </div>

          {/* Top สาขาใกล้หมดอายุ */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              สาขาที่มีเอกสารใกล้หมดอายุ
            </h2>
            {!topExpiring?.length ? (
              <p className="text-xs text-slate-400 text-center py-4">ไม่มีเอกสารใกล้หมดอายุ ✅</p>
            ) : (
              <div className="space-y-2">
                {topExpiring.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg"
                    style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                    <p className="text-xs font-medium text-amber-800 truncate max-w-[160px]">{t.department || 'ไม่ระบุสาขา'}</p>
                    <span className="text-xs font-bold text-amber-700 flex-shrink-0 ml-2">{t.expiring_count} ฉบับ</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RI vs IRB */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">สัดส่วนประเภทเอกสาร</h2>
        <div className="grid grid-cols-2 gap-6">
          {[
            { label: 'RI',  count: stats?.ri_count,  color: '#42b5e1', bg: '#f0f9ff' },
            { label: 'IRB', count: stats?.irb_count, color: '#f7924a', bg: '#fff7ed' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-4 p-4 rounded-xl"
              style={{ backgroundColor: item.bg }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}>
                {item.label}
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{item.count || 0}</p>
                <p className="text-sm text-slate-500">ใบประกาศ {item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {stats?.total_docs ? Math.round(((item.count || 0) / stats.total_docs) * 100) : 0}% ของทั้งหมด
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

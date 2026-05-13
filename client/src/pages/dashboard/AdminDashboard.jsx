import { useEffect, useState } from 'react'
import { adminService, documentService } from '../../services/api'

const statusLabel = { active: 'ปกติ', expiring_soon: 'ใกล้หมดอายุ', expired: 'หมดอายุ' }

const USER_GROUPS = [
  { key: 'bachelor',  label: 'นักศึกษาปริญญาตรี', color: '#42b5e1' },
  { key: 'master',    label: 'นักศึกษาปริญญาโท',  color: '#8b5cf6' },
  { key: 'doctoral',  label: 'นักศึกษาปริญญาเอก', color: '#f43f5e' },
  { key: 'advisor',   label: 'อาจารย์',           color: '#10b981' },
  { key: 'staff',     label: 'เจ้าหน้าที่',        color: '#f7924a' },
  { key: 'executive', label: 'ผู้บริหาร',          color: '#0d9488' },
]

function StatCard({ label, value, color, sub, onClick }) {
  const palette = {
    blue:   { card: 'bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/60',         val: 'text-blue-800 dark:text-blue-200',     lbl: 'text-blue-700 dark:text-blue-300',     hint: 'text-blue-600 dark:text-blue-400'     },
    orange: { card: 'bg-orange-100 dark:bg-orange-900/40 border-orange-200 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-900/60', val: 'text-orange-800 dark:text-orange-200', lbl: 'text-orange-700 dark:text-orange-300', hint: 'text-orange-600 dark:text-orange-400' },
    red:    { card: 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/60',               val: 'text-red-800 dark:text-red-200',       lbl: 'text-red-700 dark:text-red-300',       hint: 'text-red-600 dark:text-red-400'       },
    slate:  { card: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900/60', val: 'text-emerald-800 dark:text-emerald-200', lbl: 'text-emerald-700 dark:text-emerald-300', hint: 'text-emerald-600 dark:text-emerald-400' },
  }
  const p = palette[color] || palette.slate
  return (
    <div
      className={`rounded-xl p-5 border transition-all duration-200 ${p.card} ${onClick ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <p className={`text-3xl font-bold mb-1 ${p.val}`}>{value ?? '0'}</p>
      <p className={`text-sm font-semibold ${p.lbl}`}>{label}</p>
      {sub && <p className={`text-xs mt-0.5 ${p.hint}`}>{sub}</p>}
      {onClick && <p className={`text-xs mt-1.5 font-medium ${p.hint} opacity-80`}>คลิกเพื่อดูทั้งหมด →</p>}
    </div>
  )
}

function DetailListModal({ title, subtitle, items, type, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-700 px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200">×</button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-4">
          {!items?.length ? (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700 py-12 text-center text-sm text-slate-400 dark:text-slate-400">ไม่มีข้อมูลในกลุ่มนี้</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700">
              {items.map(item => (
                <div key={`${type}-${item.doc_id || item.user_id}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center bg-white dark:bg-slate-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.doc_title || item.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {type === 'user'
                        ? [item.email, item.student_id, item.program, item.advisor_name && `อาจารย์: ${item.advisor_name}`].filter(Boolean).join(' • ')
                        : [item.owner_name, item.owner_student_id, item.owner_program, item.owner_affiliation].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    {type === 'user' ? (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{item.doc_count || 0} เอกสาร</span>
                    ) : (
                      <>
                        <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{item.doc_type}</span>
                        {item.days_remaining != null && (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.days_remaining < 0 ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'}`}>
                            {item.days_remaining < 0 ? `เกิน ${Math.abs(item.days_remaining)} วัน` : `อีก ${item.days_remaining} วัน`}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RecentDocumentModal({ doc, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-700 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#42b5e1]">รายละเอียดเอกสาร</p>
            <h2 className="mt-1 truncate text-base font-bold text-slate-900 dark:text-slate-100">{doc?.title || doc?.doc_title || 'กำลังโหลด...'}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200">×</button>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">กำลังโหลดรายละเอียด...</div>
        ) : (
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ['ประเภท', doc?.doc_type],
                ['เจ้าของ', doc?.owner_name],
                ['อีเมล', doc?.owner_email],
                ['หลักสูตร', doc?.owner_program],
                ['สังกัด', doc?.owner_affiliation],
                ['วันที่อัปโหลด', doc?.created_at ? new Date(doc.created_at).toLocaleDateString('th-TH') : '-'],
                ['วันที่ออก', doc?.issue_date ? new Date(doc.issue_date).toLocaleDateString('th-TH') : '-'],
                ['วันหมดอายุ', doc?.no_expire ? 'ไม่มีวันหมดอายุ' : (doc?.expire_date ? new Date(doc.expire_date).toLocaleDateString('th-TH') : '-')],
              ].filter(([, v]) => v != null && v !== '').map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-700 p-3">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-400">{label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{value || '-'}</p>
                </div>
              ))}
            </div>
            {doc?.description && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700 p-3">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-400">คำอธิบาย</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{doc.description}</p>
              </div>
            )}
            {doc?.files?.length > 0 && (() => {
              const currentFiles  = doc.files.filter(f => f.is_current === true || f.is_current === 1)
              const previousFiles = doc.files.filter(f => !(f.is_current === true || f.is_current === 1))
              return (
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-400 dark:text-slate-400">
                    ไฟล์แนบ · {currentFiles.length} ไฟล์ปัจจุบัน
                    {previousFiles.length > 0 && ` · ${previousFiles.length} เวอร์ชันก่อนหน้า`}
                  </p>
                  <div className="space-y-1.5">
                    {currentFiles.map(file => (
                      <div key={file.file_id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-600 bg-white dark:bg-slate-700/50 px-3 py-2">
                        <span className="text-sm text-slate-600 dark:text-slate-300 truncate min-w-0 flex-1">{file.file_name}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">ปัจจุบัน</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">v{file.version_no || 1}</span>
                        </div>
                      </div>
                    ))}
                    {previousFiles.length > 0 && (
                      <details className="rounded-xl border border-slate-100 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-700/40">
                        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          เวอร์ชันก่อนหน้า ({previousFiles.length})
                        </summary>
                        <div className="px-3 pb-2 space-y-1.5">
                          {previousFiles.map(file => (
                            <div key={file.file_id}
                              className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-600 bg-white/80 dark:bg-slate-700/50 px-3 py-2">
                              <span className="text-sm text-slate-500 dark:text-slate-400 truncate min-w-0 flex-1">{file.file_name}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0 ml-2">v{file.version_no || 1}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [detailModal, setDetailModal] = useState(null)
  const [recentDocModal, setRecentDocModal] = useState(null)
  const [recentDocLoading, setRecentDocLoading] = useState(false)

  useEffect(() => {
    adminService.getStats().then((s) => {
      setStats(s.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const docStats       = stats?.docStats       || {}
  const userBreakdown  = stats?.userBreakdown  || []
  const expiryTimeline = stats?.expiryTimeline || {}
  const recentActivity = stats?.recentActivity || []
  const alertDocs      = stats?.alertDocs      || []
  const docStatusDetails = stats?.docStatusDetails || []
  const expiryDetails = stats?.expiryDetails || []
  const userDetails = stats?.userDetails || []

  const openDocStatus = (statusKey, title) => {
    const items = statusKey === 'all'
      ? docStatusDetails
      : docStatusDetails.filter(d => d.status_group === statusKey)
    setDetailModal({ title, subtitle: `แสดง ${items.length} รายการ`, items, type: 'document' })
  }

  const openExpiryGroup = (groupKey, title) => {
    const items = expiryDetails.filter(d => d.timeline_group === groupKey)
    setDetailModal({ title, subtitle: `แสดง ${items.length} รายการ`, items, type: 'document' })
  }

  const openUserGroup = (groupKey, title) => {
    const items = userDetails.filter(u => u.grp === groupKey)
    setDetailModal({ title, subtitle: `แสดง ${items.length} ผู้ใช้งาน`, items, type: 'user' })
  }

  const openRecentDocs = () => {
    setDetailModal({
      title: 'เอกสารอัปโหลดล่าสุด',
      subtitle: `แสดง ${recentActivity.length} รายการล่าสุด`,
      items: recentActivity,
      type: 'document',
    })
  }

  const openRecentDocDetail = async (doc) => {
    setRecentDocModal(doc)
    setRecentDocLoading(true)
    try {
      const { data } = await documentService.getById(doc.doc_id)
      setRecentDocModal(data)
    } catch {
      setRecentDocModal(doc)
    } finally {
      setRecentDocLoading(false)
    }
  }

  const groupData = USER_GROUPS.map(g => {
    const found = userBreakdown.find(r => r.grp === g.key)
    return { ...g, user_count: found?.user_count ?? 0, doc_count: found?.doc_count ?? 0 }
  })

  const maxTimeline = Math.max(
    expiryTimeline.within_30 || 0,
    expiryTimeline.within_60 || 0,
    (expiryTimeline.within_warning ?? expiryTimeline.within_90) || 0,
    expiryTimeline.already_expired || 0,
    1,
  )

  const expiryRows = [
    { label: 'หมดอายุแล้ว',          key: 'already_expired', value: expiryTimeline.already_expired,
      card: 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60',
      bar: '#dc2626', lbl: 'text-red-800 dark:text-red-200', cnt: 'text-red-600 dark:text-red-300',
      track: 'bg-red-200 dark:bg-red-800/60' },
    { label: 'หมดอายุใน 30 วัน',     key: 'within_30',       value: expiryTimeline.within_30,
      card: 'bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-900/60',
      bar: '#ea580c', lbl: 'text-orange-800 dark:text-orange-200', cnt: 'text-orange-600 dark:text-orange-300',
      track: 'bg-orange-200 dark:bg-orange-800/60' },
    { label: 'หมดอายุใน 31-60 วัน',  key: 'within_60',       value: expiryTimeline.within_60,
      card: 'bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60',
      bar: '#d97706', lbl: 'text-amber-800 dark:text-amber-200', cnt: 'text-amber-600 dark:text-amber-300',
      track: 'bg-amber-200 dark:bg-amber-800/60' },
    { label: 'หมดอายุใน 61-90 วัน',  key: 'within_warning',  value: expiryTimeline.within_warning ?? expiryTimeline.within_90,
      card: 'bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60',
      bar: '#16a34a', lbl: 'text-emerald-800 dark:text-emerald-200', cnt: 'text-emerald-600 dark:text-emerald-300',
      track: 'bg-emerald-200 dark:bg-emerald-800/60' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>Admin</p>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
      </div>

      {/* ── Row 1: Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="เอกสารทั้งหมด" value={docStats.total}
          color="blue" onClick={() => openDocStatus('all', 'เอกสารทั้งหมด')}
        />
        <StatCard
          label="ใกล้หมดอายุ" value={docStats.expiring_soon}
          color="orange" onClick={() => openDocStatus('expiring_soon', 'เอกสารใกล้หมดอายุ')}
        />
        <StatCard
          label="หมดอายุแล้ว" value={docStats.expired}
          color="red" onClick={() => openDocStatus('expired', 'เอกสารหมดอายุแล้ว')}
        />
        <StatCard
          label="ปกติ" value={docStats.active}
          color="slate"
          sub={`จากทั้งหมด ${docStats.total ?? 0} ฉบับ`}
          onClick={() => openDocStatus('active', 'เอกสารสถานะปกติ')}
        />
      </div>

      {/* ── Row 2: User Breakdown ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">ผู้ใช้งานในระบบ</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {groupData.map(g => (
            <div key={g.key}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openUserGroup(g.key, g.label)}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{g.label}</p>
              </div>
              <p className="text-2xl font-bold mb-0.5" style={{ color: g.color }}>{g.user_count}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{g.doc_count} เอกสาร</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 3: Recent Docs ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">เอกสารอัปโหลดล่าสุด</h2>
            <button type="button" onClick={openRecentDocs} className="text-xs font-medium" style={{ color: '#42b5e1' }}>
              ดูทั้งหมด →
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">กำลังโหลดข้อมูล...</div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-300 dark:text-slate-600 text-3xl mb-2">○</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm">ยังไม่มีเอกสารในระบบ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '480px' }}>
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    {['ชื่อเอกสาร', 'ประเภท', 'เจ้าของ', 'วันที่อัปโหลด', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {recentActivity.map(doc => (
                    <tr key={doc.doc_id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                      onClick={() => openRecentDocDetail(doc)}>
                      <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-200 max-w-[180px] truncate">
                        {doc.doc_title}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300">
                          {doc.doc_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 max-w-[120px] truncate">
                        {doc.owner_name}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">
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
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">เอกสารตามระยะหมดอายุ</h2>
          {loading ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">กำลังโหลด...</div>
          ) : (
            <div className="space-y-3">
              {expiryRows.map(item => (
                <div key={item.label}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${item.card}`}
                  onClick={() => openExpiryGroup(item.key, item.label)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className={`text-xs font-semibold ${item.lbl}`}>{item.label}</p>
                      <p className={`text-sm font-bold tabular-nums ${item.cnt}`}>
                        {item.value ?? 0} ฉบับ
                      </p>
                    </div>
                    <div className={`h-1.5 ${item.track} rounded-full overflow-hidden`}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${((item.value ?? 0) / maxTimeline) * 100}%`,
                          backgroundColor: item.bar,
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
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">การแจ้งเตือนเอกสาร</h2>
            {alertDocs.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: '#f7924a' }}>
                {alertDocs.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">กำลังโหลด...</div>
          ) : alertDocs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-300 dark:text-slate-600 text-3xl mb-2">○</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs">ไม่มีเอกสารที่ต้องแจ้งเตือน</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {alertDocs.map(doc => {
                const expired = doc.days_remaining < 0
                return (
                  <div key={doc.doc_id}
                    className={`p-3 rounded-lg border text-xs cursor-pointer hover:shadow-sm transition-shadow ${
                      expired
                        ? 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-700'
                        : 'bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700'
                    }`}
                    onClick={() => openRecentDocDetail(doc)}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-semibold truncate ${expired ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`}>
                        {doc.doc_title}
                      </p>
                      <span className={`flex-shrink-0 text-xs font-bold ${expired ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {expired
                          ? `เกิน ${Math.abs(doc.days_remaining)} วัน`
                          : `อีก ${doc.days_remaining} วัน`}
                      </span>
                    </div>
                    <p className={`mt-0.5 ${expired ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {doc.owner_name} · {doc.doc_type}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {detailModal && (
        <DetailListModal
          {...detailModal}
          onClose={() => setDetailModal(null)}
        />
      )}

      {recentDocModal && (
        <RecentDocumentModal
          doc={recentDocModal}
          loading={recentDocLoading}
          onClose={() => setRecentDocModal(null)}
        />
      )}

    </div>
  )
}

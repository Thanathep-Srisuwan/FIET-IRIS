import { useEffect, useState } from 'react'
import { settingsService } from '../../services/api'
import toast from 'react-hot-toast'

const LABELS = {
  system_name:          { label: 'ชื่อย่อระบบ',                    type: 'text',   placeholder: 'FIET-IRIS' },
  system_full_name:     { label: 'ชื่อเต็มระบบ',                   type: 'text',   placeholder: 'Integrity Research Information System' },
  org_name:             { label: 'ชื่อองค์กร/คณะ',                 type: 'text',   placeholder: 'คณะ FIET มจธ.' },
  expiry_warning_days:  { label: 'แจ้งเตือนก่อนหมดอายุ (วัน)',     type: 'number', placeholder: '90', min: 7, max: 365 },
  trash_retention_days: { label: 'เก็บในถังขยะก่อนลบถาวร (วัน)',   type: 'number', placeholder: '30', min: 1, max: 180 },
}

const GROUPS = {
  'ข้อมูลระบบ':           ['system_name', 'system_full_name', 'org_name'],
  'ตั้งค่าอัตโนมัติ':    ['expiry_warning_days', 'trash_retention_days'],
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({})
  const [draft,    setDraft]    = useState({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [dirty,    setDirty]    = useState(false)

  useEffect(() => {
    settingsService.getAll()
      .then(r => {
        const map = {}
        r.data.forEach(s => { map[s.setting_key] = s.setting_value })
        setSettings(map)
        setDraft(map)
      })
      .catch(() => toast.error('โหลดการตั้งค่าไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = Object.entries(draft)
        .filter(([key, value]) => settings[key] !== value)
        .map(([key, value]) => ({ key, value }))

      if (!payload.length) { toast('ไม่มีการเปลี่ยนแปลง'); setSaving(false); return }

      await settingsService.bulkUpdate(payload)
      setSettings({ ...draft })
      setDirty(false)
      toast.success('บันทึกการตั้งค่าเรียบร้อย')
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setDraft({ ...settings })
    setDirty(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400 text-sm">กำลังโหลด...</p>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>ผู้ดูแลระบบ</p>
          <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h1>
          <p className="text-slate-400 text-sm mt-0.5">ปรับแต่งการทำงานของระบบโดยไม่ต้องแก้ไขโค้ด</p>
        </div>
        {dirty && (
          <div className="flex gap-2">
            <button onClick={handleReset}
              className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              ยกเลิก
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-sm rounded-xl text-white font-semibold transition-colors disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#42b5e1,#1262a0)' }}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        )}
      </div>

      {/* Setting Groups */}
      {Object.entries(GROUPS).map(([groupName, keys]) => (
        <div key={groupName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">{groupName}</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {keys.map(key => {
              const meta  = LABELS[key]
              if (!meta) return null
              const value = draft[key] ?? ''
              return (
                <div key={key} className="px-6 py-4 flex items-center gap-6">
                  <div className="w-52 flex-shrink-0">
                    <p className="text-sm font-medium text-slate-700">{meta.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{key}</p>
                  </div>
                  <div className="flex-1">
                    <input
                      type={meta.type}
                      value={value}
                      min={meta.min}
                      max={meta.max}
                      placeholder={meta.placeholder}
                      onChange={e => handleChange(key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': '#42b5e1' }}
                      onFocus={e => e.target.style.boxShadow = '0 0 0 2px #42b5e140'}
                      onBlur={e => e.target.style.boxShadow = ''}
                    />
                    {settings[key] !== value && (
                      <p className="text-xs text-amber-600 mt-1">
                        ค่าเดิม: <span className="font-mono">{settings[key]}</span>
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Info box */}
      <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <p className="font-semibold text-blue-800 mb-1">หมายเหตุ</p>
        <ul className="text-blue-700 space-y-1 text-xs">
          <li>• ค่า <strong>expiry_warning_days</strong> มีผลกับ Scheduler และ View ใน Database ทันที</li>
          <li>• ค่า <strong>trash_retention_days</strong> จะใช้รอบถัดไปที่ Scheduler ทำงาน (08:00 น.)</li>
          <li>• ชื่อระบบและองค์กรจะแสดงในอีเมลแจ้งเตือนอัตโนมัติ</li>
        </ul>
      </div>

      {/* Save button bottom */}
      {dirty && (
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={handleReset}
            className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 text-sm rounded-xl text-white font-semibold transition-colors disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#42b5e1,#1262a0)' }}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </button>
        </div>
      )}
    </div>
  )
}

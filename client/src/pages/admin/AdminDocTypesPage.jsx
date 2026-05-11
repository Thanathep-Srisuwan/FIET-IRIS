import { useEffect, useMemo, useState } from 'react'
import { docTypeService } from '../../services/api'
import toast from 'react-hot-toast'
import { FileText, Search } from 'lucide-react'

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function DocTypeBadge({ code }) {
  return (
    <span className="inline-flex min-w-12 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30 px-2.5 py-1 text-xs font-bold text-primary-800 dark:text-primary-200 border border-primary-100 dark:border-primary-800">
      {code}
    </span>
  )
}

function EmptyState({ hasQuery }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto mb-4 flex items-center justify-center text-slate-400">
        <FileText size={32} />
      </div>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{hasQuery ? 'ไม่พบประเภทเอกสารที่ค้นหา' : 'ยังไม่มีประเภทเอกสาร'}</p>
      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">เพิ่มประเภทใหม่เพื่อให้ผู้ใช้เลือกตอนอัปโหลดเอกสาร</p>
    </div>
  )
}

function DeleteButton({ type, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setLoading(true)
    try {
      await onDelete(type)
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
        confirming
          ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900'
          : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-red-600 hover:border-red-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:text-red-300 dark:hover:border-red-900'
      }`}
    >
      {loading ? '...' : confirming ? 'ยืนยันลบ?' : 'ลบ'}
    </button>
  )
}

export default function AdminDocTypesPage() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ type_code: '', type_name: '', sort_order: '' })

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data } = await docTypeService.getAll()
      setTypes(data || [])
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const nextSortOrder = useMemo(() => {
    const max = types.reduce((highest, item) => Math.max(highest, Number(item.sort_order) || 0), 0)
    return max + 1
  }, [types])

  const filteredTypes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return types
    return types.filter(type =>
      `${type.type_code || ''} ${type.type_name || ''}`.toLowerCase().includes(q)
    )
  }, [query, types])

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    const code = form.type_code.trim().toUpperCase()
    const name = form.type_name.trim()

    if (!code || !name) {
      toast.error('กรุณากรอกรหัสและชื่อประเภท')
      return
    }

    if (!/^[A-Z0-9_-]+$/.test(code)) {
      toast.error('รหัสประเภทใช้ได้เฉพาะ A-Z, 0-9, _ และ -')
      return
    }

    setSaving(true)
    try {
      await docTypeService.create({
        type_code: code,
        type_name: name,
        sort_order: Number.parseInt(form.sort_order, 10) || nextSortOrder,
      })
      toast.success('เพิ่มประเภทเอกสารสำเร็จ')
      setForm({ type_code: '', type_name: '', sort_order: '' })
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (type) => {
    try {
      await docTypeService.remove(type.type_id)
      toast.success('ลบประเภทสำเร็จ')
      setTypes(prev => prev.filter(item => item.type_id !== type.type_id))
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    }
  }

  return (
    <div className="max-w-7xl space-y-6">
      <header className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">จัดการประเภทเอกสาร</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            ประเภทเอกสารจะถูกใช้ในฟอร์มอัปโหลด, ตัวกรองเอกสาร, dashboard และรายงานผู้บริหาร
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 min-w-full sm:min-w-[360px] xl:min-w-[420px]">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">ประเภททั้งหมด</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{types.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">ลำดับถัดไป</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{nextSortOrder}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
        <aside className="space-y-4">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">เพิ่มประเภทใหม่</h2>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">รหัสประเภท</label>
                <span className="text-[11px] text-slate-400">{form.type_code.length}/20</span>
              </div>
              <input
                type="text"
                value={form.type_code}
                onChange={event => updateForm('type_code', event.target.value.toUpperCase())}
                placeholder="เช่น RI, IRB, EC"
                maxLength={20}
                className="input-field font-mono uppercase"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">ใช้ได้เฉพาะ A-Z, 0-9, _ และ -</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">ชื่อเต็ม / คำอธิบาย</label>
              <input
                type="text"
                value={form.type_name}
                onChange={event => updateForm('type_name', event.target.value)}
                placeholder="เช่น RI - Research Integrity"
                className="input-field mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">ลำดับการแสดงผล</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={event => updateForm('sort_order', event.target.value)}
                placeholder={String(nextSortOrder)}
                min="0"
                className="input-field mt-1.5"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">ลำดับตัวเลขที่น้อยจะแสดงก่อน ถ้าเว้นว่างจะใช้ลำดับถัดไป</p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs font-semibold text-slate-400 mb-2">ตัวอย่างที่จะแสดง</p>
              <div className="flex items-center gap-3">
                <DocTypeBadge code={form.type_code.trim().toUpperCase() || 'CODE'} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{form.type_name.trim() || 'ชื่อประเภทเอกสาร'}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">ลำดับ {form.sort_order || nextSortOrder}</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-700 hover:bg-primary-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'เพิ่มประเภท'}
            </button>
          </form>

          <section className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-4">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">ข้อควรระวัง</p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-2 leading-relaxed">
              ไม่สามารถลบประเภทที่มีเอกสารใช้งานอยู่ได้ ระบบจะป้องกันการลบเพื่อไม่ให้ข้อมูลเอกสารเสียความสัมพันธ์
            </p>
          </section>
        </aside>

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">ประเภทเอกสารในระบบ</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">แสดง {filteredTypes.length} จาก {types.length} ประเภท</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="ค้นหารหัสหรือชื่อประเภท..."
                className="input-field pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">กำลังโหลด...</div>
          ) : filteredTypes.length === 0 ? (
            <EmptyState hasQuery={Boolean(query.trim())} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '680px' }}>
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    {['รหัส', 'ชื่อเต็ม', 'ลำดับ', 'วันที่เพิ่ม', ''].map(header => (
                      <th key={header} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTypes.map(type => (
                    <tr key={type.type_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-4">
                        <DocTypeBadge code={type.type_code} />
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{type.type_name}</p>
                        {/* <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">ใช้ค่า doc_type: {type.type_code}</p> */}
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 tabular-nums">{type.sort_order}</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">{formatDate(type.created_at)}</td>
                      <td className="px-5 py-4 text-right">
                        <DeleteButton type={type} onDelete={handleDelete} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { docTypeService } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminDocTypesPage() {
  const [types, setTypes]     = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm]       = useState({ type_code: '', type_name: '', sort_order: '' })
  const [saving, setSaving]   = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data } = await docTypeService.getAll()
      setTypes(data || [])
    } catch { toast.error('โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.type_code.trim() || !form.type_name.trim()) {
      toast.error('กรุณากรอกรหัสและชื่อประเภท')
      return
    }
    setSaving(true)
    try {
      await docTypeService.create({
        type_code:  form.type_code.trim().toUpperCase(),
        type_name:  form.type_name.trim(),
        sort_order: parseInt(form.sort_order) || 0,
      })
      toast.success('เพิ่มประเภทเอกสารสำเร็จ')
      setForm({ type_code: '', type_name: '', sort_order: '' })
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id, code) => {
    if (!confirm(`ลบประเภท "${code}" ? จะไม่สามารถลบได้หากมีเอกสารใช้ประเภทนี้อยู่`)) return
    try {
      await docTypeService.remove(id)
      toast.success('ลบประเภทสำเร็จ')
      setTypes(prev => prev.filter(t => t.type_id !== id))
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      <div>
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>Admin</p>
        <h1 className="text-2xl font-bold text-slate-800">จัดการประเภทเอกสาร</h1>
        <p className="text-slate-400 text-sm mt-0.5">เพิ่มหรือลบประเภทเอกสารที่ใช้ในระบบ</p>
      </div>

      {/* ฟอร์มเพิ่มประเภท */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">เพิ่มประเภทใหม่</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">รหัสประเภท <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.type_code}
              onChange={e => setForm(p => ({ ...p, type_code: e.target.value }))}
              placeholder="เช่น EC, IRB2"
              maxLength={20}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300 uppercase"
            />
            <p className="text-xs text-slate-400 mt-1">จะถูกแปลงเป็นตัวพิมพ์ใหญ่อัตโนมัติ</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ลำดับการแสดงผล</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อเต็ม / คำอธิบาย <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.type_name}
            onChange={e => setForm(p => ({ ...p, type_name: e.target.value }))}
            placeholder="เช่น EC - Ethics Committee"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#42b5e1' }}
          >
            {saving ? 'กำลังบันทึก...' : '+ เพิ่มประเภท'}
          </button>
        </div>
      </form>

      {/* ตารางประเภทที่มีอยู่ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">ประเภทเอกสารในระบบ</h2>
          <span className="text-xs text-slate-400">{types.length} ประเภท</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">กำลังโหลด...</div>
        ) : types.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-300 text-3xl mb-2">○</p>
            <p className="text-slate-400 text-sm">ยังไม่มีประเภทเอกสาร</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['รหัส', 'ชื่อเต็ม', 'ลำดับ', 'วันที่เพิ่ม', ''].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {types.map(t => (
                <tr key={t.type_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded"
                      style={{ backgroundColor: '#e0f4fb', color: '#0d2d3e' }}>
                      {t.type_code}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-700">{t.type_name}</td>
                  <td className="px-6 py-3.5 text-slate-400 text-xs tabular-nums">{t.sort_order}</td>
                  <td className="px-6 py-3.5 text-slate-400 text-xs tabular-nums">
                    {new Date(t.created_at).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(t.type_id, t.type_code)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl p-4 text-xs border"
        style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#92400e' }}>
        หมายเหตุ: ไม่สามารถลบประเภทที่มีเอกสารใช้งานอยู่ได้ ต้องลบหรือย้ายเอกสารก่อน
      </div>

    </div>
  )
}

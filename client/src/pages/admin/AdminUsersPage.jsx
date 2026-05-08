import { useEffect, useState, useCallback } from 'react'
import { userService } from '../../services/api'
import toast from 'react-hot-toast'

const roleLabel = {
  student:   'นักศึกษา',
  advisor:   'อาจารย์',
  staff:     'เจ้าหน้าที่',
  admin:     'ผู้ดูแลระบบ',
}
const roleColor = {
  student: 'bg-blue-50 text-blue-700 border border-blue-200',
  advisor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  staff:   'bg-orange-50 text-orange-700 border border-orange-200',
  admin:   'bg-purple-50 text-purple-700 border border-purple-200',
}
const degreeLabel = { bachelor: 'ป.ตรี', master: 'ป.โท', doctoral: 'ป.เอก' }
const degreeColor = {
  bachelor: 'bg-sky-50 text-sky-700 border border-sky-200',
  master:   'bg-violet-50 text-violet-700 border border-violet-200',
  doctoral: 'bg-rose-50 text-rose-700 border border-rose-200',
}

// ─── Modal: เพิ่ม/แก้ไข User ───────────────────────────────────────────────
function UserModal({ user, advisors, onClose, onSaved }) {
  const isEdit = !!user?.user_id
  const [form, setForm] = useState({
    name:         user?.name         || '',
    email:        user?.email        || '',
    role:         user?.role         || 'student',
    advisor_id:   user?.advisor_id   || '',
    department:   user?.department   || '',
    student_id:   user?.student_id   || '',
    degree_level: user?.degree_level || 'bachelor',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEdit) {
        await userService.update(user.user_id, form)
        toast.success('แก้ไขข้อมูลสำเร็จ')
      } else {
        await userService.create(form)
        toast.success('สร้างบัญชีสำเร็จ ส่งอีเมลแล้ว')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            {isEdit ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ชื่อ-นามสกุล</label>
            <input className="input-field" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="กรอกชื่อ-นามสกุล" required />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">อีเมล (@kmutt.ac.th)</label>
              <input className="input-field" type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="username@kmutt.ac.th" required />
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Role</label>
            <select className="input-field" value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value, advisor_id: '', degree_level: e.target.value === 'student' ? 'bachelor' : '' }))}>
              <option value="student">นักศึกษา</option>
              <option value="advisor">อาจารย์</option>
              <option value="staff">เจ้าหน้าที่</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </div>

          {/* ระดับการศึกษา — เฉพาะนักศึกษา */}
          {form.role === 'student' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ระดับการศึกษา</label>
              <select className="input-field" value={form.degree_level}
                onChange={e => setForm(p => ({ ...p, degree_level: e.target.value }))}>
                <option value="bachelor">ปริญญาตรี (ป.ตรี)</option>
                <option value="master">ปริญญาโท (ป.โท)</option>
                <option value="doctoral">ปริญญาเอก (ป.เอก)</option>
              </select>
            </div>
          )}

          {/* รหัสนักศึกษา — เฉพาะนักศึกษา */}
          {form.role === 'student' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">รหัสนักศึกษา</label>
              <input className="input-field font-mono" value={form.student_id}
                onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}
                placeholder="เช่น 65010500XXX" />
            </div>
          )}

          {/* อาจารย์ที่ปรึกษา — เฉพาะนักศึกษา */}
          {form.role === 'student' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">อาจารย์ที่ปรึกษา</label>
              <select className="input-field" value={form.advisor_id}
                onChange={e => setForm(p => ({ ...p, advisor_id: e.target.value }))} required>
                <option value="">-- เลือกอาจารย์ --</option>
                {advisors.map(a => (
                  <option key={a.user_id} value={a.user_id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">สาขาวิชา</label>
            <select className="input-field" value={form.department}
              onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
              <option value="">-- เลือกสาขาวิชา --</option>
              <option value="สำนักงานคณบดี">สำนักงานคณบดี</option>
              <option value="ครุศาสตร์เครื่องกล">ครุศาสตร์เครื่องกล</option>
              <option value="ครุศาสตร์โยธา">ครุศาสตร์โยธา</option>
              <option value="ครุศาสตร์ไฟฟ้า">ครุศาสตร์ไฟฟ้า</option>
              <option value="ครุศาสตร์อุตสาหการ">ครุศาสตร์อุตสาหการ</option>
              <option value="เทคโนโลยีและสื่อสารการศึกษา">เทคโนโลยีและสื่อสารการศึกษา</option>
              <option value="เทคโนโลยีการพิมพ์และบรรจุภัณฑ์">เทคโนโลยีการพิมพ์และบรรจุภัณฑ์</option>
              <option value="คอมพิวเตอร์และเทคโนโลยีสารสนเทศ">คอมพิวเตอร์และเทคโนโลยีสารสนเทศ</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">ยกเลิก</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: '#42b5e1' }}>
              {loading ? 'กำลังบันทึก...' : isEdit ? 'บันทึก' : 'สร้างบัญชี'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Import Excel ────────────────────────────────────────────────────
function ImportModal({ advisors, onClose, onSaved }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState([])

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const lines = text.trim().split('\n').slice(1)
      const parsed = lines.map(line => {
        const [name, email, role, advisor_email, department, degree_level] = line.split(',').map(s => s.trim().replace(/"/g, ''))
        return { name, email, role, advisor_email, department, degree_level }
      }).filter(r => r.name && r.email)
      setRows(parsed)
      setErrors([])
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const usersToImport = rows.map(r => ({
        name:         r.name,
        email:        r.email,
        role:         r.role || 'student',
        department:   r.department,
        degree_level: r.degree_level || (r.role === 'student' ? 'bachelor' : null),
        advisor_id:   advisors.find(a => a.email === r.advisor_email)?.user_id || null,
      }))
      const { data } = await userService.importExcel({ users: usersToImport })
      toast.success(data.message)
      if (data.errors?.length > 0) setErrors(data.errors)
      else { onSaved(); onClose() }
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally { setLoading(false) }
  }

  const downloadTemplate = () => {
    const csv = 'name,email,role,advisor_email,department,degree_level\nชื่อตัวอย่าง,student@kmutt.ac.th,student,advisor@kmutt.ac.th,ครุศาสตร์เครื่องกล,bachelor\nอาจารย์ตัวอย่าง,advisor@kmutt.ac.th,advisor,,ครุศาสตร์เครื่องกล,\nเจ้าหน้าที่ตัวอย่าง,staff@kmutt.ac.th,staff,,สำนักงานคณบดี,'
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = 'FIET-IRIS_user_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">นำเข้าผู้ใช้จาก Excel/CSV</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <button onClick={downloadTemplate}
            className="w-full py-2 rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 hover:border-fiet-blue hover:text-fiet-blue transition-all">
            ⬇ ดาวน์โหลด Template CSV (รองรับ degree_level)
          </button>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">อัปโหลดไฟล์ CSV</label>
            <input type="file" accept=".csv" onChange={handleFile}
              className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200" />
          </div>

          {rows.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                พบ {rows.length} รายการ
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-50">
                {rows.map((r, i) => (
                  <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-700">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor[r.role] || roleColor.student}`}>
                        {roleLabel[r.role] || r.role}
                      </span>
                      {r.role === 'student' && r.degree_level && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${degreeColor[r.degree_level] || degreeColor.bachelor}`}>
                          {degreeLabel[r.degree_level] || r.degree_level}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">พบข้อผิดพลาด {errors.length} รายการ</p>
              <ul className="text-xs text-red-600 space-y-0.5">
                {errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">ยกเลิก</button>
            <button onClick={handleImport} disabled={rows.length === 0 || loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: '#42b5e1' }}>
              {loading ? 'กำลังนำเข้า...' : `นำเข้า ${rows.length} รายการ`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers]           = useState([])
  const [advisors, setAdvisors]     = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [modal, setModal]           = useState(null)
  const [selected, setSelected]     = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await userService.getAll({ search, role: roleFilter })
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch { toast.error('โหลดข้อมูลล้มเหลว') }
    finally { setLoading(false) }
  }, [search, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => {
    userService.getAll({ role: 'advisor' })
      .then(r => setAdvisors(r.data?.users || []))
      .catch(() => {})
  }, [])

  const handleToggle = async (user) => {
    try {
      const { data } = await userService.toggle(user.user_id)
      toast.success(data.message)
      fetchUsers()
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  const handleReset = async (user) => {
    if (!confirm(`รีเซ็ตรหัสผ่านของ ${user.name}?`)) return
    try {
      const { data } = await userService.resetPassword(user.user_id)
      toast.success(data.message)
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  const exportCSV = () => {
    const header = 'ชื่อ,อีเมล,Role,ระดับการศึกษา,สาขาวิชา,สถานะ,วันที่สร้าง'
    const rows = users.map(u =>
      `"${u.name}","${u.email}","${roleLabel[u.role] || u.role}","${degreeLabel[u.degree_level] || ''}","${u.department || ''}","${u.is_active ? 'ใช้งาน' : 'ระงับ'}","${new Date(u.created_at).toLocaleDateString('th-TH')}"`
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = 'FIET-IRIS_users.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>ผู้ดูแลระบบ</p>
          <h1 className="text-2xl font-bold text-slate-800">จัดการผู้ใช้งาน</h1>
          <p className="text-slate-400 text-sm mt-0.5">ทั้งหมด {total} บัญชี</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCSV}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-all">
            ⬇ Export
          </button>
          <button onClick={() => setModal('import')}
            className="px-3 py-2 rounded-lg border text-sm font-medium transition-all"
            style={{ borderColor: '#42b5e1', color: '#42b5e1' }}>
            Import Excel
          </button>
          <button onClick={() => { setSelected(null); setModal('add') }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
            style={{ backgroundColor: '#42b5e1' }}>
            + เพิ่มผู้ใช้
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input className="input-field w-full sm:max-w-xs"
          placeholder="ค้นหาชื่อ อีเมล หรือรหัสนักศึกษา..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field w-full sm:max-w-[160px]" value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}>
          <option value="">ทุก Role</option>
          <option value="student">นักศึกษา</option>
          <option value="advisor">อาจารย์</option>
          <option value="staff">เจ้าหน้าที่</option>
          <option value="admin">ผู้ดูแลระบบ</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '960px' }}>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['รหัสนักศึกษา', 'ชื่อ-นามสกุล', 'อีเมล', 'Role', 'ระดับ', 'อาจารย์ที่ปรึกษา', 'สาขาวิชา', 'เอกสาร', 'สถานะ', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-16 text-slate-400 text-sm">กำลังโหลด...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-16 text-slate-400 text-sm">ไม่พบข้อมูล</td></tr>
              ) : users.map(u => (
                <tr key={u.user_id} className={`hover:bg-slate-50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono whitespace-nowrap">{u.student_id || '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleColor[u.role] || 'bg-slate-100 text-slate-500'}`}>
                      {roleLabel[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.degree_level ? (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${degreeColor[u.degree_level] || 'bg-slate-100 text-slate-500'}`}>
                        {degreeLabel[u.degree_level] || u.degree_level}
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{u.advisor_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[120px] truncate">{u.department || '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-600 text-xs tabular-nums">{u.doc_count}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      u.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {u.is_active ? 'ใช้งาน' : 'ระงับ'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <button onClick={() => { setSelected(u); setModal('edit') }}
                        className="text-xs text-slate-500 hover:text-fiet-blue transition-colors font-medium">
                        แก้ไข
                      </button>
                      <span className="text-slate-200">|</span>
                      <button onClick={() => handleToggle(u)}
                        className={`text-xs font-medium transition-colors ${
                          u.is_active ? 'text-slate-500 hover:text-red-500' : 'text-slate-500 hover:text-emerald-600'
                        }`}>
                        {u.is_active ? 'ระงับ' : 'เปิด'}
                      </button>
                      <span className="text-slate-200">|</span>
                      <button onClick={() => handleReset(u)}
                        className="text-xs text-slate-500 hover:text-amber-600 transition-colors font-medium">
                        รีเซ็ต
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <UserModal
          user={modal === 'edit' ? selected : null}
          advisors={advisors}
          onClose={() => setModal(null)}
          onSaved={fetchUsers}
        />
      )}
      {modal === 'import' && (
        <ImportModal
          advisors={advisors}
          onClose={() => setModal(null)}
          onSaved={fetchUsers}
        />
      )}
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { userService } from '../../services/api'
import toast from 'react-hot-toast'
import useDebouncedValue from '../../hooks/useDebouncedValue'

const LIMIT = 20

const DEPARTMENTS_BY_DEGREE = {
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
const ALL_DEPARTMENTS = ['สำนักงานคณบดี', ...Object.values(DEPARTMENTS_BY_DEGREE).flat()]

// columns: key = backend sort key, null = not sortable
const COLUMNS = [
  { key: 'student_id',   label: 'รหัสนักศึกษา',    sort: true  },
  { key: 'name',         label: 'ชื่อ-นามสกุล',    sort: true  },
  { key: 'email',        label: 'อีเมล',             sort: true  },
  { key: 'role',         label: 'Role',              sort: true  },
  { key: 'degree_level', label: 'ระดับ',             sort: true  },
  { key: null,           label: 'อาจารย์ที่ปรึกษา',  sort: false },
  { key: 'department',   label: 'สาขาวิชา',          sort: true  },
  { key: 'doc_count',    label: 'เอกสาร',            sort: true  },
  { key: null,           label: '',                   sort: false },
]

const roleLabel = {
  student:   'นักศึกษา',
  advisor:   'อาจารย์',
  staff:     'เจ้าหน้าที่',
  admin:     'ผู้ดูแลระบบ',
  executive: 'ผู้บริหาร',
}
const roleColor = {
  student:   'bg-blue-50 text-blue-700 border border-blue-200',
  advisor:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  staff:     'bg-orange-50 text-orange-700 border border-orange-200',
  admin:     'bg-purple-50 text-purple-700 border border-purple-200',
  executive: 'bg-teal-50 text-teal-700 border border-teal-200',
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
  const isStudent = form.role === 'student'
  const deptOptions = isStudent ? (DEPARTMENTS_BY_DEGREE[form.degree_level] || []) : ALL_DEPARTMENTS

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let savedUser = null
      if (isEdit) {
        const { data } = await userService.update(user.user_id, form)
        savedUser = data?.user || { ...user, ...form }
        toast.success('แก้ไขข้อมูลสำเร็จ')
      } else {
        await userService.create(form)
        toast.success('สร้างบัญชีสำเร็จ ส่งอีเมลแล้ว')
      }
      onSaved(savedUser)
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

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Role</label>
            <select className="input-field" value={form.role}
              onChange={e => setForm(p => ({
                ...p,
                role:         e.target.value,
                advisor_id:   '',
                degree_level: e.target.value === 'student' ? 'bachelor' : '',
                student_id:   e.target.value === 'student' ? p.student_id : '',
              }))}>
              <option value="student">นักศึกษา</option>
              <option value="advisor">อาจารย์</option>
              <option value="staff">เจ้าหน้าที่</option>
              <option value="executive">ผู้บริหาร</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </div>

          {isStudent && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ระดับการศึกษา</label>
              <select className="input-field" value={form.degree_level}
                onChange={e => setForm(p => ({ ...p, degree_level: e.target.value, department: '' }))}>
                <option value="bachelor">ปริญญาตรี (ป.ตรี)</option>
                <option value="master">ปริญญาโท (ป.โท)</option>
                <option value="doctoral">ปริญญาเอก (ป.เอก)</option>
              </select>
            </div>
          )}

          {isStudent && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">รหัสนักศึกษา</label>
              <input className="input-field font-mono" value={form.student_id}
                onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}
                placeholder="เช่น 66080502xxx" />
            </div>
          )}

          {isStudent && (
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
              {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
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

// ─── Modal: Import CSV ──────────────────────────────────────────────────────
function ImportModal({ advisors, onClose, onSaved }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState([])

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const XLSX = await import('xlsx')
      const data = new Uint8Array(ev.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      if (allRows.length < 2) { setRows([]); return }
      const firstDataIndex = allRows.findIndex((cols, idx) => idx > 0 && String(cols?.[1] || '').includes('@'))
      const parsed = allRows.slice(firstDataIndex >= 0 ? firstDataIndex : 1).map(cols => {
        const [name, email, role, student_id, advisor_email, department, degree_level] = cols
        return {
          name:          String(name          || '').trim(),
          email:         String(email         || '').trim(),
          role:          String(role          || '').trim(),
          student_id:    String(student_id    || '').trim(),
          advisor_email: String(advisor_email || '').trim(),
          department:    String(department    || '').trim(),
          degree_level:  String(degree_level  || '').trim(),
        }
      }).filter(r => r.name && r.email)
      setRows(parsed)
      setErrors([])
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const usersToImport = rows.map(r => ({
        name:         r.name,
        email:        r.email,
        role:         r.role || 'student',
        department:   r.department || null,
        student_id:   r.student_id || null,
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

  const downloadTemplate = async () => {
    const { default: ExcelJS } = await import('exceljs')
    const workbook  = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('ผู้ใช้งาน')
    worksheet.columns = [
      { width: 25 }, { width: 30 }, { width: 15 }, { width: 18 },
      { width: 30 }, { width: 30 }, { width: 18 },
    ]
    worksheet.mergeCells('A1:G1')
    worksheet.getCell('A1').value = 'FIET-IRIS'
    worksheet.getCell('A1').font = { name: 'TH Sarabun New', bold: true, size: 14 }
    worksheet.getCell('A1').alignment = { horizontal: 'right', vertical: 'middle' }
    worksheet.mergeCells('A2:G2')
    worksheet.getCell('A2').value = 'แบบฟอร์มนำเข้าผู้ใช้งาน'
    worksheet.getCell('A2').font = { name: 'TH Sarabun New', bold: true, size: 14 }
    worksheet.getCell('A2').alignment = { horizontal: 'right', vertical: 'middle' }
    worksheet.mergeCells('A3:G3')
    worksheet.getCell('A3').value = `วันที่พิมพ์ : ${new Date().toLocaleDateString('th-TH')}`
    worksheet.getCell('A3').font = { name: 'TH Sarabun New', bold: true, size: 14 }
    worksheet.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' }
    worksheet.addRow([])
    const headerRow = worksheet.addRow([
      'ชื่อ-นามสกุล', 'อีเมล', 'บทบาท', 'รหัสนักศึกษา',
      'อีเมลอาจารย์ที่ปรึกษา', 'สาขาวิชา', 'ระดับการศึกษา',
    ])
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42B5E1' } }
      cell.font = { name: 'TH Sarabun New', bold: true, color: { argb: 'FFFFFFFF' }, size: 14 }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
    const examples = [
      ['ชื่อนักศึกษาตัวอย่าง', 'student@kmutt.ac.th', 'student', '66080502xxx', 'advisor@kmutt.ac.th', 'ครุศาสตร์ไฟฟ้า', 'bachelor'],
      ['อาจารย์ตัวอย่าง',      'advisor@kmutt.ac.th', 'advisor', '',             '',                    'ครุศาสตร์ไฟฟ้า', ''],
      ['เจ้าหน้าที่ตัวอย่าง',  'staff@kmutt.ac.th',   'staff',   '',             '',                    'สำนักงานคณบดี',  ''],
    ]
    examples.forEach(ex => {
      const row = worksheet.addRow(ex)
      row.eachCell({ includeEmpty: true }, cell => {
        cell.font      = { name: 'TH Sarabun New', size: 14 }
        cell.alignment = { vertical: 'middle' }
      })
    })
    const buffer = await workbook.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href = url; a.download = 'FIET-IRIS_user_template.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">นำเข้าผู้ใช้จาก Excel</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <button onClick={downloadTemplate}
            className="w-full py-2 rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 hover:border-fiet-blue hover:text-fiet-blue transition-all">
            ⬇ ดาวน์โหลด Template Excel
          </button>

          <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 space-y-0.5">
            <p className="font-semibold text-slate-500">คอลัมน์ที่รองรับ (ตามลำดับ):</p>
            <p>ชื่อ-นามสกุล · อีเมล · บทบาท · รหัสนักศึกษา · อีเมลอาจารย์ที่ปรึกษา · สาขาวิชา · ระดับการศึกษา</p>
            <p>• บทบาท: student / advisor / staff / executive / admin</p>
            <p>• ระดับการศึกษา: bachelor / master / doctoral (สำหรับนักศึกษาเท่านั้น)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">อัปโหลดไฟล์ Excel</label>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile}
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
                      <p className="text-xs text-slate-400">
                        {r.email}
                        {r.student_id && <span className="font-mono ml-1">({r.student_id})</span>}
                      </p>
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

// ─── Modal: ยืนยันลบ ────────────────────────────────────────────────────────
function DeleteConfirmModal({ users, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">ยืนยันการลบผู้ใช้</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            จะลบผู้ใช้ <strong className="text-red-600">{users.length} คน</strong> ต่อไปนี้ออกจากระบบถาวร:
          </p>
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 rounded-lg border border-slate-200">
            {users.map(u => (
              <div key={u.user_id} className="px-3 py-2 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-700">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor[u.role] || 'bg-slate-100 text-slate-500'}`}>
                  {roleLabel[u.role] || u.role}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <p className="text-xs text-amber-700">⚠️ ผู้ใช้ที่มีเอกสารในระบบจะไม่ถูกลบ กรุณาลบเอกสารออกก่อน</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">ยกเลิก</button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-60">
              {loading ? 'กำลังลบ...' : `ยืนยันลบ ${users.length} คน`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers]               = useState([])
  const [advisors, setAdvisors]         = useState([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [roleFilter, setRoleFilter]     = useState('')
  const [deptFilter, setDeptFilter]     = useState('')
  const [degreeFilter, setDegreeFilter] = useState('')
  const [sortBy, setSortBy]             = useState('created_at')
  const [sortDir, setSortDir]           = useState('desc')
  const [page, setPage]                 = useState(1)
  const [modal, setModal]               = useState(null)
  const [selected, setSelected]         = useState(null)
  const [selectedIds, setSelectedIds]   = useState(new Set())
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportScope, setExportScope] = useState('filtered')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await userService.getAll({
        search: debouncedSearch, role: roleFilter, department: deptFilter,
        degree_level: degreeFilter,
        sortBy, sortDir, page, limit: LIMIT,
      })
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch { toast.error('โหลดข้อมูลล้มเหลว') }
    finally { setLoading(false) }
  }, [debouncedSearch, roleFilter, deptFilter, degreeFilter, sortBy, sortDir, page])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    userService.getAdvisors()
      .then(r => setAdvisors(r.data?.advisors || []))
      .catch(() => {})
  }, [])

  const handleReset = async (user) => {
    if (!confirm(`รีเซ็ตรหัสผ่านของ ${user.name}?`)) return
    try {
      const { data } = await userService.resetPassword(user.user_id)
      toast.success(data.message)
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  const handleBulkDelete = async () => {
    if (!pendingDelete?.length) return
    setDeleteLoading(true)
    try {
      const ids = pendingDelete.map(u => u.user_id)
      const { data } = await userService.bulkDelete(ids)
      toast.success(data.message)
      setSelectedIds(prev => {
        const next = new Set(prev)
        ids.forEach(id => next.delete(id))
        return next
      })
      setPendingDelete(null)
      setModal(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally { setDeleteLoading(false) }
  }

  const handleUserSaved = (updatedUser) => {
    if (!updatedUser?.user_id) {
      fetchUsers()
      return
    }
    setUsers(prev => prev.map(u => u.user_id === updatedUser.user_id ? { ...u, ...updatedUser } : u))
  }

  const exportExcel = async () => {
    setExportLoading(true)
    try {
      let all = []
      if (exportScope === 'selected') {
        all = users.filter(u => selectedIds.has(u.user_id))
      } else {
        const { data } = await userService.getAll({
          search: exportScope === 'all' ? '' : debouncedSearch,
          role: exportScope === 'all' ? '' : roleFilter,
          department: exportScope === 'all' ? '' : deptFilter,
          degree_level: exportScope === 'all' ? '' : degreeFilter,
          sortBy, sortDir, limit: 9999, page: 1,
        })
        all = data.users || []
      }
      if (all.length === 0) { toast('ไม่มีข้อมูลที่จะ Export'); return }

      const { default: ExcelJS } = await import('exceljs')
      const workbook  = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('ผู้ใช้งาน')
      worksheet.columns = [
        { width: 25 }, { width: 30 }, { width: 15 }, { width: 18 },
        { width: 25 }, { width: 30 }, { width: 18 }, { width: 15 },
      ]
      worksheet.mergeCells('A1:H1')
      worksheet.getCell('A1').value = 'FIET-IRIS'
      worksheet.getCell('A1').font = { name: 'TH Sarabun New', bold: true, size: 14 }
      worksheet.getCell('A1').alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.mergeCells('A2:H2')
      worksheet.getCell('A2').value = 'รายงานผู้ใช้งานในระบบ'
      worksheet.getCell('A2').font = { name: 'TH Sarabun New', bold: true, size: 14 }
      worksheet.getCell('A2').alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.mergeCells('A3:H3')
      worksheet.getCell('A3').value = `วันที่พิมพ์ : ${new Date().toLocaleDateString('th-TH')} | รวมทั้งหมด : ${all.length} รายการ`
      worksheet.getCell('A3').font = { name: 'TH Sarabun New', bold: true, size: 14 }
      worksheet.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.addRow([])
      const headerRow = worksheet.addRow([
        'ชื่อ-นามสกุล', 'อีเมล', 'บทบาท', 'รหัสนักศึกษา',
        'อาจารย์ที่ปรึกษา', 'สาขาวิชา', 'ระดับการศึกษา', 'วันที่สร้าง',
      ])
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42B5E1' } }
        cell.font = { name: 'TH Sarabun New', bold: true, color: { argb: 'FFFFFFFF' }, size: 14 }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })
      all.forEach(u => {
        const row = worksheet.addRow([
          u.name,
          u.email,
          roleLabel[u.role]         || u.role,
          u.student_id              || '',
          u.advisor_name            || '',
          u.department              || '',
          degreeLabel[u.degree_level] || '',
          new Date(u.created_at).toLocaleDateString('th-TH'),
        ])
        row.eachCell({ includeEmpty: true }, cell => {
          cell.font      = { name: 'TH Sarabun New', size: 14 }
          cell.alignment = { vertical: 'middle' }
        })
      })
      const buffer = await workbook.xlsx.writeBuffer()
      const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url    = URL.createObjectURL(blob)
      const a      = document.createElement('a')
      a.href = url; a.download = `FIET-IRIS_users_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click()
      URL.revokeObjectURL(url)
      toast.success(`Export ${all.length} รายการสำเร็จ`)
    } catch { toast.error('Export ล้มเหลว') }
    finally { setExportLoading(false) }
  }

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
    setPage(1)
  }

  const totalPages    = Math.ceil(total / LIMIT)
  const allSelected   = users.length > 0 && users.every(u => selectedIds.has(u.user_id))
  const someSelected  = users.some(u => selectedIds.has(u.user_id))
  const selectedUsers = users.filter(u => selectedIds.has(u.user_id))
  const degreeDisabled = roleFilter && roleFilter !== 'student'
  const userDeptOptions = !degreeDisabled && degreeFilter ? DEPARTMENTS_BY_DEGREE[degreeFilter] || [] : ALL_DEPARTMENTS

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(prev => new Set([...prev, ...users.map(u => u.user_id)]))
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        users.forEach(u => next.delete(u.user_id))
        return next
      })
    }
  }

  const toggleSelectOne = (userId, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      checked ? next.add(userId) : next.delete(userId)
      return next
    })
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
          <select className="input-field w-full sm:w-auto" value={exportScope} onChange={e => setExportScope(e.target.value)}>
            <option value="filtered">ส่งออกตามตัวกรอง</option>
            <option value="all">ส่งออกทั้งหมด</option>
            <option value="selected" disabled={selectedIds.size === 0}>ส่งออกเฉพาะที่เลือก</option>
          </select>
          <button onClick={exportExcel} disabled={exportLoading}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-60">
            {exportLoading ? 'กำลัง Export...' : '⬇ Export'}
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
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <input className="input-field w-full sm:max-w-xs"
          placeholder="ค้นหาชื่อ อีเมล หรือรหัสนักศึกษา..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <select className="input-field w-full sm:w-auto" value={roleFilter}
          onChange={e => {
            const nextRole = e.target.value
            setRoleFilter(nextRole)
            if (nextRole && nextRole !== 'student') setDegreeFilter('')
            setDeptFilter('')
            setPage(1)
          }}>
          <option value="">ทุก Role</option>
          <option value="student">นักศึกษา</option>
          <option value="advisor">อาจารย์</option>
          <option value="staff">เจ้าหน้าที่</option>
          <option value="executive">ผู้บริหาร</option>
          <option value="admin">ผู้ดูแลระบบ</option>
        </select>
        <select className="input-field w-full sm:w-auto disabled:bg-slate-50 disabled:text-slate-400" value={degreeFilter}
          disabled={degreeDisabled}
          onChange={e => { setDegreeFilter(e.target.value); setDeptFilter(''); setPage(1) }}>
          <option value="">ทุกระดับ</option>
          <option value="bachelor">ป.ตรี</option>
          <option value="master">ป.โท</option>
          <option value="doctoral">ป.เอก</option>
        </select>
        <select className="input-field w-full sm:w-auto" value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setPage(1) }}>
          <option value="">ทุกสาขาวิชา</option>
          {userDeptOptions.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 text-white rounded-xl">
          <span className="text-sm font-medium">เลือกแล้ว {selectedIds.size} คน</span>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => { setPendingDelete(selectedUsers); setModal('delete') }}
              className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-xs font-medium transition-colors">
              ลบที่เลือก
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-300 hover:text-white px-2">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '1020px' }}>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 cursor-pointer"
                  />
                </th>
                {COLUMNS.map((col, i) => (
                  <th key={i}
                    onClick={() => col.sort && col.key && handleSort(col.key)}
                    className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${col.sort && col.key ? 'cursor-pointer hover:text-slate-700 select-none' : ''}`}>
                    {col.label}
                    {col.sort && col.key && (
                      <span className="ml-1" style={sortBy === col.key ? { color: '#42b5e1' } : { color: '#cbd5e1' }}>
                        {sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    )}
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
                <tr key={u.user_id}
                  className={`hover:bg-slate-50 transition-colors ${selectedIds.has(u.user_id) ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox"
                      checked={selectedIds.has(u.user_id)}
                      onChange={e => toggleSelectOne(u.user_id, e.target.checked)}
                      className="rounded border-slate-300 cursor-pointer"
                    />
                  </td>
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
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <button onClick={() => { setSelected(u); setModal('edit') }}
                        className="text-xs text-slate-500 hover:text-fiet-blue transition-colors font-medium">
                        แก้ไข
                      </button>
                      <span className="text-slate-200">|</span>
                      <button onClick={() => handleReset(u)}
                        className="text-xs text-slate-500 hover:text-amber-600 transition-colors font-medium">
                        รีเซ็ต
                      </button>
                      <span className="text-slate-200">|</span>
                      <button onClick={() => { setPendingDelete([u]); setModal('delete') }}
                        className="text-xs text-slate-500 hover:text-red-600 transition-colors font-medium">
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              แสดง {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} จาก {total} รายการ
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                ‹
              </button>
              <span className="px-3 text-sm text-slate-600 tabular-nums">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <UserModal
          user={modal === 'edit' ? selected : null}
          advisors={advisors}
          onClose={() => setModal(null)}
          onSaved={handleUserSaved}
        />
      )}
      {modal === 'import' && (
        <ImportModal
          advisors={advisors}
          onClose={() => setModal(null)}
          onSaved={fetchUsers}
        />
      )}
      {modal === 'delete' && pendingDelete && (
        <DeleteConfirmModal
          users={pendingDelete}
          onClose={() => { setModal(null); setPendingDelete(null) }}
          onConfirm={handleBulkDelete}
          loading={deleteLoading}
        />
      )}
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Edit3, GraduationCap, KeyRound, Mail, ShieldCheck, ShieldMinus, Trash2, X } from 'lucide-react'
import { adminService, userService } from '../../services/api'
import toast from 'react-hot-toast'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import useAcademicOptions from '../../hooks/useAcademicOptions'
import { DEAN_OFFICE, getProgramDisplayName, getProgramSourceName } from '../../constants/programs'
import { useLanguage } from '../../contexts/LanguageContext'

const LIMIT = 20

const compactDate = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

const safeFilePart = (value) => String(value || '')
  .trim()
  .replace(/[\\/:*?"<>|]/g, '')
  .replace(/\s+/g, '-')

const roleColor = {
  student:   'bg-blue-50 text-blue-700 border border-blue-200',
  advisor:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  staff:     'bg-orange-50 text-orange-700 border border-orange-200',
  admin:     'bg-purple-50 text-purple-700 border border-purple-200',
  executive: 'bg-teal-50 text-teal-700 border border-teal-200',
}
const degreeColor = {
  bachelor: 'bg-sky-50 text-sky-700 border border-sky-200',
  master:   'bg-violet-50 text-violet-700 border border-violet-200',
  doctoral: 'bg-rose-50 text-rose-700 border border-rose-200',
}
const accountStatusColor = {
  active:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  graduated: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  inactive:  'bg-slate-100 text-slate-600 border border-slate-200',
  archived:  'bg-zinc-100 text-zinc-700 border border-zinc-200',
}

// Modal: add/edit user
function UserModal({ user, advisors, academicOptions, onClose, onSaved }) {
  const { language, t } = useLanguage()
  const isEdit = !!user?.user_id
  const [form, setForm] = useState({
    name:         user?.name         || '',
    email:        user?.email        || '',
    role:         user?.role         || 'student',
    advisor_id:   user?.advisor_id   || '',
    program:   user?.program   || '',
    affiliation: user?.affiliation || '',
    student_id:   user?.student_id   || '',
    degree_level: user?.degree_level || 'bachelor',
  })
  const [loading, setLoading] = useState(false)
  const isStudent = form.role === 'student'
  const isExecutive = form.role === 'executive'
  const deanOffice = academicOptions.deanOffice || DEAN_OFFICE
  const programOptions = academicOptions.programsByDegree[form.degree_level] || []
  const affiliationOptions = academicOptions.affiliations

  useEffect(() => {
    if (isExecutive && form.affiliation !== deanOffice) {
      setForm(p => ({ ...p, affiliation: deanOffice }))
    }
  }, [isExecutive, form.affiliation, deanOffice])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let savedUser = null
      if (isEdit) {
        const { data } = await userService.update(user.user_id, form)
        savedUser = data?.user || { ...user, ...form }
        toast.success(t('adminUsers.editSuccess'))
      } else {
        await userService.create(form)
        toast.success(t('adminUsers.createSuccess'))
      }
      onSaved(savedUser)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'))
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto dark:bg-slate-900">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {isEdit ? t('adminUsers.editTitle') : t('adminUsers.addTitle')}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl" aria-label={t('common.close')}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('adminUsers.nameLabel')}</label>
            <input className="input-field" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder={t('adminUsers.namePlaceholder')} required />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('adminUsers.emailLabel')}</label>
              <input className="input-field" type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="username@kmutt.ac.th" required />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('adminUsers.roleLabel')}</label>
            <select className="input-field" value={form.role}
              onChange={e => setForm(p => ({
                ...p,
                role:         e.target.value,
                advisor_id:   '',
                program:      e.target.value === 'student' ? p.program : '',
                affiliation:  e.target.value === 'student' ? '' : e.target.value === 'executive' ? deanOffice : p.affiliation,
                degree_level: e.target.value === 'student' ? 'bachelor' : '',
                student_id:   e.target.value === 'student' ? p.student_id : '',
              }))}>
              <option value="student">{t('roles.student')}</option>
              <option value="advisor">{t('roles.advisor')}</option>
              <option value="staff">{t('roles.staff')}</option>
              <option value="executive">{t('roles.executive')}</option>
              <option value="admin">{t('roles.admin')}</option>
            </select>
          </div>

          {isStudent && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('adminUsers.degreeLabel')}</label>
              <select className="input-field" value={form.degree_level}
                onChange={e => setForm(p => ({ ...p, degree_level: e.target.value, program: '' }))}>
                <option value="bachelor">{t('adminUsers.degreeBachelor')}</option>
                <option value="master">{t('adminUsers.degreeMaster')}</option>
                <option value="doctoral">{t('adminUsers.degreeDoctoral')}</option>
              </select>
            </div>
          )}

          {isStudent && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('adminUsers.studentIdLabel')}</label>
              <input className="input-field font-mono" value={form.student_id}
                onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}
                placeholder={t('adminUsers.studentIdPlaceholder')} />
            </div>
          )}

          {isStudent && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('adminUsers.advisorLabel')}</label>
              <select className="input-field" value={form.advisor_id}
                onChange={e => setForm(p => ({ ...p, advisor_id: e.target.value }))} required>
                <option value="">{t('adminUsers.selectAdvisor')}</option>
                {advisors.map(a => (
                  <option key={a.user_id} value={a.user_id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {isStudent && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('adminUsers.programLabel')}</label>
            <select className="input-field" value={form.program}
              onChange={e => setForm(p => ({ ...p, program: e.target.value }))}>
              <option value="">{t('adminUsers.selectProgram')}</option>
              {programOptions.map(d => <option key={d} value={d}>{getProgramDisplayName(d, language)}</option>)}
            </select>
          </div>
          )}

          {!isStudent && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('adminUsers.affiliationLabel')}</label>
            <select className="input-field" value={form.affiliation}
              disabled={isExecutive}
              onChange={e => setForm(p => ({ ...p, affiliation: e.target.value }))}>
              {!isExecutive && <option value="">{t('adminUsers.selectAffiliation')}</option>}
              {affiliationOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">{t('common.cancel')}</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: '#42b5e1' }}>
              {loading ? t('common.saving') : isEdit ? t('common.save') : t('adminUsers.createBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal: import users
function ImportModal({ advisors, academicOptions, onClose, onSaved }) {
  const { language, locale, t } = useLanguage()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState([])
  const deanOffice = academicOptions.deanOffice || DEAN_OFFICE

  const roleLabel = {
    student:   t('roles.student'),
    advisor:   t('roles.advisor'),
    staff:     t('roles.staff'),
    admin:     t('roles.admin'),
    executive: t('roles.executive'),
  }
  const degreeLabel = {
    bachelor: t('adminUsers.degBachelor'),
    master:   t('adminUsers.degMaster'),
    doctoral: t('adminUsers.degDoctoral'),
  }

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
        const [name, email, role, student_id, advisor_email, program, affiliation, degree_level] = cols
        return {
          name:          String(name          || '').trim(),
          email:         String(email         || '').trim(),
          role:          String(role          || '').trim(),
          student_id:    String(student_id    || '').trim(),
          advisor_email: String(advisor_email || '').trim(),
          program:    getProgramSourceName(String(program || '').trim()),
          affiliation: String(affiliation || '').trim(),
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
        program:      r.role === 'student' ? (r.program || null) : null,
        affiliation:  r.role === 'executive' ? deanOffice : (r.affiliation || null),
        student_id:   r.student_id || null,
        degree_level: r.degree_level || (r.role === 'student' ? 'bachelor' : null),
        advisor_id:   advisors.find(a => a.email === r.advisor_email)?.user_id || null,
      }))
      const { data } = await userService.importExcel({ users: usersToImport })
      toast.success(data.message)
      if (data.errors?.length > 0) setErrors(data.errors)
      else { onSaved(); onClose() }
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'))
    } finally { setLoading(false) }
  }

  const downloadTemplate = async () => {
    const { default: ExcelJS } = await import('exceljs')
    const workbook  = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(t('adminUsers.importSheetName'))
    worksheet.columns = [
      { width: 25 }, { width: 30 }, { width: 15 }, { width: 18 },
      { width: 30 }, { width: 58 }, { width: 38 }, { width: 18 },
    ]
    worksheet.mergeCells('A1:H1')
    worksheet.getCell('A1').value = 'FIET-IRIS'
    worksheet.getCell('A1').font = { name: 'TH Sarabun New', bold: true, size: 14 }
    worksheet.getCell('A1').alignment = { horizontal: 'right', vertical: 'middle' }
    worksheet.mergeCells('A2:H2')
    worksheet.getCell('A2').value = t('adminUsers.importTemplateTitle')
    worksheet.getCell('A2').font = { name: 'TH Sarabun New', bold: true, size: 14 }
    worksheet.getCell('A2').alignment = { horizontal: 'right', vertical: 'middle' }
    worksheet.mergeCells('A3:H3')
    worksheet.getCell('A3').value = `${t('adminUsers.printedAt')} : ${new Date().toLocaleDateString(locale)}`
    worksheet.getCell('A3').font = { name: 'TH Sarabun New', bold: true, size: 14 }
    worksheet.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' }
    worksheet.addRow([])
    const headerRow = worksheet.addRow([
      t('adminUsers.colName'), t('adminUsers.colEmail'), t('adminUsers.colRole'), t('adminUsers.colStudentId'),
      t('adminUsers.advisorEmailLabel'), t('adminUsers.colProgram'), t('adminUsers.colAffiliation'), t('adminUsers.degreeLabel'),
    ])
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42B5E1' } }
      cell.font = { name: 'TH Sarabun New', bold: true, color: { argb: 'FFFFFFFF' }, size: 14 }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    })
    const examples = [
      ['Sample Student', 'student@kmutt.ac.th', 'student', '66080502xxx', 'advisor@kmutt.ac.th', getProgramDisplayName(academicOptions.programs[0] || '', language), '', 'bachelor'],
      ['Sample Advisor', 'advisor@kmutt.ac.th', 'advisor', '', '', '', academicOptions.affiliations[0] || '', ''],
      ['Sample Staff', 'staff@kmutt.ac.th', 'staff', '', '', '', deanOffice, ''],
      ['Sample Executive', 'executive@kmutt.ac.th', 'executive', '', '', '', deanOffice, ''],
    ]
    examples.forEach(ex => {
      const row = worksheet.addRow(ex)
      row.eachCell({ includeEmpty: true }, cell => {
        cell.font      = { name: 'TH Sarabun New', size: 14 }
        cell.alignment = { vertical: 'middle', wrapText: true }
      })
    })
    const buffer = await workbook.xlsx.writeBuffer()
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href = url; a.download = `IRIS_${safeFilePart(t('adminUsers.userFilePart'))}_${safeFilePart(t('adminUsers.importFilePart'))}_${compactDate()}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg dark:bg-slate-900">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{t('adminUsers.importTitle')}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl" aria-label={t('common.close')}>&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <button onClick={downloadTemplate}
            className="w-full py-2 rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 hover:border-fiet-blue hover:text-fiet-blue transition-all">
            {t('adminUsers.importTemplateDownload')}
          </button>

          <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 space-y-0.5 dark:bg-slate-800">
            <p className="font-semibold text-slate-500">{t('adminUsers.importSupportedColumnsTitle')}</p>
            <p>{t('adminUsers.importSupportedColumns')}</p>
            <p>{t('adminUsers.importRoleHelp')}</p>
            <p>{t('adminUsers.importDegreeHelp')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('adminUsers.uploadLabel')}</label>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile}
              className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200" />
          </div>

          {rows.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide dark:bg-slate-800">
                {t('adminUsers.foundRecords', { count: rows.length })}
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
              <p className="text-xs font-semibold text-red-700 mb-1">{t('adminUsers.importErrors', { count: errors.length })}</p>
              <ul className="text-xs text-red-600 space-y-0.5">
                {errors.map((e, i) => <li key={i}>- {e}</li>)}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">{t('common.cancel')}</button>
            <button onClick={handleImport} disabled={rows.length === 0 || loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: '#42b5e1' }}>
              {loading ? t('adminUsers.importing') : t('adminUsers.importBtn', { count: rows.length })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Modal
function DeleteConfirmModal({ users, onClose, onConfirm, loading }) {
  const { t } = useLanguage()
  const roleLabel = {
    student:   t('roles.student'),
    advisor:   t('roles.advisor'),
    staff:     t('roles.staff'),
    admin:     t('roles.admin'),
    executive: t('roles.executive'),
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md dark:bg-slate-900">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{t('adminUsers.deleteTitle')}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl" aria-label={t('common.close')}>&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300"
            dangerouslySetInnerHTML={{ __html: t('adminUsers.deleteMessage', { count: `<strong class="text-red-600">${users.length}</strong>` }) }} />
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            {users.map(u => (
              <div key={u.user_id} className="px-3 py-2 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor[u.role] || 'bg-slate-100 text-slate-500'}`}>
                  {roleLabel[u.role] || u.role}
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 dark:bg-amber-950/20 dark:border-amber-900">
            <p className="text-xs text-amber-700 dark:text-amber-300">{t('adminUsers.deleteWarning')}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">{t('common.cancel')}</button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-60">
              {loading ? t('adminUsers.deleting') : t('adminUsers.deleteBtn', { count: users.length })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main page
function SendEmailModal({ user, onClose }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({ subject: '', body: '' })
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.body.trim()) {
      toast.error(t('adminUsers.emailFillAll'))
      return
    }

    setLoading(true)
    try {
      const data = new FormData()
      data.append('user_id', user.user_id)
      data.append('subject', form.subject)
      data.append('body', form.body)
      files.forEach(file => data.append('attachments', file))
      await adminService.sendUserEmail(data)
      toast.success(t('adminUsers.emailSendSuccess'))
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || t('adminUsers.emailSendFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    const maxSize = 10 * 1024 * 1024
    if (selectedFiles.length > 5) {
      toast.error(t('adminUsers.emailAttachmentLimit'))
      e.target.value = ''
      return
    }
    if (selectedFiles.some(file => file.size > maxSize)) {
      toast.error(t('adminUsers.emailAttachmentSize'))
      e.target.value = ''
      return
    }
    setFiles(selectedFiles)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{t('adminUsers.emailTitle')}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{user.name} - {user.email}</p>
          </div>
          <button onClick={onClose} className="text-xl text-slate-400 hover:text-slate-600">x</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('adminUsers.emailSubject')}</label>
            <input
              className="input-field"
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              maxLength={255}
              placeholder={t('adminUsers.emailSubjectPlaceholder')}
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('adminUsers.emailBody')}</label>
            <textarea
              className="input-field min-h-48 resize-y"
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              placeholder={t('adminUsers.emailBodyPlaceholder')}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-slate-400">{t('adminUsers.emailBodyHint')}</p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-300">
            {t('adminUsers.emailAuditNote')}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('adminUsers.emailAttachments')}</label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              disabled={loading}
              className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-600 hover:file:bg-slate-200"
            />
            <p className="mt-1 text-xs text-slate-400">{t('adminUsers.emailAttachmentHint')}</p>
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {files.map(file => (
                  <span key={`${file.name}-${file.size}`} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">{t('common.cancel')}</button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: '#42b5e1' }}
            >
              {loading ? t('adminUsers.emailSending') : t('adminUsers.emailSend')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UserActionModal({ user, onClose, onEdit, onReset, onEmail, onGraduate, onActivate, onPromoteAdmin, onDemoteAdmin, onDelete }) {
  const { t } = useLanguage()
  const canGraduate = user.role === 'student' && user.account_status !== 'graduated'
  const canActivate = user.account_status !== 'active'
  const canPromoteAdmin = user.role !== 'admin'
  const canDemoteAdmin = user.role === 'admin'
  const initials = (user.name || user.email || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  const ActionButton = ({ icon: Icon, label, onClick, danger = false }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all',
        'hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-200',
        danger
          ? 'border-red-100 bg-red-50/40 hover:border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:bg-red-950/10 dark:hover:bg-red-950/20'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
          danger
            ? 'bg-red-100 text-red-500 dark:bg-red-950/40 dark:text-red-300'
            : 'bg-slate-100 text-slate-500 group-hover:bg-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700',
        ].join(' ')}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 text-sm font-semibold text-slate-700 dark:text-slate-100">
        {label}
      </span>
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-5 dark:border-slate-800">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-base font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
            {user.student_id && (
              <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">{user.student_id}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-2 p-3 sm:grid-cols-2">
          <ActionButton icon={Edit3} label={t('adminUsers.actionEdit')} onClick={onEdit} />
          <ActionButton icon={KeyRound} label={t('adminUsers.actionReset')} onClick={onReset} />
          <ActionButton icon={Mail} label={t('adminUsers.actionEmail')} onClick={onEmail} />
          {canGraduate && (
            <ActionButton icon={GraduationCap} label={t('adminUsers.actionGraduate')} onClick={onGraduate} />
          )}
          {canActivate && (
            <ActionButton icon={CheckCircle2} label={t('adminUsers.actionActivate')} onClick={onActivate} />
          )}
          {canPromoteAdmin && (
            <ActionButton icon={ShieldCheck} label={t('adminUsers.actionPromoteAdmin')} onClick={onPromoteAdmin} />
          )}
          {canDemoteAdmin && (
            <ActionButton icon={ShieldMinus} label={t('adminUsers.actionDemoteAdmin')} onClick={onDemoteAdmin} />
          )}
          <ActionButton icon={Trash2} label={t('adminUsers.actionDelete')} onClick={onDelete} danger />
        </div>
        <div className="border-t border-slate-100 p-3 dark:border-slate-800">
          <button type="button" onClick={onClose} className="btn-secondary w-full text-sm">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const { language, locale, t } = useLanguage()
  const academicOptions = useAcademicOptions()
  const [users, setUsers]               = useState([])
  const [advisors, setAdvisors]         = useState([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [roleFilter, setRoleFilter]     = useState('')
  const [accountStatusFilter, setAccountStatusFilter] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [affiliationFilter, setAffiliationFilter] = useState('')
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

  const roleLabel = {
    student:   t('roles.student'),
    advisor:   t('roles.advisor'),
    staff:     t('roles.staff'),
    admin:     t('roles.admin'),
    executive: t('roles.executive'),
  }
  const degreeLabel = {
    bachelor: t('adminUsers.degBachelor'),
    master:   t('adminUsers.degMaster'),
    doctoral: t('adminUsers.degDoctoral'),
  }
  const accountStatusLabel = {
    active:    t('adminUsers.statusActive'),
    graduated: t('adminUsers.statusGraduated'),
    inactive:  t('adminUsers.statusInactive'),
    archived:  t('adminUsers.statusArchived'),
  }

  const COLUMNS = [
    { key: 'name',         label: `${t('adminUsers.colName')} / ${t('adminUsers.colStudentId')}`, sort: true, className: 'w-[28%]' },
    { key: 'role',         label: `${t('adminUsers.colRole')} / ${t('adminUsers.colAccountStatus')}`, sort: true, className: 'w-[18%]' },
    { key: 'degree_level', label: `${t('adminUsers.colDegree')} / ${t('adminUsers.colAdvisor')} / ${t('adminUsers.colProgram')}`, sort: true, className: 'w-[31%]' },
    { key: 'affiliation',  label: t('adminUsers.colAffiliation'),  sort: true, className: 'w-[17%]' },
    { key: 'doc_count',    label: t('common.documents'),           sort: true, className: 'w-[6%]' },
  ]

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await userService.getAll({
        search: debouncedSearch, role: roleFilter, program: programFilter,
        account_status: accountStatusFilter,
        affiliation: affiliationFilter,
        degree_level: degreeFilter,
        sortBy, sortDir, page, limit: LIMIT,
      })
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch { toast.error(t('adminUsers.loadFailed')) }
    finally { setLoading(false) }
  }, [debouncedSearch, roleFilter, accountStatusFilter, programFilter, affiliationFilter, degreeFilter, sortBy, sortDir, page, t])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    userService.getAdvisors()
      .then(r => setAdvisors(r.data?.advisors || []))
      .catch(() => {})
  }, [])

  const handleReset = async (user) => {
    if (!confirm(t('adminUsers.resetConfirm', { name: user.name }))) return
    try {
      const { data } = await userService.resetPassword(user.user_id)
      toast.success(data.message)
    } catch { toast.error(t('common.error')) }
  }

  const handleStatusChange = async (user, status) => {
    if (status === 'graduated' && !confirm(t('adminUsers.graduateConfirm', { name: user.name }))) return
    try {
      const { data } = await userService.updateStatus(user.user_id, status)
      toast.success(data.message || t('adminUsers.statusUpdateSuccess'))
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'))
    }
  }

  const handleRoleChange = async (user, role) => {
    const confirmKey = role === 'admin' ? 'adminUsers.promoteAdminConfirm' : 'adminUsers.demoteAdminConfirm'
    if (!confirm(t(confirmKey, { name: user.name }))) return
    try {
      const { data } = await userService.updateRole(user.user_id, role)
      toast.success(data.message || t('adminUsers.roleUpdateSuccess'))
      setModal(null)
      setSelected(data.user || null)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'))
    }
  }

  const handleBulkStatusChange = async (status) => {
    if (selectedIds.size === 0) return
    const selected = [...selectedIds]
    if (status === 'graduated' && !confirm(t('adminUsers.bulkGraduateConfirm', { count: selected.length }))) return
    try {
      const { data } = await userService.bulkStatus(selected, status)
      toast.success(data.message || t('adminUsers.statusUpdateSuccess'))
      setSelectedIds(new Set())
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'))
    }
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
      toast.error(err.response?.data?.message || t('common.error'))
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
          account_status: exportScope === 'all' ? '' : accountStatusFilter,
          program: exportScope === 'all' ? '' : programFilter,
          affiliation: exportScope === 'all' ? '' : affiliationFilter,
          degree_level: exportScope === 'all' ? '' : degreeFilter,
          sortBy, sortDir, limit: 9999, page: 1,
        })
        all = data.users || []
      }
      if (all.length === 0) { toast(t('adminUsers.noDataToExport')); return }

      const { default: ExcelJS } = await import('exceljs')
      const workbook  = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(t('adminUsers.importSheetName'))
      worksheet.columns = [
        { width: 25 }, { width: 30 }, { width: 15 }, { width: 18 },
        { width: 25 }, { width: 58 }, { width: 38 }, { width: 18 }, { width: 15 },
      ]
      worksheet.mergeCells('A1:I1')
      worksheet.getCell('A1').value = 'FIET-IRIS'
      worksheet.getCell('A1').font = { name: 'TH Sarabun New', bold: true, size: 14 }
      worksheet.getCell('A1').alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.mergeCells('A2:I2')
      worksheet.getCell('A2').value = t('adminUsers.reportTitle')
      worksheet.getCell('A2').font = { name: 'TH Sarabun New', bold: true, size: 14 }
      worksheet.getCell('A2').alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.mergeCells('A3:I3')
      worksheet.getCell('A3').value = `${t('adminUsers.printedAt')} : ${new Date().toLocaleDateString(locale)} | ${t('adminUsers.reportTotal')} : ${all.length} ${t('common.records')}`
      worksheet.getCell('A3').font = { name: 'TH Sarabun New', bold: true, size: 14 }
      worksheet.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.addRow([])
      const headerRow = worksheet.addRow([
        t('adminUsers.colName'), t('adminUsers.colEmail'), t('adminUsers.colRole'), t('adminUsers.colStudentId'),
        t('adminUsers.colAdvisor'), t('adminUsers.colProgram'), t('adminUsers.colAffiliation'), t('adminUsers.degreeLabel'), t('adminUsers.colCreated'),
      ])
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42B5E1' } }
        cell.font = { name: 'TH Sarabun New', bold: true, color: { argb: 'FFFFFFFF' }, size: 14 }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      })
      all.forEach(u => {
        const row = worksheet.addRow([
          u.name,
          u.email,
          roleLabel[u.role]         || u.role,
          u.student_id              || '',
          u.advisor_name            || '',
          getProgramDisplayName(u.program, language) || '',
          u.affiliation           || '',
          degreeLabel[u.degree_level] || '',
          new Date(u.created_at).toLocaleDateString(locale),
        ])
        row.eachCell({ includeEmpty: true }, cell => {
          cell.font      = { name: 'TH Sarabun New', size: 14 }
          cell.alignment = { vertical: 'middle', wrapText: true }
        })
      })
      const scopeLabel = exportScope === 'selected' ? t('adminUsers.exportScopeSelected')
        : exportScope === 'all' ? t('adminUsers.exportScopeAll') : t('adminUsers.exportScopeFiltered')
      const fileParts = ['IRIS', t('adminUsers.userFilePart'), t('adminUsers.reportFilePart'), compactDate(), scopeLabel]
      const buffer = await workbook.xlsx.writeBuffer()
      const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url    = URL.createObjectURL(blob)
      const a      = document.createElement('a')
      a.href = url; a.download = `${fileParts.map(safeFilePart).filter(Boolean).join('_')}.xlsx`; a.click()
      URL.revokeObjectURL(url)
      toast.success(t('adminUsers.exportSuccess', { count: all.length }))
    } catch { toast.error(t('adminUsers.exportFailed')) }
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
  const userProgramOptions = !degreeDisabled && degreeFilter
      ? academicOptions.programsByDegree[degreeFilter] || []
      : academicOptions.programs

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

  const renderAcademicSummary = (user) => {
    const programName = getProgramDisplayName(user.program, language)
    const hasDegree = !!user.degree_level
    const hasAdvisor = !!user.advisor_name
    const hasProgram = !!programName

    if (!hasDegree && !hasAdvisor && !hasProgram) {
      return <span className="text-sm font-semibold text-slate-500">&mdash;</span>
    }

    return (
      <div className="space-y-1.5">
        {hasDegree && (
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${degreeColor[user.degree_level] || 'bg-slate-100 text-slate-500'}`}>
            {degreeLabel[user.degree_level] || user.degree_level}
          </span>
        )}
        {hasAdvisor && <p className="break-words text-xs text-slate-500">{user.advisor_name}</p>}
        {hasProgram && <p className="break-words text-xs text-slate-500">{programName}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>{t('roles.admin')}</p>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('adminUsers.title')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{t('adminUsers.totalAccounts', { count: total })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input-field w-full sm:w-auto" value={exportScope} onChange={e => setExportScope(e.target.value)}>
            <option value="filtered">{t('adminUsers.exportFiltered')}</option>
            <option value="all">{t('adminUsers.exportAll')}</option>
            <option value="selected" disabled={selectedIds.size === 0}>{t('adminUsers.exportSelected')}</option>
          </select>
          <button onClick={exportExcel} disabled={exportLoading}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-60">
            {exportLoading ? t('adminUsers.exporting') : 'Export'}
          </button>
          <button onClick={() => setModal('import')}
            className="px-3 py-2 rounded-lg border text-sm font-medium transition-all"
            style={{ borderColor: '#42b5e1', color: '#42b5e1' }}>
            Import Excel
          </button>
          <button onClick={() => { setSelected(null); setModal('add') }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
            style={{ backgroundColor: '#42b5e1' }}>
            {t('adminUsers.addUser')}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <input className="input-field w-full sm:max-w-xs"
          placeholder={t('adminUsers.searchPlaceholder')}
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <select className="input-field w-full sm:w-auto" value={roleFilter}
          onChange={e => {
            const nextRole = e.target.value
            setRoleFilter(nextRole)
            if (nextRole && nextRole !== 'student') setDegreeFilter('')
            setProgramFilter('')
            setAffiliationFilter(nextRole === 'executive' ? academicOptions.deanOffice : '')
            setPage(1)
          }}>
          <option value="">{t('adminUsers.allRoles')}</option>
          <option value="student">{t('roles.student')}</option>
          <option value="advisor">{t('roles.advisor')}</option>
          <option value="staff">{t('roles.staff')}</option>
          <option value="executive">{t('roles.executive')}</option>
          <option value="admin">{t('roles.admin')}</option>
        </select>
        <select className="input-field w-full sm:w-auto" value={accountStatusFilter}
          onChange={e => { setAccountStatusFilter(e.target.value); setPage(1) }}>
          <option value="">{t('adminUsers.allAccountStatuses')}</option>
          <option value="active">{t('adminUsers.statusActive')}</option>
          <option value="graduated">{t('adminUsers.statusGraduated')}</option>
          <option value="inactive">{t('adminUsers.statusInactive')}</option>
          <option value="archived">{t('adminUsers.statusArchived')}</option>
        </select>
        <select className="input-field w-full sm:w-auto disabled:bg-slate-50 disabled:text-slate-400" value={degreeFilter}
          disabled={degreeDisabled}
          onChange={e => { setDegreeFilter(e.target.value); setProgramFilter(''); setPage(1) }}>
          <option value="">{t('adminUsers.allDegrees')}</option>
          <option value="bachelor">{t('adminUsers.degBachelor')}</option>
          <option value="master">{t('adminUsers.degMaster')}</option>
          <option value="doctoral">{t('adminUsers.degDoctoral')}</option>
        </select>
        <select className="input-field w-full sm:w-auto" value={programFilter}
          disabled={roleFilter && roleFilter !== 'student'}
          onChange={e => { setProgramFilter(e.target.value); setPage(1) }}>
          <option value="">{t('adminUsers.allPrograms')}</option>
          {userProgramOptions.map(d => (
            <option key={d} value={d}>{getProgramDisplayName(d, language)}</option>
          ))}
        </select>
        <select className="input-field w-full sm:w-auto" value={affiliationFilter}
          disabled={roleFilter === 'student' || roleFilter === 'executive'}
          onChange={e => { setAffiliationFilter(e.target.value); setPage(1) }}>
          {roleFilter !== 'executive' && <option value="">{t('adminUsers.allAffiliations')}</option>}
          {academicOptions.affiliations.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 text-white rounded-xl">
          <span className="text-sm font-medium">{t('adminUsers.selectedCount', { count: selectedIds.size })}</span>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => handleBulkStatusChange('graduated')}
              className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-xs font-medium transition-colors">
              {t('adminUsers.markGraduatedSelected')}
            </button>
            <button onClick={() => handleBulkStatusChange('active')}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-xs font-medium transition-colors">
              {t('adminUsers.activateSelected')}
            </button>
            <button onClick={() => { setPendingDelete(selectedUsers); setModal('delete') }}
              className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-xs font-medium transition-colors">
              {t('adminUsers.deleteSelected')}
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-300 hover:text-white px-2">
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        <div className="overflow-hidden">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 dark:bg-slate-950 dark:border-slate-800">
              <tr>
                <th className="w-10 px-3 py-3">
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
                    className={`text-left px-3 py-3 align-top text-xs font-semibold text-slate-500 uppercase tracking-wide ${col.className || ''} ${col.sort && col.key ? 'cursor-pointer hover:text-slate-700 select-none' : ''}`}>
                    {col.label}
                    {col.sort && col.key && (
                      <span className="ml-1" style={sortBy === col.key ? { color: '#42b5e1' } : { color: '#cbd5e1' }}>
                        {sortBy === col.key ? (sortDir === 'asc' ? '\u2191' : '\u2193') : '\u2195'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-16 text-slate-400 text-sm">{t('common.loading')}</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-slate-400 text-sm">{t('adminUsers.noData')}</td></tr>
              ) : users.map(u => (
                <tr key={u.user_id}
                  className={`hover:bg-slate-50 transition-colors dark:hover:bg-slate-800/50 ${selectedIds.has(u.user_id) ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-3 py-3 align-top">
                    <input type="checkbox"
                      checked={selectedIds.has(u.user_id)}
                      onChange={e => toggleSelectOne(u.user_id, e.target.checked)}
                      className="rounded border-slate-300 cursor-pointer"
                    />
                  </td>
                  <td className="hidden">{u.student_id}</td>
                  <td className="px-3 py-3 align-top">
                    <button
                      onClick={() => { setSelected(u); setModal('actions') }}
                      className="block max-w-full break-words text-left font-semibold text-slate-800 underline-offset-4 transition-colors hover:text-fiet-blue hover:underline dark:text-slate-100"
                    >
                      {u.name}
                    </button>
                    <p className="mt-0.5 break-all text-xs text-slate-400">{u.email}</p>
                    {u.student_id && <p className="mt-1 text-xs font-mono text-slate-500">{u.student_id}</p>}
                  </td>
                  <td className="hidden">{u.email}</td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${roleColor[u.role] || 'bg-slate-100 text-slate-500'}`}>
                        {roleLabel[u.role] || u.role}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${accountStatusColor[u.account_status || 'active'] || 'bg-slate-100 text-slate-500'}`}>
                        {accountStatusLabel[u.account_status || 'active'] || u.account_status || 'active'}
                      </span>
                    </div>
                    {u.account_status === 'graduated' && u.graduated_at && (
                      <p className="mt-1 text-[11px] text-slate-400">{new Date(u.graduated_at).toLocaleDateString(locale)}</p>
                    )}
                  </td>
                  <td className="hidden">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${accountStatusColor[u.account_status || 'active'] || 'bg-slate-100 text-slate-500'}`}>
                      {accountStatusLabel[u.account_status || 'active'] || u.account_status || 'active'}
                    </span>
                    {u.account_status === 'graduated' && u.graduated_at && (
                      <p className="mt-1 text-[11px] text-slate-400">{new Date(u.graduated_at).toLocaleDateString(locale)}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {renderAcademicSummary(u)}
                  </td>
                  <td className="hidden">{u.advisor_name}</td>
                  <td className="hidden" title={getProgramDisplayName(u.program, language) || ''}>
                    <span className="block truncate">{getProgramDisplayName(u.program, language) || '-'}</span>
                  </td>
                  <td className="px-3 py-3 align-top text-xs text-slate-500" title={u.affiliation || ''}>
                    {u.affiliation ? (
                      <span className="break-words">{u.affiliation}</span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-500">&mdash;</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center align-top text-xs tabular-nums text-slate-600">{u.doc_count}</td>
                  <td className="hidden">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <button onClick={() => { setSelected(u); setModal('edit') }}
                        className="text-xs text-slate-500 hover:text-fiet-blue transition-colors font-medium">
                        {t('adminUsers.actionEdit')}
                      </button>
                      <span className="text-slate-200">|</span>
                      <button onClick={() => handleReset(u)}
                        className="text-xs text-slate-500 hover:text-amber-600 transition-colors font-medium">
                        {t('adminUsers.actionReset')}
                      </button>
                      <span className="text-slate-200">|</span>
                      <button onClick={() => { setSelected(u); setModal('email') }}
                        className="text-xs text-slate-500 hover:text-sky-600 transition-colors font-medium">
                        {t('adminUsers.actionEmail')}
                      </button>
                      {u.role === 'student' && u.account_status !== 'graduated' && (
                        <>
                          <span className="text-slate-200">|</span>
                          <button onClick={() => handleStatusChange(u, 'graduated')}
                            className="text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium">
                            {t('adminUsers.actionGraduate')}
                          </button>
                        </>
                      )}
                      {u.account_status !== 'active' && (
                        <>
                          <span className="text-slate-200">|</span>
                          <button onClick={() => handleStatusChange(u, 'active')}
                            className="text-xs text-slate-500 hover:text-emerald-600 transition-colors font-medium">
                            {t('adminUsers.actionActivate')}
                          </button>
                        </>
                      )}
                      <span className="text-slate-200">|</span>
                      <button onClick={() => { setPendingDelete([u]); setModal('delete') }}
                        className="text-xs text-slate-500 hover:text-red-600 transition-colors font-medium">
                        {t('adminUsers.actionDelete')}
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500">
              {t('adminUsers.pagination', {
                from: Math.min((page - 1) * LIMIT + 1, total),
                to: Math.min(page * LIMIT, total),
                total,
              })}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                &lt;
              </button>
              <span className="px-3 text-sm text-slate-600 tabular-nums">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <UserModal
          user={modal === 'edit' ? selected : null}
          advisors={advisors}
          academicOptions={academicOptions}
          onClose={() => setModal(null)}
          onSaved={handleUserSaved}
        />
      )}
      {modal === 'import' && (
        <ImportModal
          advisors={advisors}
          academicOptions={academicOptions}
          onClose={() => setModal(null)}
          onSaved={fetchUsers}
        />
      )}
      {modal === 'actions' && selected && (
        <UserActionModal
          user={selected}
          onClose={() => { setModal(null); setSelected(null) }}
          onEdit={() => setModal('edit')}
          onReset={() => { handleReset(selected); setModal(null); setSelected(null) }}
          onEmail={() => setModal('email')}
          onGraduate={() => { handleStatusChange(selected, 'graduated'); setModal(null); setSelected(null) }}
          onActivate={() => { handleStatusChange(selected, 'active'); setModal(null); setSelected(null) }}
          onPromoteAdmin={() => handleRoleChange(selected, 'admin')}
          onDemoteAdmin={() => handleRoleChange(selected, 'staff')}
          onDelete={() => { setPendingDelete([selected]); setModal('delete') }}
        />
      )}
      {modal === 'email' && selected && (
        <SendEmailModal
          user={selected}
          onClose={() => { setModal(null); setSelected(null) }}
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

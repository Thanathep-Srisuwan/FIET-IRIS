import { useEffect, useMemo, useRef, useState } from 'react'
import ReactQuill from 'react-quill'
import toast from 'react-hot-toast'
import { settingsService } from '../../services/api'
import 'react-quill/dist/quill.snow.css'
import { Trash2, AlertTriangle, Mail } from 'lucide-react'

const TEMPLATE_META = {
  expiry_warning: {
    label: 'แจ้งเตือนใกล้หมดอายุ',
    shortLabel: 'ใกล้หมดอายุ',
    description: 'ใช้ร่วมกับค่า expiry warning days ในหน้า Settings',
    tone: 'amber',
  },
  permanent_delete: {
    label: 'แจ้งเตือนลบถาวร',
    shortLabel: 'ลบถาวร',
    description: 'ใช้ร่วมกับค่า trash retention days ในหน้า Settings',
    tone: 'red',
  },
}

const EXAMPLE_VARS = {
  expiry_warning: {
    name: 'สมชาย ใจดี',
    docTitle: 'ใบรับรอง RI ปี 2567',
    docType: 'RI',
    expireDate: '15 มิถุนายน 2568',
    daysRemaining: '45',
    system_name: 'FIET-IRIS',
    org_name: 'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี มจธ.',
    clientUrl: 'https://iris.fiet.kmutt.ac.th',
  },
  permanent_delete: {
    name: 'สมหญิง รักดี',
    docTitle: 'ใบรับรอง IRB โครงการวิจัย',
    docType: 'IRB',
    reason: 'อยู่ในถังขยะนานเกิน 30 วัน',
    deletedBy: 'ระบบอัตโนมัติ',
    system_name: 'FIET-IRIS',
    org_name: 'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี มจธ.',
  },
}

const VAR_DESCRIPTIONS = {
  name: 'ชื่อผู้รับอีเมล',
  docTitle: 'ชื่อเอกสารหรือใบรับรอง',
  docType: 'ประเภทเอกสาร เช่น RI หรือ IRB',
  expireDate: 'วันที่เอกสารหมดอายุ',
  daysRemaining: 'จำนวนวันที่เหลือก่อนหมดอายุ',
  reason: 'เหตุผลของการดำเนินการ',
  deletedBy: 'ผู้ดำเนินการลบเอกสาร',
  system_name: 'ชื่อระบบ',
  org_name: 'ชื่อหน่วยงานหรือคณะ',
  clientUrl: 'ลิงก์สำหรับเข้าสู่ระบบ',
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'clean'],
  ],
}

function renderPreview(html = '', vars = {}) {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `<span style="color:#ef4444">{{${key}}}</span>`)
}

function parseVariables(value) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatUpdatedAt(value) {
  if (!value) return 'ยังไม่มีข้อมูล'
  return new Date(value).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TemplateIcon({ tone }) {
  const color = tone === 'red'
    ? 'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/30'
    : 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30'

  return (
    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
      {tone === 'red' ? (
        <Trash2 size={20} />
      ) : (
        <AlertTriangle size={20} />
      )}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto mb-4 flex items-center justify-center text-slate-400">
        <Mail size={32} />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">ยังไม่มี Email Template</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">โปรดตรวจสอบ migration หรือข้อมูลในตาราง EMAIL_TEMPLATES</p>
    </div>
  )
}

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState({ subject: '', body_html: '' })
  const [original, setOriginal] = useState({ subject: '', body_html: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('editor')
  const quillRef = useRef(null)

  const selectedTemplate = useMemo(
    () => templates.find(template => template.template_key === selected),
    [templates, selected]
  )

  const meta = TEMPLATE_META[selected] || {
    label: selected || 'Template',
    shortLabel: selected || 'Template',
    description: selectedTemplate?.description || 'Email template',
    tone: 'amber',
  }

  const variables = useMemo(() => parseVariables(selectedTemplate?.variables), [selectedTemplate])
  const exampleVars = EXAMPLE_VARS[selected] || {}
  const previewHtml = renderPreview(draft.body_html, exampleVars)
  const previewSubject = renderPreview(draft.subject, exampleVars)
  const isDirty = draft.subject !== original.subject || draft.body_html !== original.body_html

  useEffect(() => {
    settingsService.getTemplates()
      .then(response => {
        const data = response.data || []
        setTemplates(data)
        if (data.length) selectTemplate(data[0])
      })
      .catch(() => toast.error('โหลด Email Templates ไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (view !== 'editor') return
    const timer = setTimeout(() => {
      const toolbar = document.querySelector('.email-template-editor .ql-toolbar')
      if (!toolbar) return
      const titles = {
        '.ql-bold': 'ตัวหนา',
        '.ql-italic': 'ตัวเอียง',
        '.ql-underline': 'ขีดเส้นใต้',
        '.ql-strike': 'ขีดทับ',
        '.ql-link': 'แทรกลิงก์',
        '.ql-clean': 'ล้างรูปแบบ',
        '.ql-color .ql-picker-label': 'สีตัวอักษร',
        '.ql-background .ql-picker-label': 'สีพื้นหลัง',
        '.ql-list[value="ordered"]': 'รายการตัวเลข',
        '.ql-list[value="bullet"]': 'รายการหัวข้อ',
        '.ql-align .ql-picker-label': 'จัดแนว',
        '.ql-header .ql-picker-label': 'หัวข้อ',
      }
      Object.entries(titles).forEach(([selector, title]) => {
        toolbar.querySelectorAll(selector).forEach(element => element.setAttribute('title', title))
      })
    }, 150)
    return () => clearTimeout(timer)
  }, [view, selected])

  const selectTemplate = (template) => {
    setSelected(template.template_key)
    setDraft({ subject: template.subject || '', body_html: template.body_html || '' })
    setOriginal({ subject: template.subject || '', body_html: template.body_html || '' })
    setView('editor')
  }

  const insertVariable = (variable) => {
    const token = `{{${variable}}}`
    const quill = quillRef.current?.getEditor()
    if (quill) {
      const range = quill.getSelection(true)
      quill.insertText(range.index, token)
      quill.setSelection(range.index + token.length)
      return
    }
    setDraft(prev => ({ ...prev, body_html: `${prev.body_html}${token}` }))
  }

  const handleSave = async () => {
    if (!selected) return
    if (!draft.subject.trim() || !draft.body_html.trim()) {
      toast.error('กรุณากรอก Subject และเนื้อหาอีเมล')
      return
    }
    setSaving(true)
    try {
      const payload = {
        subject: draft.subject.trim(),
        body_html: draft.body_html,
      }
      await settingsService.updateTemplate(selected, payload)
      setOriginal(payload)
      setDraft(payload)
      setTemplates(prev => prev.map(template =>
        template.template_key === selected
          ? { ...template, ...payload, updated_at: new Date().toISOString() }
          : template
      ))
      toast.success('บันทึก Email Template แล้ว')
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => setDraft({ ...original })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">กำลังโหลด...</p>
      </div>
    )
  }

  if (!templates.length) {
    return (
      <div className="max-w-5xl">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="max-w-7xl space-y-6">
      <header className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">Admin Settings</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">จัดการ Email Templates</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            เทมเพลตเหล่านี้ทำงานร่วมกับค่าการแจ้งเตือนในหน้า Settings เช่น expiry warning days และ trash retention days
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-full sm:min-w-[360px] xl:min-w-[420px]">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">Templates</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{templates.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">ตัวแปรที่ใช้ได้</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{variables.length}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5">
        <aside className="space-y-4">
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
            <div className="px-2 py-2">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">เลือก Template</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">แต่ละรายการผูกกับ automation ของระบบ</p>
            </div>
            <div className="space-y-2 mt-2">
              {templates.map(template => {
                const itemMeta = TEMPLATE_META[template.template_key] || {
                  label: template.template_key,
                  shortLabel: template.template_key,
                  description: template.description,
                  tone: 'amber',
                }
                const active = selected === template.template_key

                return (
                  <button
                    key={template.template_key}
                    onClick={() => selectTemplate(template)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      active
                        ? 'border-primary-200 bg-primary-50 text-primary-900 dark:border-primary-800 dark:bg-primary-900/25 dark:text-primary-100'
                        : 'border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <TemplateIcon tone={itemMeta.tone} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{itemMeta.label}</p>
                        <p className="text-xs opacity-75 mt-1 leading-relaxed">{itemMeta.description}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">แก้ไขล่าสุด: {formatUpdatedAt(template.updated_at)}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </aside>

        <main className="min-w-0 space-y-4">
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <TemplateIcon tone={meta.tone} />
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100">{meta.label}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedTemplate?.description || meta.description}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                  {[
                    { value: 'editor', label: 'แก้ไข' },
                    { value: 'preview', label: 'Preview' },
                  ].map(item => (
                    <button
                      key={item.value}
                      onClick={() => setView(item.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        view === item.value
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {isDirty && (
                  <div className="flex gap-2">
                    <button onClick={handleReset} className="btn-secondary text-sm">
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-700 hover:bg-primary-800 transition-colors disabled:opacity-60"
                    >
                      {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {view === 'editor' ? (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 p-5">
                <div className="min-w-0 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Subject</label>
                      <span className="text-[11px] text-slate-400">{draft.subject.length} ตัวอักษร</span>
                    </div>
                    <input
                      type="text"
                      value={draft.subject}
                      onChange={event => setDraft(prev => ({ ...prev, subject: event.target.value }))}
                      className="input-field"
                      placeholder="หัวเรื่องอีเมล"
                    />
                  </div>

                  <div className="email-template-editor rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">เนื้อหาอีเมล</p>
                    </div>
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={draft.body_html}
                      onChange={value => setDraft(prev => ({ ...prev, body_html: value }))}
                      modules={modules}
                      className="bg-white dark:bg-slate-950"
                      style={{ height: '420px', marginBottom: '42px' }}
                    />
                  </div>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 p-4">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">ตัวแปร</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">คลิกเพื่อแทรกลงในตำแหน่ง cursor</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {variables.map(variable => (
                        <button
                          key={variable}
                          onClick={() => insertVariable(variable)}
                          title={VAR_DESCRIPTIONS[variable] || variable}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary-300 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                        >
                          {`{{${variable}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">ข้อมูลตัวอย่าง</p>
                    <div className="mt-3 space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                      {variables.map(variable => (
                        <div key={variable} className="text-xs">
                          <p className="font-semibold text-slate-600 dark:text-slate-300">{variable}</p>
                          <p className="text-slate-400 dark:text-slate-500 truncate">{exampleVars[variable] || VAR_DESCRIPTIONS[variable] || '-'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2">Subject ที่ผู้รับจะเห็น</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{previewSubject}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-4 md:p-6">
                  <div className="bg-white rounded-xl shadow-sm mx-auto overflow-hidden" style={{ maxWidth: '640px' }}>
                    <iframe
                      srcDoc={previewHtml}
                      title="email preview"
                      className="w-full"
                      style={{ height: 540, border: 'none' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .email-template-editor .ql-toolbar.ql-snow {
          border: none;
          border-bottom: 1px solid rgb(226 232 240);
          padding: 10px 16px;
        }
        .dark .email-template-editor .ql-toolbar.ql-snow {
          border-bottom-color: rgb(30 41 59);
          background: rgb(15 23 42);
        }
        .email-template-editor .ql-container.ql-snow {
          border: none;
          font-family: inherit;
          font-size: 14px;
        }
        .dark .email-template-editor .ql-container.ql-snow {
          color: rgb(226 232 240);
        }
        .dark .email-template-editor .ql-editor.ql-blank::before {
          color: rgb(100 116 139);
        }
        .dark .email-template-editor .ql-picker,
        .dark .email-template-editor .ql-stroke {
          color: rgb(203 213 225);
          stroke: rgb(203 213 225);
        }
        .dark .email-template-editor .ql-fill {
          fill: rgb(203 213 225);
        }
      `}} />
    </div>
  )
}

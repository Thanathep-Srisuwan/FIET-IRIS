import { useEffect, useState, useRef } from 'react'
import { settingsService } from '../../services/api'
import toast from 'react-hot-toast'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const TEMPLATE_META = {
  expiry_warning:  { label: 'แจ้งเตือนใกล้หมดอายุ',  icon: '⚠️' },
  permanent_delete: { label: 'แจ้งเตือนลบถาวร',       icon: '🗑️' },
}

const EXAMPLE_VARS = {
  expiry_warning: {
    name: 'สมชาย ใจดี', docTitle: 'ใบรับรอง RI ปี 2567', docType: 'RI',
    expireDate: '15 มิถุนายน 2568', daysRemaining: '45',
    system_name: 'FIET-IRIS', org_name: 'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี มจธ.', clientUrl: 'https://iris.fiet.kmutt.ac.th',
  },
  permanent_delete: {
    name: 'สมหญิง รักดี', docTitle: 'ใบรับรอง IRB โครงการวิจัย', docType: 'IRB',
    reason: 'อยู่ในถังขยะนานเกิน 30 วัน', deletedBy: 'ระบบอัตโนมัติ',
    system_name: 'FIET-IRIS', org_name: 'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี มจธ.',
  },
}

const renderPreview = (html, vars) =>
  html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `<span style="color:#ef4444">{{${key}}}</span>`)

const VAR_DESCRIPTIONS = {
  name: 'ชื่อ-นามสกุล ของผู้รับอีเมล',
  docTitle: 'ชื่อของเอกสารหรือใบประกาศ',
  docType: 'ประเภทของเอกสาร เช่น RI, IRB, หรืออื่นๆ',
  expireDate: 'วันที่เอกสารจะหมดอายุ',
  daysRemaining: 'จำนวนวันที่เหลือก่อนหมดอายุ',
  reason: 'เหตุผลในการดำเนินการ (เช่น เหตุผลที่ลบเอกสาร)',
  deletedBy: 'ชื่อผู้ที่ดำเนินการลบเอกสาร',
  system_name: 'ชื่อระบบ',
  org_name: 'ชื่อหน่วยงาน/คณะ',
  clientUrl: 'ลิงก์สำหรับเข้าสู่หน้าเว็บไซต์',
}

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [selected,  setSelected]  = useState(null)
  const [draft,     setDraft]     = useState({ subject: '', body_html: '' })
  const [original,  setOriginal]  = useState({ subject: '', body_html: '' })
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [tab,       setTab]       = useState('edit')
  
  const quillRef = useRef(null)

  useEffect(() => {
    settingsService.getTemplates()
      .then(r => {
        setTemplates(r.data)
        if (r.data.length) selectTemplate(r.data[0])
      })
      .catch(() => toast.error('โหลด template ไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [])

  const selectTemplate = (tmpl) => {
    setSelected(tmpl.template_key)
    setDraft({ subject: tmpl.subject, body_html: tmpl.body_html })
    setOriginal({ subject: tmpl.subject, body_html: tmpl.body_html })
    setTab('edit')
  }

  const isDirty = draft.subject !== original.subject || draft.body_html !== original.body_html

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await settingsService.updateTemplate(selected, draft)
      setOriginal({ ...draft })
      setTemplates(prev => prev.map(t =>
        t.template_key === selected ? { ...t, ...draft } : t
      ))
      toast.success('บันทึก template เรียบร้อย')
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setDraft({ ...original })
  }

  useEffect(() => {
    if (tab !== 'edit') return
    const timer = setTimeout(() => {
      const toolbar = document.querySelector('.quill-editor-container .ql-toolbar')
      if (!toolbar) return
      const titles = {
        '.ql-bold':                      'ตัวหนา (Bold)',
        '.ql-italic':                    'ตัวเอียง (Italic)',
        '.ql-underline':                 'ขีดเส้นใต้ (Underline)',
        '.ql-strike':                    'ขีดทับ (Strikethrough)',
        '.ql-link':                      'แทรกลิงก์ (Link)',
        '.ql-clean':                     'ล้างการจัดรูปแบบ (Clear Formatting)',
        '.ql-color .ql-picker-label':    'สีตัวอักษร (Text Color)',
        '.ql-background .ql-picker-label': 'สีพื้นหลัง (Background Color)',
        '.ql-list[value="ordered"]':     'รายการตัวเลข (Ordered List)',
        '.ql-list[value="bullet"]':      'รายการหัวข้อ (Bullet List)',
        '.ql-align .ql-picker-label':    'การจัดวางข้อความ (Align)',
        '.ql-header .ql-picker-label':   'รูปแบบหัวข้อ (Heading)',
      }
      Object.entries(titles).forEach(([sel, title]) =>
        toolbar.querySelectorAll(sel).forEach(el => el.setAttribute('title', title))
      )
    }, 150)
    return () => clearTimeout(timer)
  }, [tab, selected])

  const insertVariable = (v) => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return
    
    const range = quill.getSelection(true)
    quill.insertText(range.index, `{{${v}}}`)
    quill.setSelection(range.index + v.length + 4)
  }

  const exampleVars  = EXAMPLE_VARS[selected] || {}
  const previewHtml  = renderPreview(draft.body_html, exampleVars)
  const previewSubject = renderPreview(draft.subject, exampleVars)

  const variables = (() => {
    const tmpl = templates.find(t => t.template_key === selected)
    if (!tmpl?.variables) return []
    try { return JSON.parse(tmpl.variables) } catch { return [] }
  })()

  // Quill Modules configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'clean'],
    ],
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400 text-sm">กำลังโหลด...</p>
    </div>
  )

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>ผู้ดูแลระบบ</p>
        <h1 className="text-2xl font-bold text-slate-800">จัดการ Email Template</h1>
      </div>

      <div className="flex gap-5">
        {/* Left: template list */}
        <div className="w-56 flex-shrink-0 space-y-2">
          {templates.map(tmpl => {
            const meta = TEMPLATE_META[tmpl.template_key] || {}
            return (
              <button key={tmpl.template_key}
                onClick={() => selectTemplate(tmpl)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  selected === tmpl.template_key
                    ? 'border-transparent text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                style={selected === tmpl.template_key
                  ? { background: 'linear-gradient(135deg,#42b5e1,#1262a0)' }
                  : {}}>
                <p className="text-base mb-0.5">{meta.icon || '📧'}</p>
                <p className="text-sm font-semibold leading-snug">{meta.label || tmpl.template_key}</p>
              </button>
            )
          })}
        </div>

        {/* Right: editor */}
        {selected ? (
          <div className="flex-1 min-w-0 space-y-4">
            {/* Tabs */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                {['edit', 'preview'].map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    {t === 'edit' ? '✏️ แก้ไขเนื้อหา' : '👁️ ตัวอย่าง'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {isDirty && (
                  <>
                    <button onClick={handleReset}
                      className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                      ยกเลิก
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="px-4 py-1.5 text-sm rounded-lg text-white font-semibold disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#42b5e1,#1262a0)' }}>
                      {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {tab === 'edit' ? (
              <div className="space-y-4">
                {/* Subject */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    หัวเรื่องอีเมล (Subject)
                  </label>
                  <input
                    type="text"
                    value={draft.subject}
                    onChange={e => setDraft(p => ({ ...p, subject: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
                    placeholder="กรอกหัวเรื่อง..."
                  />
                </div>

                {/* Variables Bar */}
                {variables.length > 0 && (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      คลิกเพื่อแทรกตัวแปรลงในเนื้อหา
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {variables.map(v => (
                        <button key={v}
                          onClick={() => insertVariable(v)}
                          title={VAR_DESCRIPTIONS[v] || v}
                          className="px-2.5 py-1 text-xs font-medium rounded-full bg-white border border-slate-200 text-slate-600 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-all shadow-sm">
                          <span className="text-sky-400 mr-1">+</span> {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Body Editor */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden quill-editor-container">
                  <div className="px-4 pt-4 border-b border-slate-100 bg-white">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      เนื้อหาอีเมล (Content)
                    </label>
                  </div>
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={draft.body_html}
                    onChange={val => setDraft(p => ({ ...p, body_html: val }))}
                    modules={modules}
                    className="bg-white"
                    style={{ height: '400px', marginBottom: '42px' }}
                  />
                </div>
                
                <style dangerouslySetInnerHTML={{ __html: `
                  .quill-editor-container .ql-toolbar.ql-snow {
                    border: none;
                    border-bottom: 1px solid #f1f5f9;
                    padding: 8px 16px;
                  }
                  .quill-editor-container .ql-container.ql-snow {
                    border: none;
                    font-family: inherit;
                    font-size: 14px;
                  }
                `}} />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview subject */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">หัวเรื่องที่ผู้รับจะเห็น</p>
                  <p className="text-base font-semibold text-slate-800">{previewSubject}</p>
                </div>

                {/* Preview body */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">ตัวอย่างอีเมล (Preview)</p>
                  <div className="border border-slate-100 rounded-lg overflow-hidden bg-gray-50 p-4">
                    <div className="bg-white shadow-sm rounded-lg mx-auto overflow-hidden" style={{ maxWidth: '600px' }}>
                      <iframe
                        srcDoc={previewHtml}
                        title="email preview"
                        className="w-full"
                        style={{ height: 500, border: 'none' }}
                      />
                    </div>
                  </div>
                  <p className="text-center text-xs text-slate-400 mt-4">* นี่คือการแสดงผลจำลองโดยใช้ข้อมูลตัวอย่าง</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300 text-sm italic">
            เลือกเทมเพลตที่ต้องการแก้ไขจากรายการด้านซ้าย
          </div>
        )}
      </div>
    </div>
  )
}

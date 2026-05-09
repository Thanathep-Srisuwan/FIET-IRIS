import { useEffect, useState } from 'react'
import { settingsService } from '../../services/api'
import toast from 'react-hot-toast'

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

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [selected,  setSelected]  = useState(null)
  const [draft,     setDraft]     = useState({ subject: '', body_html: '' })
  const [original,  setOriginal]  = useState({ subject: '', body_html: '' })
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [tab,       setTab]       = useState('edit')

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

  const exampleVars  = EXAMPLE_VARS[selected] || {}
  const previewHtml  = renderPreview(draft.body_html, exampleVars)
  const previewSubject = renderPreview(draft.subject, exampleVars)

  const variables = (() => {
    const tmpl = templates.find(t => t.template_key === selected)
    if (!tmpl?.variables) return []
    try { return JSON.parse(tmpl.variables) } catch { return [] }
  })()

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
                <p className={`text-xs mt-0.5 font-mono ${selected === tmpl.template_key ? 'text-white/60' : 'text-slate-400'}`}>
                  {tmpl.template_key}
                </p>
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
                    {t === 'edit' ? '✏️ แก้ไข' : '👁️ ตัวอย่าง'}
                  </button>
                ))}
              </div>
              {isDirty && (
                <div className="flex gap-2">
                  <button onClick={handleReset}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                    ยกเลิก
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-1.5 text-sm rounded-lg text-white font-semibold disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#42b5e1,#1262a0)' }}>
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              )}
            </div>

            {tab === 'edit' ? (
              <div className="space-y-4">
                {/* Subject */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    หัวเรื่อง (Subject)
                  </label>
                  <input
                    type="text"
                    value={draft.subject}
                    onChange={e => setDraft(p => ({ ...p, subject: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                    onFocus={e => e.target.style.boxShadow = '0 0 0 2px #42b5e140'}
                    onBlur={e => e.target.style.boxShadow = ''}
                  />
                </div>

                {/* Body */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                      เนื้อหา (HTML)
                    </label>
                    <span className="text-xs text-slate-400">{draft.body_html.length} ตัวอักษร</span>
                  </div>
                  <textarea
                    value={draft.body_html}
                    onChange={e => setDraft(p => ({ ...p, body_html: e.target.value }))}
                    rows={18}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none resize-y"
                    onFocus={e => e.target.style.boxShadow = '0 0 0 2px #42b5e140'}
                    onBlur={e => e.target.style.boxShadow = ''}
                  />
                </div>

                {/* Variables */}
                {variables.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                      ตัวแปรที่ใช้ได้
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {variables.map(v => (
                        <button key={v}
                          onClick={() => {
                            const cursor = `{{${v}}}`
                            setDraft(p => ({ ...p, body_html: p.body_html + cursor }))
                          }}
                          className="px-2 py-1 text-xs font-mono rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors">
                          {'{{' + v + '}}'}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">คลิกเพื่อแทรกตัวแปรต่อท้าย body_html</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview subject */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">หัวเรื่อง (ตัวอย่าง)</p>
                  <p className="text-sm text-slate-800">{previewSubject}</p>
                </div>

                {/* Preview body */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">เนื้อหา (ตัวอย่าง)</p>
                  <div className="border border-dashed border-slate-200 rounded-lg overflow-hidden">
                    <iframe
                      srcDoc={previewHtml}
                      title="email preview"
                      className="w-full"
                      style={{ height: 420, border: 'none' }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">* ใช้ข้อมูลตัวอย่างในการแสดงตัวอย่าง</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300 text-sm">
            เลือก template ทางซ้าย
          </div>
        )}
      </div>
    </div>
  )
}

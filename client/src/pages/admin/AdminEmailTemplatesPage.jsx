import { useEffect, useMemo, useRef, useState } from 'react'
import ReactQuill from 'react-quill'
import toast from 'react-hot-toast'
import { settingsService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import 'react-quill/dist/quill.snow.css'
import { Trash2, AlertTriangle, Mail } from 'lucide-react'

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
  const { t } = useLanguage()
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto mb-4 flex items-center justify-center text-slate-400">
        <Mail size={32} />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('adminEmailTemplates.emptyTitle')}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('adminEmailTemplates.emptyDesc')}</p>
    </div>
  )
}

export default function AdminEmailTemplatesPage() {
  const { t, locale } = useLanguage()
  const [templates, setTemplates] = useState([])
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState({ subject: '', body_html: '' })
  const [original, setOriginal] = useState({ subject: '', body_html: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('editor')
  const quillRef = useRef(null)

  const TEMPLATE_META = useMemo(() => ({
    expiry_warning: {
      label: t('adminEmailTemplates.expiryWarningLabel'),
      shortLabel: t('adminEmailTemplates.expiryWarningShort'),
      description: t('adminEmailTemplates.expiryWarningDesc'),
      tone: 'amber',
    },
    permanent_delete: {
      label: t('adminEmailTemplates.permanentDeleteLabel'),
      shortLabel: t('adminEmailTemplates.permanentDeleteShort'),
      description: t('adminEmailTemplates.permanentDeleteDesc'),
      tone: 'red',
    },
  }), [t])

  const VAR_DESCRIPTIONS = useMemo(() => ({
    name: t('adminEmailTemplates.varName'),
    docTitle: t('adminEmailTemplates.varDocTitle'),
    docType: t('adminEmailTemplates.varDocType'),
    expireDate: t('adminEmailTemplates.varExpireDate'),
    daysRemaining: t('adminEmailTemplates.varDaysRemaining'),
    reason: t('adminEmailTemplates.varReason'),
    deletedBy: t('adminEmailTemplates.varDeletedBy'),
    system_name: t('adminEmailTemplates.varSystemName'),
    org_name: t('adminEmailTemplates.varOrgName'),
    clientUrl: t('adminEmailTemplates.varClientUrl'),
  }), [t])

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
  const exampleVars = useMemo(() => ({
    expiry_warning: {
      name: t('adminEmailTemplates.exampleExpiryName'),
      docTitle: t('adminEmailTemplates.exampleExpiryDocTitle'),
      docType: 'RI',
      expireDate: t('adminEmailTemplates.exampleExpiryDate'),
      daysRemaining: '45',
      system_name: 'FIET-IRIS',
      org_name: t('adminEmailTemplates.exampleOrgName'),
      clientUrl: 'https://iris.fiet.kmutt.ac.th',
    },
    permanent_delete: {
      name: t('adminEmailTemplates.exampleDeleteName'),
      docTitle: t('adminEmailTemplates.exampleDeleteDocTitle'),
      docType: 'IRB',
      reason: t('adminEmailTemplates.exampleDeleteReason'),
      deletedBy: t('adminEmailTemplates.exampleDeletedBy'),
      system_name: 'FIET-IRIS',
      org_name: t('adminEmailTemplates.exampleOrgName'),
    },
  }), [t])[selected] || {}
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
      .catch(() => toast.error(t('adminEmailTemplates.loadFailed')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (view !== 'editor') return
    const timer = setTimeout(() => {
      const toolbar = document.querySelector('.email-template-editor .ql-toolbar')
      if (!toolbar) return
      const titles = {
        '.ql-bold': t('adminEmailTemplates.toolBold'),
        '.ql-italic': t('adminEmailTemplates.toolItalic'),
        '.ql-underline': t('adminEmailTemplates.toolUnderline'),
        '.ql-strike': t('adminEmailTemplates.toolStrike'),
        '.ql-link': t('adminEmailTemplates.toolLink'),
        '.ql-clean': t('adminEmailTemplates.toolClean'),
        '.ql-color .ql-picker-label': t('adminEmailTemplates.toolColor'),
        '.ql-background .ql-picker-label': t('adminEmailTemplates.toolBackground'),
        '.ql-list[value="ordered"]': t('adminEmailTemplates.toolOrderedList'),
        '.ql-list[value="bullet"]': t('adminEmailTemplates.toolBulletList'),
        '.ql-align .ql-picker-label': t('adminEmailTemplates.toolAlign'),
        '.ql-header .ql-picker-label': t('adminEmailTemplates.toolHeader'),
      }
      Object.entries(titles).forEach(([selector, title]) => {
        toolbar.querySelectorAll(selector).forEach(element => element.setAttribute('title', title))
      })
    }, 150)
    return () => clearTimeout(timer)
  }, [view, selected, t])

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
      toast.error(t('adminEmailTemplates.validateError'))
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
      toast.success(t('adminEmailTemplates.saveSuccess'))
    } catch {
      toast.error(t('adminEmailTemplates.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => setDraft({ ...original })

  const formatUpdatedAt = (value) => {
    if (!value) return t('adminEmailTemplates.neverEdited')
    return new Date(value).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">{t('common.loading')}</p>
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
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">{t('adminEmailTemplates.eyebrow')}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('adminEmailTemplates.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('adminEmailTemplates.desc')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-full sm:min-w-[360px] xl:min-w-[420px]">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">{t('adminEmailTemplates.statTemplates')}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{templates.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">{t('adminEmailTemplates.statVariables')}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{variables.length}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5">
        <aside className="space-y-4">
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
            <div className="px-2 py-2">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('adminEmailTemplates.sidebarTitle')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('adminEmailTemplates.sidebarDesc')}</p>
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
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                          {t('adminEmailTemplates.lastEdited', { date: formatUpdatedAt(template.updated_at) })}
                        </p>
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
                    { value: 'editor', label: t('adminEmailTemplates.tabEdit') },
                    { value: 'preview', label: t('adminEmailTemplates.tabPreview') },
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
                      {t('adminEmailTemplates.cancelBtn')}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-700 hover:bg-primary-800 transition-colors disabled:opacity-60"
                    >
                      {saving ? t('adminEmailTemplates.savingBtn') : t('adminEmailTemplates.saveBtn')}
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
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">{t('adminEmailTemplates.subjectLabel')}</label>
                      <span className="text-[11px] text-slate-400">{t('adminEmailTemplates.subjectChars', { count: draft.subject.length })}</span>
                    </div>
                    <input
                      type="text"
                      value={draft.subject}
                      onChange={event => setDraft(prev => ({ ...prev, subject: event.target.value }))}
                      className="input-field"
                      placeholder={t('adminEmailTemplates.subjectPlaceholder')}
                    />
                  </div>

                  <div className="email-template-editor rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{t('adminEmailTemplates.bodyLabel')}</p>
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
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('adminEmailTemplates.variablesTitle')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('adminEmailTemplates.variablesDesc')}</p>
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
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('adminEmailTemplates.exampleTitle')}</p>
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
                  <p className="text-xs font-semibold text-slate-400 mb-2">{t('adminEmailTemplates.previewSubjectLabel')}</p>
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

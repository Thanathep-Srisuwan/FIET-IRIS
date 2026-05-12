import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { settingsService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'

const SETTINGS = [
  { key: 'expiry warning days', labelKey: 'adminSettings.expiryWarningDays', type: 'number', placeholder: '90', min: 7, max: 365 },
  { key: 'trash retention days', labelKey: 'adminSettings.trashRetentionDays', type: 'number', placeholder: '30', min: 1, max: 180 },
]

export default function AdminSettingsPage() {
  const { t } = useLanguage()
  const [settings, setSettings] = useState({})
  const [draft, setDraft] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const dirty = useMemo(() => SETTINGS.some(item => settings[item.key] !== draft[item.key]), [settings, draft])

  useEffect(() => {
    settingsService.getAll()
      .then(({ data }) => {
        const map = {}
        data.forEach(item => { map[item.setting_key] = item.setting_value })
        setSettings(map)
        setDraft(map)
      })
      .catch(() => toast.error(t('adminSettings.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  const handleChange = (key, value) => setDraft(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = Object.entries(draft)
        .filter(([key, value]) => settings[key] !== value)
        .map(([key, value]) => ({ key, value }))

      if (!payload.length) {
        toast(t('adminSettings.noChanges'))
        setSaving(false)
        return
      }

      await settingsService.bulkUpdate(payload)
      setSettings({ ...draft })
      toast.success(t('adminSettings.saveSuccess'))
    } catch {
      toast.error(t('adminSettings.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => setDraft({ ...settings })

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-slate-400">{t('common.loading')}</p>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest" style={{ color: '#42b5e1' }}>{t('roles.admin')}</p>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('adminSettings.title')}</h1>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('adminSettings.autoGroup')}</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {SETTINGS.map(item => {
            const value = draft[item.key] ?? ''
            return (
              <div key={item.key} className="flex items-center gap-6 px-6 py-4">
                <div className="w-52 flex-shrink-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t(item.labelKey)}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">{item.key}</p>
                </div>
                <div className="flex-1">
                  <input
                    type={item.type}
                    value={value}
                    min={item.min}
                    max={item.max}
                    placeholder={item.placeholder}
                    onChange={e => handleChange(item.key, e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    style={{ '--tw-ring-color': '#42b5e1' }}
                  />
                  {settings[item.key] !== value && (
                    <p className="mt-1 text-xs text-amber-600">{t('adminSettings.originalValue', { value: settings[item.key] })}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <p className="mb-1 font-semibold text-blue-800">{t('adminSettings.noteTitle')}</p>
        <ul className="space-y-1 text-xs text-blue-700">
          <li>• {t('adminSettings.note1')}</li>
          <li>• {t('adminSettings.note2')}</li>
          <li>• {t('adminSettings.note3')}</li>
        </ul>
      </div>

      {dirty && (
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={handleReset} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900">
            {t('common.cancel')}
          </button>
          <button onClick={handleSave} disabled={saving} className="rounded-xl px-6 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60" style={{ backgroundColor: '#1262a0' }}>
            {saving ? t('common.saving') : t('adminSettings.saveChanges')}
          </button>
        </div>
      )}
    </div>
  )
}

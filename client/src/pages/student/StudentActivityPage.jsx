import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, FileText, History, Loader2, UploadCloud } from 'lucide-react'
import { documentService, notificationService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'

const eventIcon = {
  created: FileText,
  file_version_uploaded: UploadCloud,
}

const eventKey = {
  created: 'studentActivity.create',
  file_version_uploaded: 'studentActivity.upload',
  trashed: 'studentActivity.delete',
  restored: 'studentActivity.restore',
  approved: 'studentActivity.approve',
  updated: 'studentActivity.update',
  notification: 'studentActivity.notification',
}

function ActivityItem({ item, locale, t }) {
  const Icon = eventIcon[item.event_type] || (item.event_type === 'notification' ? Bell : History)
  const label = t(eventKey[item.event_type] || 'studentActivity.timeline')

  return (
    <Link to="/documents" className="group flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-primary-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.title || label}</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            {label}
          </span>
        </div>
        {item.doc_title && <p className="mt-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{item.doc_title}</p>}
        {item.detail && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.detail}</p>}
        <p className="mt-2 text-[11px] text-slate-400">
          {item.created_at ? new Date(item.created_at).toLocaleString(locale) : ''}
          {item.actor_name ? ` · ${item.actor_name}` : ''}
        </p>
      </div>
    </Link>
  )
}

export default function StudentActivityPage() {
  const { locale, t } = useLanguage()
  const [notifications, setNotifications] = useState([])
  const [timelines, setTimelines] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: docsData }, { data: notifData }] = await Promise.all([
          documentService.getAll({ limit: 25, sort_by: 'created_at', sort_dir: 'desc' }),
          notificationService.getAll(),
        ])
        const documents = docsData.documents || []
        setNotifications(notifData || [])

        const detailResults = await Promise.allSettled(
          documents.slice(0, 12).map(doc => documentService.getById(doc.doc_id))
        )
        const timelineItems = detailResults.flatMap(result => {
          if (result.status !== 'fulfilled') return []
          const doc = result.value.data
          return (doc.timeline || []).map(item => ({
            ...item,
            doc_title: doc.title,
          }))
        })
        setTimelines(timelineItems)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activities = useMemo(() => {
    const notifActivities = notifications.map(item => ({
      timeline_id: `notif-${item.notif_id}`,
      event_type: 'notification',
      title: t('studentActivity.notification'),
      detail: item.message,
      doc_title: item.doc_title,
      created_at: item.created_at,
    }))

    return [...timelines, ...notifActivities]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 40)
  }, [notifications, timelines, t])

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">{t('studentActivity.eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{t('studentActivity.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('studentActivity.desc')}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white p-12 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950">
          <Loader2 size={18} className="animate-spin" />
          {t('common.loading')}
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-950">
          <History size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{t('studentActivity.emptyTitle')}</p>
          <p className="mt-1 text-sm text-slate-400">{t('studentActivity.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(item => (
            <ActivityItem key={item.timeline_id || `${item.event_type}-${item.created_at}-${item.doc_title}`} item={item} locale={locale} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { AlertCircle, AlertTriangle, Bell, Calendar, CheckCheck, Clock, ExternalLink, Megaphone, RefreshCw, Trash2, X } from 'lucide-react'
import { announcementService, documentService, notificationService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'

const docTypeColor = {
  expiry_warning: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  expired: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  deleted: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700',
  replaced: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
}

const announcementColorClass = 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'

const docTypeIcon = (type) => {
  const iconProps = { size: 20, strokeWidth: 2 }
  if (type === 'expiry_warning') return <AlertTriangle {...iconProps} />
  if (type === 'expired') return <AlertCircle {...iconProps} />
  if (type === 'deleted') return <Trash2 {...iconProps} />
  if (type === 'replaced') return <RefreshCw {...iconProps} />
  return <Bell {...iconProps} />
}

function renderWithLinks(text) {
  if (!text) return null
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="break-all text-blue-600 underline hover:text-blue-800 dark:text-primary-400 dark:hover:text-primary-300" onClick={e => e.stopPropagation()}>
        {part}
      </a>
    ) : part
  )
}

function AnnouncementModal({ item, locale, t, onClose }) {
  if (!item) return null
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/30">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
              <Bell size={24} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-snug text-slate-800 dark:text-slate-100">{item.title}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <Calendar size={14} strokeWidth={2.5} />
                {new Date(item.created_at).toLocaleString(locale, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-6">
          {item.image_url && (
            <div className="relative mb-6 min-h-[200px] w-full overflow-hidden border border-slate-100 bg-slate-100 shadow-md dark:border-slate-800 dark:bg-slate-800">
              <div className="absolute inset-0 scale-125 opacity-20 blur-3xl">
                <img src={item.image_url} alt="" className="h-full w-full object-cover" />
              </div>
              <img src={item.image_url} alt={item.title} className="relative z-10 mx-auto h-auto max-h-[800px] w-full object-contain shadow-sm" />
            </div>
          )}
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{renderWithLinks(item.content)}</div>
        </div>

        {item.link_url && (
          <div className="border-t border-slate-100 bg-white px-6 pb-4 pt-2 dark:border-slate-800 dark:bg-slate-900">
            <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2.5 rounded-2xl py-3 text-[15px] font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98]" style={{ backgroundColor: '#1262a0' }} onClick={e => e.stopPropagation()}>
              <ExternalLink size={20} strokeWidth={2} />
              {t('common.viewMoreDetails')}
            </a>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30">
          <button onClick={onClose} className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function DocumentNotificationModal({ item, loading, locale, t, onClose }) {
  if (!item) return null
  const fields = [
    [t('common.documentType'), item.doc_type],
    [t('common.owner'), item.owner_name],
    [t('common.email'), item.owner_email],
    [t('dashboard.tableExpire'), item.no_expire ? t('common.noExpire') : (item.expire_date ? new Date(item.expire_date).toLocaleDateString(locale) : '-')],
  ]

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/30">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">{t('notifications.documentDetails')}</p>
            <h2 className="mt-1 truncate text-lg font-bold text-slate-800 dark:text-slate-100">{item.title || item.doc_title || t('common.loading')}</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm font-medium text-slate-400">{t('common.loadingDetails')}</div>
        ) : (
          <div className="space-y-4 overflow-y-auto px-6 py-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <p className="text-xs font-bold text-slate-400">{label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{value || '-'}</p>
                </div>
              ))}
            </div>

            {(item.description || item.message) && (
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="text-xs font-bold text-slate-400">{t('notifications.description')}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">{item.description || item.message}</p>
              </div>
            )}

            {item.files?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-slate-400">{t('common.fileAttachments')}</p>
                <div className="space-y-2">
                  {item.files.map(file => (
                    <div key={file.file_id} className="rounded-2xl border border-slate-100 bg-white px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      {file.file_name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default function NotificationPanel({ onCountChange }) {
  const { locale, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedAnn, setSelectedAnn] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [selectedDocLoading, setSelectedDocLoading] = useState(false)
  const [badgeCount, setBadgeCount] = useState(0)
  const panelRef = useRef(null)

  const loadBadgeCount = async () => {
    try {
      const [nRes, aRes] = await Promise.all([
        notificationService.getUnread().catch(() => ({ data: [] })),
        announcementService.getAll().catch(() => ({ data: [] })),
      ])
      const docUnread = Array.isArray(nRes.data) ? nRes.data.length : 0
      const annUnread = (aRes.data || []).filter(item => !item.is_read).length
      const total = docUnread + annUnread
      setBadgeCount(total)
      onCountChange?.(total)
    } catch {}
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [nRes, aRes] = await Promise.all([notificationService.getAll(), announcementService.getAll()])
      const fetchedNotifs = nRes.data || []
      const fetchedAnn = aRes.data || []
      setNotifs(fetchedNotifs)
      setAnnouncements(fetchedAnn)
      const total = fetchedNotifs.filter(item => !item.in_app_read).length + fetchedAnn.filter(item => !item.is_read).length
      setBadgeCount(total)
      onCountChange?.(total)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadBadgeCount()
    const interval = setInterval(loadBadgeCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (open) fetchAll()
  }, [open])

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleMarkDocRead = async (id) => {
    try {
      await notificationService.markRead(id)
      setNotifs(prev => prev.map(item => item.notif_id === id ? { ...item, in_app_read: true } : item))
    } catch { toast.error(t('common.error')) }
  }

  const handleMarkAnnRead = async (id) => {
    try {
      await announcementService.markRead(id)
      setAnnouncements(prev => prev.map(item => item.announcement_id === id ? { ...item, is_read: true } : item))
    } catch { toast.error(t('common.error')) }
  }

  const handleAnnClick = (item) => {
    setOpen(false)
    setSelectedAnn(item)
    if (!item.is_read) handleMarkAnnRead(item.announcement_id)
  }

  const handleDocClick = async (item) => {
    setOpen(false)
    if (!item.in_app_read) handleMarkDocRead(item.notif_id)
    setSelectedDoc(item)
    setSelectedDocLoading(true)
    try {
      const { data } = await documentService.getById(item.doc_id)
      setSelectedDoc({ ...item, ...data })
    } catch {
      setSelectedDoc(item)
    } finally {
      setSelectedDocLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await Promise.all([notificationService.markAllRead(), announcementService.markAllRead()])
      setNotifs(prev => prev.map(item => ({ ...item, in_app_read: true })))
      setAnnouncements(prev => prev.map(item => ({ ...item, is_read: true })))
      setBadgeCount(0)
      onCountChange?.(0)
      toast.success(t('notifications.markReadSuccess'))
    } catch { toast.error(t('common.error')) }
  }

  const unreadCount = notifs.filter(item => !item.in_app_read).length + announcements.filter(item => !item.is_read).length
  const merged = [
    ...notifs.map(item => ({ ...item, _kind: 'doc' })),
    ...announcements.map(item => ({ ...item, _kind: 'announcement' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <>
      <AnnouncementModal item={selectedAnn} locale={locale} t={t} onClose={() => setSelectedAnn(null)} />
      <DocumentNotificationModal item={selectedDoc} loading={selectedDocLoading} locale={locale} t={t} onClose={() => setSelectedDoc(null)} />

      <div className="relative" ref={panelRef}>
        <button onClick={() => setOpen(!open)} className="relative rounded-xl p-2 transition-all hover:bg-slate-100 active:scale-95 dark:hover:bg-slate-700" aria-label={t('notifications.title')}>
          <Bell size={20} className={badgeCount > 0 ? 'animate-swing text-amber-500' : 'text-slate-500 dark:text-slate-400'} fill={badgeCount > 0 ? 'currentColor' : 'none'} />
          {badgeCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white text-[9px] font-black text-white shadow-sm dark:border-slate-800" style={{ backgroundColor: '#f7924a' }}>
              {badgeCount > 9 ? '9' : badgeCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-12 z-50 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/30">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('notifications.title')}</h3>
                {unreadCount > 0 && <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('notifications.unreadCount', { count: unreadCount })}</p>}
              </div>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 transition-all hover:bg-primary-100 active:scale-95 dark:bg-primary-900/30 dark:text-primary-300">
                  <CheckCheck size={14} />
                  {t('common.readAll')}
                </button>
              )}
            </div>

            <div className="custom-scrollbar max-h-96 divide-y divide-slate-50 overflow-y-auto dark:divide-slate-800">
              {loading ? (
                <div className="p-5 text-center text-sm text-slate-400">{t('common.loading')}</div>
              ) : merged.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800">
                    <Bell size={32} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500">{t('notifications.empty')}</p>
                </div>
              ) : merged.map(item => {
                const isAnnouncement = item._kind === 'announcement'
                const isUnread = isAnnouncement ? !item.is_read : !item.in_app_read
                const colorClass = isAnnouncement ? announcementColorClass : (docTypeColor[item.type] || docTypeColor.expiry_warning)
                return (
                  <div
                    key={isAnnouncement ? `ann-${item.announcement_id}` : `doc-${item.notif_id}`}
                    className={`cursor-pointer border-l-4 px-5 py-4 transition-all ${
                      isUnread
                        ? 'border-primary-500 bg-primary-50/80 shadow-[inset_0_0_0_1px_rgba(66,181,225,0.12)] hover:bg-primary-50 dark:bg-primary-900/20 dark:hover:bg-primary-900/30'
                        : 'border-transparent bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50'
                    }`}
                    onClick={() => isAnnouncement ? handleAnnClick(item) : handleDocClick(item)}
                  >
                    <div className="flex gap-4">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isAnnouncement ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : colorClass.split(' ').slice(0, 2).join(' ')}`}>
                        {isAnnouncement ? <Megaphone size={20} strokeWidth={2} /> : docTypeIcon(item.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          {isUnread && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-600 ring-4 ring-primary-100 dark:ring-primary-900/40" />}
                          <p className={`min-w-0 flex-1 truncate text-[13px] ${isUnread ? 'font-extrabold text-slate-950 dark:text-white' : 'font-bold text-slate-500 dark:text-slate-400'}`}>
                            {isAnnouncement ? item.title : item.doc_title}
                          </p>
                        </div>
                        <p className={`mt-1 line-clamp-2 text-[11px] leading-relaxed ${isUnread ? 'font-semibold text-slate-700 dark:text-slate-200' : 'font-medium text-slate-500 dark:text-slate-400'}`}>{isAnnouncement ? item.content : item.message}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>
                            {isAnnouncement ? t('notifications.announcement') : item.doc_type}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            <Clock size={12} strokeWidth={2} />
                            {new Date(item.created_at).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isUnread
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                          }`}>
                            <CheckCheck size={12} />
                            {isUnread ? t('notifications.unreadStatus') : t('notifications.readStatus')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {merged.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-center dark:border-slate-800 dark:bg-slate-800/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('notifications.shownLatest', { count: merged.length })}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

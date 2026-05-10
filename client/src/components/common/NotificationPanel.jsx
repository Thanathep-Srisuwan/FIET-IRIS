import { useEffect, useState, useRef } from 'react'
import { notificationService, announcementService } from '../../services/api'
import toast from 'react-hot-toast'

const docTypeIcon = (type) => {
  const props = { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: 2 };
  switch (type) {
    case 'expiry_warning':
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
    case 'expired':
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'deleted':
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
    case 'replaced':
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
    default:
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
  }
}

const docTypeColor = {
  expiry_warning: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  expired:        'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  deleted:        'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700',
  replaced:       'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
}
const announcementColorClass = 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'

function renderWithLinks(text) {
  if (!text) return null
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="text-blue-600 dark:text-primary-400 underline break-all hover:text-blue-800 dark:hover:text-primary-300"
        onClick={e => e.stopPropagation()}>
        {part}
      </a>
    ) : part
  )
}

function AnnouncementModal({ item, onClose }) {
  if (!item) return null
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onMouseDown={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden transition-colors"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug">{item.title}</h2>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                </svg>
                {new Date(item.created_at).toLocaleString('th-TH', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content + Image */}
        <div className="px-6 py-6 overflow-y-auto flex-1 custom-scrollbar">
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-auto rounded-2xl mb-6 shadow-sm"
            />
          )}
          <div className="text-[15px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-body">
            {renderWithLinks(item.content)}
          </div>
        </div>

        {/* Link button */}
        {item.link_url && (
          <div className="px-6 pt-2 pb-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <a
              href={item.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl text-[15px] font-bold text-white transition-all hover:opacity-90 shadow-lg hover:shadow-xl active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#42b5e1,#1262a0)' }}
              onClick={e => e.stopPropagation()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              ดูรายละเอียดเพิ่มเติม
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm font-bold px-6 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NotificationPanel({ onCountChange }) {
  const [open, setOpen]             = useState(false)
  const [notifs, setNotifs]         = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading]       = useState(false)
  const [selectedAnn, setSelectedAnn] = useState(null)
  const [badgeCount, setBadgeCount] = useState(0)
  const panelRef                    = useRef(null)

  useEffect(() => {
    const loadCount = () =>
      Promise.all([
        notificationService.getUnread().catch(() => ({ data: [] })),
        announcementService.getAll().catch(() => ({ data: [] })),
      ]).then(([nRes, aRes]) => {
        const docUnread = Array.isArray(nRes.data) ? nRes.data.length : 0
        const annUnread = (aRes.data || []).filter(a => !a.is_read).length
        const total = docUnread + annUnread
        setBadgeCount(total)
        onCountChange?.(total)
      })

    loadCount()
    const interval = setInterval(loadCount, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [nRes, aRes] = await Promise.all([
        notificationService.getAll(),
        announcementService.getAll(),
      ])
      setNotifs(nRes.data || [])
      setAnnouncements(aRes.data || [])

      const docUnread = (nRes.data || []).filter(n => !n.in_app_read).length
      const annUnread = (aRes.data || []).filter(a => !a.is_read).length
      const total = docUnread + annUnread
      setBadgeCount(total)
      onCountChange?.(total)
    } catch {}
    finally { setLoading(false) }
  }

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
      setNotifs(prev => prev.map(n => n.notif_id === id ? { ...n, in_app_read: true } : n))
      const docUnread = notifs.filter(n => !n.in_app_read && n.notif_id !== id).length
      const annUnread = announcements.filter(a => !a.is_read).length
      const total = docUnread + annUnread
      setBadgeCount(total)
      onCountChange?.(total)
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  const handleMarkAnnRead = async (id) => {
    try {
      await announcementService.markRead(id)
      setAnnouncements(prev => prev.map(a => a.announcement_id === id ? { ...a, is_read: true } : a))
      const docU = notifs.filter(n => !n.in_app_read).length
      const annU = announcements.filter(a => !a.is_read && a.announcement_id !== id).length
      const total = docU + annU
      setBadgeCount(total)
      onCountChange?.(total)
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  const handleAnnClick = (item) => {
    setOpen(false)
    setSelectedAnn(item)
    if (!item.is_read) handleMarkAnnRead(item.announcement_id)
  }

  const handleMarkAllRead = async () => {
    try {
      await Promise.all([
        notificationService.markAllRead(),
        announcementService.markAllRead(),
      ])
      setNotifs(prev => prev.map(n => ({ ...n, in_app_read: true })))
      setAnnouncements(prev => prev.map(a => ({ ...a, is_read: true })))
      setBadgeCount(0)
      onCountChange?.(0)
      toast.success('อ่านทั้งหมดแล้ว')
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  const docUnread = notifs.filter(n => !n.in_app_read).length
  const annUnread = announcements.filter(a => !a.is_read).length
  const unreadCount = docUnread + annUnread

  const merged = [
    ...notifs.map(n => ({ ...n, _kind: 'doc' })),
    ...announcements.map(a => ({ ...a, _kind: 'announcement' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <>
      <AnnouncementModal item={selectedAnn} onClose={() => setSelectedAnn(null)} />

      <div className="relative" ref={panelRef}>
        {/* Bell button */}
        <button
          onClick={() => setOpen(!open)}
          className="relative p-2 rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95"
        >
          <svg className={`w-5 h-5 ${badgeCount > 0 ? 'text-amber-500 animate-swing' : 'text-slate-500 dark:text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          {badgeCount > 0 && (
            <span
              className="absolute top-1 right-1 w-4 h-4 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm"
              style={{ backgroundColor: '#f7924a' }}
            >
              {badgeCount > 9 ? '9' : badgeCount}
            </span>
          )}
        </button>

        {/* Panel */}
        {open && (
          <div className="absolute right-0 top-12 w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">การแจ้งเตือน</h3>
                {unreadCount > 0 && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">ยังไม่ได้อ่าน {unreadCount} รายการ</p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-bold transition-all hover:opacity-80 active:scale-95"
                  style={{ color: '#42b5e1' }}
                >
                  อ่านทั้งหมด
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col gap-4 p-5">
                  <div className="flex gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                    </div>
                  </div>
                  <div className="flex gap-4 animate-pulse opacity-60">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                    </div>
                  </div>
                </div>
              ) : merged.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">ไม่มีการแจ้งเตือนในขณะนี้</p>
                </div>
              ) : merged.map(item => {
                if (item._kind === 'announcement') {
                  const isUnread = !item.is_read
                  return (
                    <div
                      key={`ann-${item.announcement_id}`}
                      className={`px-5 py-4 transition-all cursor-pointer border-l-4 ${isUnread ? 'bg-primary-50/40 dark:bg-primary-900/10 border-primary-400' : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                      onClick={() => handleAnnClick(item)}
                    >
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] font-bold truncate ${isUnread ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed font-medium">{item.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${announcementColorClass}`}>
                              ประกาศ
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {new Date(item.created_at).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

                // document notification
                const cClass = docTypeColor[item.type] || docTypeColor.expiry_warning
                return (
                  <div
                    key={`doc-${item.notif_id}`}
                    className={`px-5 py-4 transition-all cursor-pointer border-l-4 ${!item.in_app_read ? 'bg-primary-50/40 dark:bg-primary-900/10 border-primary-400' : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    onClick={() => !item.in_app_read && handleMarkDocRead(item.notif_id)}
                  >
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${cClass.split(' ').slice(0, 2).join(' ')}`}>
                        {docTypeIcon(item.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-bold truncate ${!item.in_app_read ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                          {item.doc_title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed font-medium">{item.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${cClass}`}>
                            {item.doc_type}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(new Date(item.created_at).getTime() + 7 * 60 * 60 * 1000)
                              .toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            {merged.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">แสดง {merged.length} รายการล่าสุด</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

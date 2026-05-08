import { useEffect, useState, useRef } from 'react'
import { notificationService, announcementService } from '../../services/api'
import toast from 'react-hot-toast'

const docTypeIcon = {
  expiry_warning: '⚠️',
  expired:        '🔴',
  deleted:        '🗑️',
  replaced:       '🔄',
}
const docTypeColor = {
  expiry_warning: { bg: '#fffbeb', border: '#fde68a',  text: '#92400e' },
  expired:        { bg: '#fff1f2', border: '#fecdd3',  text: '#881337' },
  deleted:        { bg: '#f8fafc', border: '#e2e8f0',  text: '#475569' },
  replaced:       { bg: '#f0f9ff', border: '#bae6fd',  text: '#0c4a6e' },
}
const announcementColor = { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1' }

function renderWithLinks(text) {
  if (!text) return null
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="text-blue-600 underline break-all hover:text-blue-800"
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex gap-3 items-start">
            <span className="text-2xl flex-shrink-0">📢</span>
            <div>
              <h2 className="text-base font-semibold text-slate-800">{item.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(item.created_at).toLocaleString('th-TH', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0 ml-3 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content + Image */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-auto rounded-xl mb-4"
            />
          )}
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {renderWithLinks(item.content)}
          </p>
        </div>

        {/* Link button */}
        {item.link_url && (
          <div className="px-6 pt-2 pb-4 border-t border-slate-100">
            <a
              href={item.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#42b5e1' }}
              onClick={e => e.stopPropagation()}
            >
              🔗 ดูลิ้งค์เพิ่มเติม
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm px-5 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: '#42b5e1' }}
          >
            ปิด
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
      const docUnread = notifs.filter(n => !n.in_app_read).length
      const annUnread = announcements.filter(a => !a.is_read && a.announcement_id !== id).length
      const total = docUnread + annUnread
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
          className="relative p-2 rounded-lg transition-colors hover:bg-slate-100"
        >
          <span className="text-xl">🔔</span>
          {badgeCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-5 h-5 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#f7924a' }}
            >
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </button>

        {/* Panel */}
        {open && (
          <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">การแจ้งเตือน</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">ยังไม่ได้อ่าน {unreadCount} รายการ</p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium transition-colors"
                  style={{ color: '#42b5e1' }}
                >
                  อ่านทั้งหมด
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
              {loading ? (
                <div className="text-center py-10 text-slate-400 text-sm">กำลังโหลด...</div>
              ) : merged.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="text-slate-400 text-sm">ไม่มีการแจ้งเตือน</p>
                </div>
              ) : merged.map(item => {
                if (item._kind === 'announcement') {
                  const isUnread = !item.is_read
                  return (
                    <div
                      key={`ann-${item.announcement_id}`}
                      className="px-5 py-4 transition-colors cursor-pointer hover:bg-blue-50"
                      style={{ backgroundColor: isUnread ? '#f0f9ff' : '#fff' }}
                      onClick={() => handleAnnClick(item)}
                    >
                      <div className="flex gap-3">
                        <span className="text-lg flex-shrink-0 mt-0.5">📢</span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${isUnread ? 'text-slate-800' : 'text-slate-500'}`}>
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.content}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: announcementColor.bg, color: announcementColor.text, border: `1px solid ${announcementColor.border}` }}
                            >
                              ประกาศ
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(item.created_at).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isUnread ? (
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0 ml-auto"
                                style={{ backgroundColor: '#42b5e1' }}
                              />
                            ) : (
                              <span className="text-xs text-slate-400 ml-auto">คลิกเพื่ออ่าน</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

                // document notification
                const c = docTypeColor[item.type] || docTypeColor.expiry_warning
                return (
                  <div
                    key={`doc-${item.notif_id}`}
                    className="px-5 py-4 transition-colors cursor-pointer"
                    style={{ backgroundColor: item.in_app_read ? '#fff' : '#f8fafc' }}
                    onClick={() => !item.in_app_read && handleMarkDocRead(item.notif_id)}
                  >
                    <div className="flex gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">{docTypeIcon[item.type] || '🔔'}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${item.in_app_read ? 'text-slate-500' : 'text-slate-800'}`}>
                          {item.doc_title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                          >
                            {item.doc_type}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(new Date(item.created_at).getTime() + 7 * 60 * 60 * 1000)
                              .toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!item.in_app_read && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0 ml-auto"
                              style={{ backgroundColor: '#42b5e1' }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            {merged.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-center">
                <p className="text-xs text-slate-400">แสดง {merged.length} รายการล่าสุด</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Trash2, 
  RefreshCw, 
  Calendar, 
  X, 
  ExternalLink, 
  Megaphone, 
  Clock 
} from 'lucide-react'
import { notificationService, announcementService } from '../../services/api'
import toast from 'react-hot-toast'

const docTypeIcon = (type) => {
  const iconProps = { size: 20, strokeWidth: 2 };
  switch (type) {
    case 'expiry_warning':
      return <AlertTriangle {...iconProps} />;
    case 'expired':
      return <AlertCircle {...iconProps} />;
    case 'deleted':
      return <Trash2 {...iconProps} />;
    case 'replaced':
      return <RefreshCw {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
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
  
  const modalContent = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transition-colors border border-slate-200 dark:border-slate-800"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0">
              <Bell size={24} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug">{item.title}</h2>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} strokeWidth={2.5} />
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
            <X size={20} />
          </button>
        </div>

        {/* Content + Image */}
        <div className="px-6 py-6 overflow-y-auto flex-1 custom-scrollbar">
          {item.image_url && (
            <div className="relative w-full h-auto min-h-[200px] bg-slate-100 dark:bg-slate-800 overflow-hidden mb-6 shadow-md border border-slate-100 dark:border-slate-800">
              {/* Modern blurred background effect for aspect ratio gaps */}
              <div className="absolute inset-0 opacity-20 blur-3xl scale-125">
                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
              </div>
              <img
                src={item.image_url}
                alt={item.title}
                className="relative z-10 w-full h-auto max-h-[800px] object-contain mx-auto shadow-sm"
              />
            </div>
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
              style={{ backgroundColor: '#1262a0' }}
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={20} strokeWidth={2} />
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

  return createPortal(modalContent, document.body)
}

export default function NotificationPanel({ onCountChange }) {
  const navigate = useNavigate()
  const [open, setOpen]             = useState(false)
  const [notifs, setNotifs]         = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading]       = useState(false)
  const [selectedAnn, setSelectedAnn] = useState(null)
  const [badgeCount, setBadgeCount] = useState(0)
  const panelRef                    = useRef(null)

  const loadBadgeCount = async () => {
    try {
      const [nRes, aRes] = await Promise.all([
        notificationService.getUnread().catch(() => ({ data: [] })),
        announcementService.getAll().catch(() => ({ data: [] })),
      ])
      const docUnread = Array.isArray(nRes.data) ? nRes.data.length : 0
      const annUnread = (aRes.data || []).filter(a => !a.is_read).length
      const total = docUnread + annUnread
      setBadgeCount(total)
      onCountChange?.(total)
    } catch {}
  }

  useEffect(() => {
    loadBadgeCount()
    const interval = setInterval(loadBadgeCount, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [nRes, aRes] = await Promise.all([
        notificationService.getAll(),
        announcementService.getAll(),
      ])
      const fetchedNotifs = nRes.data || []
      const fetchedAnn = aRes.data || []
      setNotifs(fetchedNotifs)
      setAnnouncements(fetchedAnn)

      const docUnread = fetchedNotifs.filter(n => !n.in_app_read).length
      const annUnread = fetchedAnn.filter(a => !a.is_read).length
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
      setNotifs(prev => {
        const next = prev.map(n => n.notif_id === id ? { ...n, in_app_read: true } : n)
        const docUnread = next.filter(n => !n.in_app_read).length
        const annUnread = announcements.filter(a => !a.is_read).length
        const total = docUnread + annUnread
        setBadgeCount(total)
        onCountChange?.(total)
        return next
      })
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  const handleMarkAnnRead = async (id) => {
    try {
      await announcementService.markRead(id)
      setAnnouncements(prev => {
        const next = prev.map(a => a.announcement_id === id ? { ...a, is_read: true } : a)
        const docUnread = notifs.filter(n => !n.in_app_read).length
        const annUnread = next.filter(a => !a.is_read).length
        const total = docUnread + annUnread
        setBadgeCount(total)
        onCountChange?.(total)
        return next
      })
    } catch { toast.error('เกิดข้อผิดพลาด') }
  }

  const handleAnnClick = (item) => {
    setOpen(false)
    setSelectedAnn(item)
    if (!item.is_read) handleMarkAnnRead(item.announcement_id)
  }

  const handleDocClick = (item) => {
    setOpen(false)
    if (!item.in_app_read) handleMarkDocRead(item.notif_id)
    navigate('/documents')
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
          <Bell 
            size={20} 
            className={badgeCount > 0 ? 'text-amber-500 animate-swing' : 'text-slate-500 dark:text-slate-400'} 
            fill={badgeCount > 0 ? 'currentColor' : 'none'}
          />
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
                    <Bell size={32} className="text-slate-300 dark:text-slate-600" />
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
                          <Megaphone size={20} strokeWidth={2} />
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
                              <Clock size={12} strokeWidth={2} />
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
                    onClick={() => handleDocClick(item)}
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
                            <Clock size={12} strokeWidth={2} />
                            {new Date(item.created_at).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import NotificationPanel from '../common/NotificationPanel'

export default function Topbar({ onMenuClick }) {
  const { user } = useAuthStore()
  const [unreadCount, setUnreadCount] = useState(0)

  const today = new Date().toLocaleDateString('th-TH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="เปิดเมนู">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <p className="text-xs text-slate-400 hidden sm:block">{today}</p>
      </div>
      <div className="flex items-center gap-3">
        <NotificationPanel onCountChange={setUnreadCount} />
        <div className="text-sm text-slate-600 font-medium">{user?.name}</div>
      </div>
    </header>
  )
}

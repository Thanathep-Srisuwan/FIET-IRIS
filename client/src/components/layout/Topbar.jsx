import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import NotificationPanel from '../common/NotificationPanel'
import ThemeToggle from '../common/ThemeToggle'

const roleLabel = {
  student: 'นักศึกษา',
  advisor: 'อาจารย์ที่ปรึกษา',
  staff: 'เจ้าหน้าที่',
  admin: 'ผู้ดูแลระบบ',
  executive: 'ผู้บริหาร',
}

const pageMeta = [
  { match: /^\/dashboard/, title: 'ภาพรวมระบบ', eyebrow: 'Dashboard' },
  { match: /^\/documents/, title: 'เอกสารรับรอง', eyebrow: 'Documents' },
  { match: /^\/admin\/users/, title: 'จัดการผู้ใช้งาน', eyebrow: 'Admin' },
  { match: /^\/admin\/announcements/, title: 'จัดการประกาศ', eyebrow: 'Admin' },
  { match: /^\/admin\/doc-types/, title: 'ประเภทเอกสาร', eyebrow: 'Admin' },
  { match: /^\/admin\/trash/, title: 'ถังขยะ', eyebrow: 'Admin' },
  { match: /^\/admin\/logs/, title: 'ประวัติระบบ', eyebrow: 'Admin' },
  { match: /^\/admin\/settings/, title: 'ตั้งค่าระบบ', eyebrow: 'Admin' },
  { match: /^\/admin\/email-templates/, title: 'Email Templates', eyebrow: 'Admin' },
  { match: /^\/executive\/overview/, title: 'ภาพรวมคณะ', eyebrow: 'Executive' },
  { match: /^\/executive\/branches/, title: 'สรุปรายสาขา', eyebrow: 'Executive' },
  { match: /^\/executive\/documents/, title: 'เอกสารทั้งคณะ', eyebrow: 'Executive' },
]

function getPageMeta(pathname) {
  return pageMeta.find(item => item.match.test(pathname)) || { title: 'FIET IRIS', eyebrow: 'Workspace' }
}

export default function Topbar({ onMenuClick }) {
  const { user } = useAuthStore()
  const location = useLocation()
  const [, setUnreadCount] = useState(0)
  const meta = getPageMeta(location.pathname)

  const today = new Date().toLocaleDateString('th-TH', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <header className="min-h-16 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 px-4 md:px-6 sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden w-10 h-10 rounded-xl text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all duration-200 flex items-center justify-center"
          aria-label="เปิดเมนู"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">{meta.eyebrow}</p>
            <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <p className="hidden sm:block text-[11px] font-medium text-slate-400 dark:text-slate-500">{today}</p>
          </div>
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">{meta.title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
          <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-xs font-semibold">{roleLabel[user?.role] || 'ผู้ใช้'}</span>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <ThemeToggle className="w-9 h-9" />
          <NotificationPanel onCountChange={setUnreadCount} />
        </div>

        <div className="hidden sm:flex items-center gap-3 pl-2">
          <div className="text-right max-w-44">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-none truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1 truncate">{user?.email || 'เข้าใช้งานระบบแล้ว'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            {user?.name?.[0] || 'U'}
          </div>
        </div>

        <div className="sm:hidden w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
          {user?.name?.[0] || 'U'}
        </div>
      </div>
    </header>
  )
}

import { NavLink, useNavigate } from 'react-router-dom'
import { 
  Home, 
  FileText, 
  Users, 
  Megaphone, 
  Tags, 
  Trash2, 
  History, 
  Settings, 
  Mail, 
  BarChart3, 
  LogOut 
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { authService } from '../../services/api'
import toast from 'react-hot-toast'
import irisLogo from '../../assets/LOGO-IRIS.png'

const navByRole = {
  student: [
    { to: '/dashboard',  label: 'หน้าแรก' },
    { to: '/documents',  label: 'ใบประกาศของฉัน' },
  ],
  advisor: [
    { to: '/dashboard',  label: 'หน้าแรก' },
    { to: '/documents',  label: 'ใบประกาศ RI/IRB' },
  ],
  staff: [
    { to: '/dashboard',  label: 'หน้าแรก' },
    { to: '/documents',  label: 'เอกสารของฉัน' },
  ],
  admin: [
    { to: '/dashboard',                label: 'หน้าแรก' },
    { to: '/documents',                label: 'ใบประกาศทั้งหมด' },
    { to: '/admin/users',              label: 'จัดการผู้ใช้' },
    { to: '/admin/announcements',      label: 'จัดการประกาศ' },
    { to: '/admin/doc-types',          label: 'ประเภทใบประกาศ' },
    { to: '/admin/trash',              label: 'ถังขยะ' },
    { to: '/admin/logs',               label: 'ประวัติระบบ' },
    { to: '/admin/settings',           label: 'ตั้งค่าระบบ' },
    { to: '/admin/email-templates',    label: 'จัดการ Email Template' },
  ],
  executive: [
    { to: '/executive/overview',  label: 'ข้อมูลภาพรวมในคณะ' },
    { to: '/executive/branches',  label: 'สรุปรายงานรายสาขาวิชา' },
    { to: '/executive/documents', label: 'เอกสารในคณะทั้งหมด' },
  ],
}

const roleLabel = {
  student:   'นักศึกษา',
  advisor:   'อาจารย์',
  staff:     'เจ้าหน้าที่',
  admin:     'ผู้ดูแลระบบ',
  executive: 'ผู้บริหาร',
}

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const items = navByRole[user?.role] || []

  const handleLogout = async () => {
    try { await authService.logout() } finally {
      logout(); navigate('/')
      toast.success('ออกจากระบบสำเร็จ')
    }
  }

  return (
    <aside className="w-72 md:w-64 flex flex-col font-sans select-none transition-colors duration-300 h-screen overflow-hidden bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">

      {/* Logo Section */}
      <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src={irisLogo} alt="FIET-IRIS Logo" className="h-10 w-auto object-contain flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-none">FIET IRIS</p>
            <p className="text-[11px] font-semibold leading-tight text-slate-500 dark:text-slate-400 mt-1">Integrity Research Information System</p>
          </div>
        </div>
      </div>

      {/* Navigation Area - Scrollable but hidden scrollbar */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide">
        <p className="px-3 pb-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">เมนูหลัก</p>
        <div className="space-y-1">
          {items.map(item => (
            <NavLink key={item.to} to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-900'
                }`
              }>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary-500" />}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-800/60 dark:text-primary-200'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-300'
                  }`}>
                    {getIcon(item.to, isActive)}
                  </div>
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User & Logout Section - Fixed at the bottom */}
      <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 bg-primary-600 text-white">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.name}</p>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{roleLabel[user?.role]}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-300 dark:hover:border-red-900 active:scale-95">
          <LogOut size={14} strokeWidth={2.5} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

function getIcon(to, isActive) {
  const iconProps = {
    size: 20,
    strokeWidth: isActive ? 2.5 : 2
  };

  if (to.includes('dashboard') || to === '/executive/overview') {
    return <Home {...iconProps} />
  }
  if (to.includes('documents')) {
    return <FileText {...iconProps} />
  }
  if (to.includes('admin/users')) {
    return <Users {...iconProps} />
  }
  if (to.includes('admin/announcements')) {
    return <Megaphone {...iconProps} />
  }
  if (to.includes('admin/doc-types')) {
    return <Tags {...iconProps} />
  }
  if (to.includes('admin/trash')) {
    return <Trash2 {...iconProps} />
  }
  if (to.includes('admin/logs')) {
    return <History {...iconProps} />
  }
  if (to.includes('admin/settings')) {
    return <Settings {...iconProps} />
  }
  if (to.includes('admin/email-templates')) {
    return <Mail {...iconProps} />
  }
  if (to.includes('executive/branches')) {
    return <BarChart3 {...iconProps} />
  }

  return (
    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-white/25'}`} />
  )
}

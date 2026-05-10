import { NavLink, useNavigate } from 'react-router-dom'
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
    <aside className="w-64 flex flex-col font-sans text-white select-none transition-colors duration-300 h-screen overflow-hidden"
      style={{ backgroundColor: '#0d2d3e' }}>

      {/* Logo Section - No background frame, no navigation */}
      <div className="px-5 py-5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src={irisLogo} alt="FIET-IRIS Logo" className="h-9 w-auto object-contain flex-shrink-0 brightness-110" />
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black tracking-tighter text-white">FIET IRIS</p>
            <div className="w-8 h-0.5 my-0.5 rounded-full bg-primary-400" />
            <p className="text-[9px] font-bold leading-tight text-white/30 uppercase tracking-widest">Integrity Research Information System</p>
          </div>
        </div>
      </div>

      {/* Navigation Area - Scrollable but hidden scrollbar */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide">
        <div className="space-y-1">
          {items.map(item => (
            <NavLink key={item.to} to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  isActive ? 'text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
                }`
              }
              style={({ isActive }) =>
                isActive ? { background: 'linear-gradient(135deg,#42b5e1,#1262a0)' } : {}
              }>
              {({ isActive }) => (
                <>
                  <div className="transition-all duration-300 transform group-hover:scale-110">
                    {getIcon(item.to, isActive)}
                  </div>
                  <span className="tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User & Logout Section - Fixed at the bottom */}
      <div className="px-5 py-4 border-t border-white/5 bg-black/10 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 shadow-lg border border-white/10"
            style={{ background: 'linear-gradient(135deg,#42b5e1,#1262a0)', color: '#fff' }}>
            {user?.name?.[0] || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate tracking-tight">{user?.name}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mt-0.5">{roleLabel[user?.role]}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all duration-300 bg-white/5 border border-white/10 text-white/50 hover:bg-red-500 hover:text-white hover:border-red-400 group active:scale-95">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="uppercase tracking-widest">Logout</span>
        </button>
      </div>
    </aside>
  )
}

function getIcon(to, isActive) {
  const props = {
    className: `w-5 h-5 ${isActive ? 'opacity-100' : 'opacity-60'}`,
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    strokeWidth: isActive ? 2.5 : 2
  };

  if (to.includes('dashboard') || to === '/executive/overview') {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  }
  if (to.includes('documents')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }
  if (to.includes('admin/users')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  }
  if (to.includes('admin/announcements')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    )
  }
  if (to.includes('admin/doc-types')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 11h.01M7 15h.01M11 7h.01M11 11h.01M11 15h.01M15 7h.01M15 11h.01M15 15h.01M19 7h.01M19 11h.01M19 15h.01M3 3h18v18H3V3z" />
      </svg>
    )
  }
  if (to.includes('admin/trash')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    )
  }
  if (to.includes('admin/logs')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (to.includes('admin/settings')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
  if (to.includes('admin/email-templates')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
      </svg>
    )
  }
  if (to.includes('executive/branches')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  }

  return (
    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-white/25'}`} />
  )
}

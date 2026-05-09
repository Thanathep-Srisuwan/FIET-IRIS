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
    // { to: '/admin/email-templates',    label: 'จัดการ Email' },
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
    <aside className="w-64 flex flex-col font-sans text-white select-none"
      style={{ backgroundColor: '#0d2d3e', minHeight: '100vh' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3.5">
          <img src={irisLogo} alt="FIET-IRIS Logo" className="h-11 w-auto object-contain flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold tracking-wide text-white">FIET</p>
            <div className="w-6 h-0.5 my-1.5 rounded-full" style={{ backgroundColor: '#42b5e1' }} />
            <p className="text-[9.5px] font-medium leading-snug" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Integrity Research<br />Information System
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-3" style={{ color: 'rgba(255,255,255,0.22)' }}>
          เมนูหลัก
        </p>
        <div className="space-y-0.5">
          {items.map(item => (
            <NavLink key={item.to} to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive ? 'text-white' : 'text-white/55 hover:text-white hover:bg-white/5'
                }`
              }
              style={({ isActive }) =>
                isActive ? { background: 'linear-gradient(135deg,#42b5e1,#1262a0)' } : {}
              }>
              {({ isActive }) => (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isActive ? 'bg-white' : 'bg-white/25'}`} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="px-4 py-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#42b5e1,#1262a0)', color: '#fff' }}>
            {user?.name?.[0] || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>{roleLabel[user?.role]}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.09)' }}
          onMouseEnter={e => { e.currentTarget.style.background='linear-gradient(135deg,#e74c3c,#922b21)'; e.currentTarget.style.color='#fff'; e.currentTarget.style.border='1px solid transparent' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(255,255,255,0.6)'; e.currentTarget.style.border='1px solid rgba(255,255,255,0.09)' }}>
          <span>⏻</span><span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  )
}

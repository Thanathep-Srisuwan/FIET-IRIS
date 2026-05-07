import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { authService } from '../../services/api'
import toast from 'react-hot-toast'
import irisLogo from '../../assets/LOGO-IRIS.png'

const navByRole = {
  student: [
    { to: '/dashboard',  label: 'หน้าแรก',          icon: '▪' },
    { to: '/documents',  label: 'ใบประกาศของฉัน',   icon: '▪' },
  ],
  advisor: [
    { to: '/dashboard',  label: 'หน้าแรก',            icon: '▪' },
    { to: '/documents',  label: 'ใบประกาศ RI/IRB',   icon: '▪' },
  ],
  admin: [
    { to: '/dashboard',              label: 'หน้าแรก',             icon: '▪' },
    { to: '/documents',              label: 'ใบประกาศทั้งหมด',    icon: '▪' },
    { to: '/admin/users',            label: 'จัดการผู้ใช้',       icon: '▪' },
    { to: '/admin/announcements',    label: 'จัดการการแจ้งเตือน', icon: '▪' },
    { to: '/admin/doc-types',        label: 'ประเภทใบประกาศ',     icon: '▪' },
    { to: '/admin/trash',            label: 'ถังขยะ',              icon: '▪' },
    { to: '/admin/logs',             label: 'ประวัติระบบ',         icon: '▪' },
  ],
  executive: [
    { to: '/executive/overview',  label: 'ภาพรวมคณะ',      icon: '▪' },
    { to: '/executive/branches',  label: 'สรุปรายงานรายสาขาวิชา',     icon: '▪' },
    { to: '/executive/documents', label: 'เอกสารทั้งคณะ',   icon: '▪' },
  ],
}

const roleLabel = { student: 'นักศึกษา', advisor: 'อาจารย์', admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร' }

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
    <aside className="w-64 flex flex-col text-white select-none"
      style={{ backgroundColor: '#0d2d3e', minHeight: '100vh' }}>
      <div className="px-6 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <img src={irisLogo} alt="FIET-IRIS Logo" className="h-12 w-auto mb-3 object-contain" />
        <p className="text-lg font-bold tracking-widest text-white">FIET-IRIS</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Integrity Research Information System</p>
      </div>

      <nav className="flex-1 px-4 py-5 space-y-0.5">
        {items.map(item => (
          <NavLink key={item.to} to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? 'text-white' : 'hover:text-white'}`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? '#42b5e1' : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
            })}>
            <span className="text-[8px]">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: '#42b5e1', color: '#fff' }}>
            {user?.name?.[0] || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{roleLabel[user?.role]}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-150"
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor='#c0392b'; e.currentTarget.style.color='#fff'; e.currentTarget.style.border='1px solid #c0392b' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor='rgba(255,255,255,0.07)'; e.currentTarget.style.color='rgba(255,255,255,0.7)'; e.currentTarget.style.border='1px solid rgba(255,255,255,0.1)' }}>
          <span>⏻</span><span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  )
}

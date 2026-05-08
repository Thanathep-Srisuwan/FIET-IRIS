import { useAuthStore } from '../../stores/authStore'
import { Navigate } from 'react-router-dom'
import StudentDashboard from './StudentDashboard'
import AdvisorDashboard from './AdvisorDashboard'
import AdminDashboard   from './AdminDashboard'
import StaffDashboard   from './StaffDashboard'

export default function DashboardPage() {
  const { user } = useAuthStore()
  if (user?.role === 'admin')     return <AdminDashboard />
  if (user?.role === 'advisor')   return <AdvisorDashboard />
  if (user?.role === 'staff')     return <StaffDashboard />
  if (user?.role === 'executive') return <Navigate to="/executive/overview" replace />
  return <StudentDashboard />
}

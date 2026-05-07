import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

import LandingPage         from './pages/landing/LandingPage'
import LoginPage           from './pages/auth/LoginPage'
import ChangePasswordPage  from './pages/auth/ChangePasswordPage'
import DashboardPage       from './pages/dashboard/DashboardPage'
import DocumentsPage       from './pages/documents/DocumentsPage'
import AdminUsersPage          from './pages/admin/AdminUsersPage'
import AdminLogsPage           from './pages/admin/AdminLogsPage'
import AdminAnnouncementsPage  from './pages/admin/AdminAnnouncementsPage'
import AdminDocTypesPage       from './pages/admin/AdminDocTypesPage'
import AdminTrashPage          from './pages/admin/AdminTrashPage'
import ExecutiveDashboard  from './pages/executive/ExecutiveDashboard'
import BranchSummaryPage   from './pages/executive/BranchSummaryPage'
import ExecutiveDocumentsPage from './pages/executive/ExecutiveDocumentsPage'
import MainLayout          from './components/layout/MainLayout'

const PrivateRoute = ({ children, roles }) => {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/" replace />
  if (user?.must_change_pw) return <Navigate to="/change-password" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/"                element={<LandingPage />} />
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* Private routes — wrapped by PrivateRoute + MainLayout (pathless layout route) */}
      <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route path="dashboard"  element={<DashboardPage />} />
        <Route path="documents"  element={<DocumentsPage />} />

        {/* Admin */}
        <Route path="admin/users"          element={<PrivateRoute roles={['admin']}><AdminUsersPage /></PrivateRoute>} />
        <Route path="admin/logs"           element={<PrivateRoute roles={['admin']}><AdminLogsPage /></PrivateRoute>} />
        <Route path="admin/announcements"  element={<PrivateRoute roles={['admin']}><AdminAnnouncementsPage /></PrivateRoute>} />
        <Route path="admin/doc-types"      element={<PrivateRoute roles={['admin']}><AdminDocTypesPage /></PrivateRoute>} />
        <Route path="admin/trash"          element={<PrivateRoute roles={['admin']}><AdminTrashPage /></PrivateRoute>} />

        {/* Executive */}
        <Route path="executive/overview"   element={<PrivateRoute roles={['admin','executive']}><ExecutiveDashboard /></PrivateRoute>} />
        <Route path="executive/branches"   element={<PrivateRoute roles={['admin','executive']}><BranchSummaryPage /></PrivateRoute>} />
        <Route path="executive/documents"  element={<PrivateRoute roles={['admin','executive']}><ExecutiveDocumentsPage /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

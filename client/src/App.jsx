import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

import LandingPage         from './pages/landing/LandingPage'
import LoginPage           from './pages/auth/LoginPage'
import ChangePasswordPage  from './pages/auth/ChangePasswordPage'
import DashboardPage       from './pages/dashboard/DashboardPage'
import DocumentsPage       from './pages/documents/DocumentsPage'
import StudentTasksPage    from './pages/student/StudentTasksPage'
import StudentActivityPage from './pages/student/StudentActivityPage'
import AdminUsersPage          from './pages/admin/AdminUsersPage'
import AdminLogsPage           from './pages/admin/AdminLogsPage'
import AdminAnnouncementsPage  from './pages/admin/AdminAnnouncementsPage'
import AdminDocTypesPage       from './pages/admin/AdminDocTypesPage'
import AdminProgramsPage      from './pages/admin/AdminProgramsPage'
import AdminTrashPage          from './pages/admin/AdminTrashPage'
import AdminSettingsPage       from './pages/admin/AdminSettingsPage'
import AdminEmailTemplatesPage from './pages/admin/AdminEmailTemplatesPage'
import AdminActivityPage      from './pages/admin/AdminActivityPage'
import ExecutiveDashboard  from './pages/executive/ExecutiveDashboard'
import ProgramSummaryPage  from './pages/executive/ProgramSummaryPage'
import ExecutiveDocumentsPage from './pages/executive/ExecutiveDocumentsPage'
import ProfilePage         from './pages/profile/ProfilePage'
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
        <Route path="profile"    element={<ProfilePage />} />
        <Route path="documents"  element={<DocumentsPage />} />
        <Route path="student/tasks" element={<PrivateRoute roles={['student']}><StudentTasksPage /></PrivateRoute>} />
        <Route path="student/activity" element={<PrivateRoute roles={['student']}><StudentActivityPage /></PrivateRoute>} />

        {/* Admin */}
        <Route path="admin/users"          element={<PrivateRoute roles={['admin']}><AdminUsersPage /></PrivateRoute>} />
        <Route path="admin/logs"           element={<PrivateRoute roles={['admin']}><AdminLogsPage /></PrivateRoute>} />
        <Route path="admin/announcements"  element={<PrivateRoute roles={['admin']}><AdminAnnouncementsPage /></PrivateRoute>} />
        <Route path="admin/doc-types"      element={<PrivateRoute roles={['admin']}><AdminDocTypesPage /></PrivateRoute>} />
        <Route path="admin/programs"       element={<PrivateRoute roles={['admin']}><AdminProgramsPage /></PrivateRoute>} />
        <Route path="admin/trash"            element={<PrivateRoute roles={['admin']}><AdminTrashPage /></PrivateRoute>} />
        <Route path="admin/settings"         element={<PrivateRoute roles={['admin']}><AdminSettingsPage /></PrivateRoute>} />
        <Route path="admin/email-templates"  element={<PrivateRoute roles={['admin']}><AdminEmailTemplatesPage /></PrivateRoute>} />
        <Route path="admin/activity"          element={<PrivateRoute roles={['admin']}><AdminActivityPage /></PrivateRoute>} />

        {/* Executive */}
        <Route path="executive/overview"   element={<PrivateRoute roles={['admin','executive']}><ExecutiveDashboard /></PrivateRoute>} />
        <Route path="executive/programs"   element={<PrivateRoute roles={['admin','executive']}><ProgramSummaryPage /></PrivateRoute>} />
        <Route path="executive/branches"   element={<PrivateRoute roles={['admin','executive']}><ProgramSummaryPage /></PrivateRoute>} />
        <Route path="executive/documents"  element={<PrivateRoute roles={['admin','executive']}><ExecutiveDocumentsPage /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

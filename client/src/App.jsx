import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

import LandingPage         from './pages/landing/LandingPage'
import LoginPage           from './pages/auth/LoginPage'
import ChangePasswordPage  from './pages/auth/ChangePasswordPage'
import DashboardPage       from './pages/dashboard/DashboardPage'
import DocumentsPage       from './pages/documents/DocumentsPage'
import StudentTrashPage    from './pages/student/StudentTrashPage'
import AdvisorAdviseesPage from './pages/advisor/AdvisorAdviseesPage'
import AdminUsersPage          from './pages/admin/AdminUsersPage'
import AdminLogsPage           from './pages/admin/AdminLogsPage'
import AdminAnnouncementsPage  from './pages/admin/AdminAnnouncementsPage'
import AdminDocTypesPage       from './pages/admin/AdminDocTypesPage'
import AdminProgramsPage      from './pages/admin/AdminProgramsPage'
import AdminTrashPage          from './pages/admin/AdminTrashPage'
import AdminSettingsPage       from './pages/admin/AdminSettingsPage'
import AdminEmailTemplatesPage from './pages/admin/AdminEmailTemplatesPage'
import AdminActivityPage      from './pages/admin/AdminActivityPage'
import AdminFaqPage            from './pages/admin/AdminFaqPage'
import ExecutiveDashboard  from './pages/executive/ExecutiveDashboard'
import ProgramSummaryPage  from './pages/executive/ProgramSummaryPage'
import ExecutiveDocumentsPage from './pages/executive/ExecutiveDocumentsPage'
import ProfilePage         from './pages/profile/ProfilePage'
import HelpPage            from './pages/help/HelpPage'
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
        <Route path="student/tasks"    element={<PrivateRoute roles={['student']}><Navigate to="/dashboard" replace /></PrivateRoute>} />
        <Route path="student/activity" element={<PrivateRoute roles={['student']}><Navigate to="/dashboard" replace /></PrivateRoute>} />
        <Route path="student/trash"    element={<PrivateRoute roles={['student','staff']}><StudentTrashPage /></PrivateRoute>} />
        <Route path="advisor/advisees" element={<PrivateRoute roles={['advisor']}><AdvisorAdviseesPage /></PrivateRoute>} />
        <Route path="help"             element={<HelpPage />} />

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
        <Route path="admin/faq"              element={<PrivateRoute roles={['admin']}><AdminFaqPage /></PrivateRoute>} />

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

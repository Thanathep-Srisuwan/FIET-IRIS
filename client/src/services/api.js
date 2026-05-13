import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
})

// ใส่ token ทุก request อัตโนมัติ และลบ Content-Type สำหรับ FormData
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Handle 401 — refresh token อัตโนมัติ
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
        useAuthStore.getState().setAuth(data.user, data.token, data.refreshToken)
        original.headers.Authorization = `Bearer ${data.token}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// Auth
export const authService = {
  login:          (data) => api.post('/auth/login', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  logout:         ()     => api.post('/auth/logout'),
  changePassword: (data) => api.put('/auth/change-password', data),
  refresh:        (data) => api.post('/auth/refresh', data),
}

// Documents
export const documentService = {
  getAll:      (params) => api.get('/documents', { params }),
  getSummary:  ()       => api.get('/documents/summary'),
  getById:     (id)     => api.get(`/documents/${id}`),
  upload:      (data)   => api.post('/documents', data),
  delete:      (id)     => api.delete(`/documents/${id}`),
  download:    (id, fileId) => api.get(`/documents/${id}/files/${fileId}/download`, { responseType: 'blob' }),
  preview:     (id, fileId) => api.get(`/documents/${id}/files/${fileId}/preview`, { responseType: 'blob' }),
  uploadVersion: (id, data) => api.post(`/documents/${id}/files/version`, data),
  getTimeline: (id) => api.get(`/documents/${id}/timeline`),
}

// Trash (admin only)
export const trashService = {
  getAll:              (params) => api.get('/documents/trash', { params }),
  restore:             (id)     => api.put(`/documents/${id}/restore`),
  permanentDelete:     (id)     => api.delete(`/documents/${id}/permanent`),
  bulkRestore:         (ids)    => api.put('/documents/trash/bulk-restore', { ids }),
  bulkPermanentDelete: (ids)    => api.delete('/documents/trash/bulk-permanent', { data: { ids } }),
}

// Notifications
export const notificationService = {
  getAll:      ()   => api.get('/notifications'),
  getUnread:   ()   => api.get('/notifications/unread'),
  markRead:    (id) => api.put(`/notifications/${id}/read`),
  markAllRead: ()   => api.put('/notifications/read-all'),
}

// Users (Admin)
export const userService = {
  getAll:        (params)         => api.get('/users', { params }),
  search:        (q)              => api.get('/users/search', { params: { q } }),
  getAdvisors:   (params)         => api.get('/users/advisors', { params }),
  create:        (data)           => api.post('/users', data),
  update:        (id, data)       => api.put(`/users/${id}`, data),
  toggle:        (id)             => api.patch(`/users/${id}/toggle`),
  resetPassword: (id)             => api.post(`/users/${id}/reset-password`),
  importExcel:   (data)           => api.post('/users/import', data),
  bulkDelete:    (ids)            => api.delete('/users/bulk', { data: { ids } }),
  bulkToggle:    (ids, is_active) => api.patch('/users/bulk/toggle', { ids, is_active }),
}

// Document Types
export const docTypeService = {
  getAll:           ()           => api.get('/doc-types'),
  create:           (data)       => api.post('/doc-types', data),
  remove:           (id)         => api.delete(`/doc-types/${id}`),
  getAllCategories:  ()           => api.get('/doc-types/all-categories'),
  getCategories:    (id)         => api.get(`/doc-types/${id}/categories`),
  createCategory:   (id, data)   => api.post(`/doc-types/${id}/categories`, data),
  removeCategory:   (id, catId)  => api.delete(`/doc-types/${id}/categories/${catId}`),
}

// Announcements
export const announcementService = {
  getAll:     ()   => api.get('/announcements'),
  getPublic:  ()   => api.get('/announcements/public'),
  create:     (data) => api.post('/announcements', data),
  markRead:   (id) => api.put(`/announcements/${id}/read`),
  markAllRead: ()  => api.put('/announcements/read-all'),
  remove:     (id) => api.delete(`/announcements/${id}`),
}

export default api

// Executive
export const executiveService = {
  getOverview:     ()       => api.get('/executive/overview'),
  getPrograms:     ()       => api.get('/executive/programs'),
  getDocuments:    (params) => api.get('/executive/documents', { params }),
}

// Admin
export const adminService = {
  getStats: () => api.get('/admin/stats'),
}

// Settings (admin only)
export const settingsService = {
  getAll:          ()           => api.get('/settings'),
  bulkUpdate:      (settings)  => api.put('/settings', { settings }),
  getTemplates:    ()           => api.get('/settings/email-templates'),
  updateTemplate:  (key, data) => api.put(`/settings/email-templates/${key}`, data),
}

// Reference data
export const referenceService = {
  getAcademicOptions: () => api.get('/reference/academic-options'),
}

// Program & Affiliation management (admin only)
export const programService = {
  getPrograms:        ()          => api.get('/reference/programs'),
  createProgram:      (data)      => api.post('/reference/programs', data),
  updateProgram:      (id, data)  => api.put(`/reference/programs/${id}`, data),
  deleteProgram:      (id)        => api.delete(`/reference/programs/${id}`),
  getAffiliations:    ()          => api.get('/reference/affiliations'),
  createAffiliation:  (data)      => api.post('/reference/affiliations', data),
  updateAffiliation:  (id, data)  => api.put(`/reference/affiliations/${id}`, data),
  deleteAffiliation:  (id)        => api.delete(`/reference/affiliations/${id}`),
}

const express = require('express')
const router  = express.Router()
const { authenticate, authorize } = require('../middlewares/auth')
const {
  getUsers, searchUsers, createUser, updateUser,
  toggleUser, resetPassword, importUsers, getAdvisors,
  getMyAdvisees,
  bulkDeleteUsers, bulkToggleUsers, updateUserStatus,
  bulkUpdateUserStatus, updateUserRole,
} = require('../controllers/user.controller')

const adminOnly = [authenticate, authorize('admin')]

// Specific routes before parameterized ones
router.get('/',                    ...adminOnly, getUsers)
router.get('/search',              ...adminOnly, searchUsers)
router.get('/advisors',            authenticate, getAdvisors)
router.get('/my-advisees',         authenticate, authorize('advisor'), getMyAdvisees)
router.post('/',                   ...adminOnly, createUser)
router.post('/import',             ...adminOnly, importUsers)
router.delete('/bulk',             ...adminOnly, bulkDeleteUsers)
router.patch('/bulk/toggle',       ...adminOnly, bulkToggleUsers)
router.patch('/bulk/status',       ...adminOnly, bulkUpdateUserStatus)
// Parameterized routes
router.put('/:id',                 ...adminOnly, updateUser)
router.patch('/:id/toggle',        ...adminOnly, toggleUser)
router.patch('/:id/role',          ...adminOnly, updateUserRole)
router.patch('/:id/status',        ...adminOnly, updateUserStatus)
router.post('/:id/reset-password', ...adminOnly, resetPassword)

module.exports = router

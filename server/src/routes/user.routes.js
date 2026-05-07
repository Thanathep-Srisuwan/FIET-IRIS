const express = require('express')
const router  = express.Router()
const { authenticate, authorize } = require('../middlewares/auth')
const {
  getUsers, searchUsers, createUser, updateUser,
  toggleUser, resetPassword, importUsers, getAdvisors,
} = require('../controllers/user.controller')

const adminOnly = [authenticate, authorize('admin')]

router.get('/',                   ...adminOnly, getUsers)
router.get('/search',             ...adminOnly, searchUsers)
router.get('/advisors',           authenticate, getAdvisors)
router.post('/',                  ...adminOnly, createUser)
router.post('/import',            ...adminOnly, importUsers)
router.put('/:id',                ...adminOnly, updateUser)
router.patch('/:id/toggle',       ...adminOnly, toggleUser)
router.post('/:id/reset-password',...adminOnly, resetPassword)

module.exports = router

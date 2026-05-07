const express = require('express')
const router  = express.Router()
const { authenticate } = require('../middlewares/auth')
const { getUnread, getAll, markRead, markAllRead } = require('../controllers/notification.controller')

router.get('/',            authenticate, getAll)
router.get('/unread',      authenticate, getUnread)
router.put('/read-all',    authenticate, markAllRead)
router.put('/:id/read',    authenticate, markRead)

module.exports = router

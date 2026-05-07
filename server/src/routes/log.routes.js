const express = require('express')
const router  = express.Router()
const { authenticate, authorize } = require('../middlewares/auth')
const { getDeletionLogs } = require('../controllers/log.controller')

router.get('/deletions', authenticate, authorize('admin'), getDeletionLogs)

module.exports = router

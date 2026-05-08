const express = require('express')
const router  = express.Router()
const { authenticate, authorize } = require('../middlewares/auth')
const { getAdminStats } = require('../controllers/admin.controller')

router.get('/stats', authenticate, authorize('admin'), getAdminStats)

module.exports = router

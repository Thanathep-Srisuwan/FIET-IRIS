const express = require('express')
const router  = express.Router()
const { authenticate, authorize } = require('../middlewares/auth')
const { requirePasswordChange } = require('../middlewares/validate')
const { getStaffStats, getStaffHistory } = require('../controllers/staff.controller')

const staffOnly = [authenticate, requirePasswordChange, authorize('staff')]

router.get('/stats',   ...staffOnly, getStaffStats)
router.get('/history', ...staffOnly, getStaffHistory)

module.exports = router

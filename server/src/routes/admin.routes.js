const express = require('express')
const router  = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { authenticate, authorize } = require('../middlewares/auth')
const { getAdminStats, sendManualEmail, getActivityLogs } = require('../controllers/admin.controller')

const manualEmailDir = path.join(__dirname, '../../uploads/manual-email')
if (!fs.existsSync(manualEmailDir)) fs.mkdirSync(manualEmailDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, manualEmailDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
      cb(null, `${unique}${path.extname(file.originalname)}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
})

router.get('/stats',          authenticate, authorize('admin'), getAdminStats)
router.get('/activity-logs',  authenticate, authorize('admin'), getActivityLogs)
router.post('/email/user',    authenticate, authorize('admin'), upload.array('attachments', 5), sendManualEmail)

module.exports = router

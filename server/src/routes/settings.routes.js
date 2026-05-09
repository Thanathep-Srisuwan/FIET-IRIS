const express  = require('express')
const router   = express.Router()
const { authenticate, authorize } = require('../middlewares/auth')
const {
  getAllSettings, bulkUpdateSettings,
  getAllTemplates, updateTemplate,
} = require('../controllers/settings.controller')

router.use(authenticate)
router.use(authorize('admin'))

// System settings
router.get('/',         getAllSettings)
router.put('/',         bulkUpdateSettings)

// Email templates
router.get('/email-templates',       getAllTemplates)
router.put('/email-templates/:key',  updateTemplate)

module.exports = router

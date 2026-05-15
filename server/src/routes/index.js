const express = require('express')
const router  = express.Router()

router.use('/auth',       require('./auth.routes'))
router.use('/users',      require('./user.routes'))
router.use('/documents',  require('./document.routes'))
router.use('/notifications', require('./notification.routes'))
router.use('/logs',       require('./log.routes'))
router.use('/executive',     require('./executive.routes'))
router.use('/announcements', require('./announcement.routes'))
router.use('/doc-types',    require('./doctype.routes'))
router.use('/admin',        require('./admin.routes'))
router.use('/settings',     require('./settings.routes'))
router.use('/reference',    require('./reference.routes'))
router.use('/faq',          require('./faq.routes'))
router.use('/staff',        require('./staff.routes'))

module.exports = router

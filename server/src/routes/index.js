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

module.exports = router

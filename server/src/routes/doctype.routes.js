const express = require('express')
const router  = express.Router()
const { authenticate, authorize } = require('../middlewares/auth')
const { getAll, create, remove } = require('../controllers/doctype.controller')

router.get('/',       authenticate,                     getAll)
router.post('/',      authenticate, authorize('admin'), create)
router.delete('/:id', authenticate, authorize('admin'), remove)

module.exports = router

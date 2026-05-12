const express = require('express')
const router  = express.Router()
const { authenticate, authorize } = require('../middlewares/auth')
const { getOverview, getProgramSummary, getAllDocuments } = require('../controllers/executive.controller')

const exec = [authenticate, authorize('admin', 'executive')]

router.get('/overview',   ...exec, getOverview)
router.get('/programs',   ...exec, getProgramSummary)
router.get('/branches',   ...exec, getProgramSummary)
router.get('/documents',  ...exec, getAllDocuments)

module.exports = router

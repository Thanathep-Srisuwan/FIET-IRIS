const express = require('express')
const router  = express.Router()
const { authenticate, authorize } = require('../middlewares/auth')
const { getOverview, getBranchSummary, getAllDocuments } = require('../controllers/executive.controller')

const exec = [authenticate, authorize('admin', 'executive')]

router.get('/overview',   ...exec, getOverview)
router.get('/branches',   ...exec, getBranchSummary)
router.get('/documents',  ...exec, getAllDocuments)

module.exports = router

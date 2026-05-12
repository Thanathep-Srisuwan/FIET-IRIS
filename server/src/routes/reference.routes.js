const express = require('express')
const { authenticate, authorize } = require('../middlewares/auth')
const {
  getAcademicOptions,
  getPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  getAffiliations,
  createAffiliation,
  updateAffiliation,
  deleteAffiliation,
} = require('../controllers/reference.controller')

const router = express.Router()

router.get('/academic-options', authenticate, getAcademicOptions)

// Admin-only program management
router.get('/programs',        authenticate, authorize('admin'), getPrograms)
router.post('/programs',       authenticate, authorize('admin'), createProgram)
router.put('/programs/:id',    authenticate, authorize('admin'), updateProgram)
router.delete('/programs/:id', authenticate, authorize('admin'), deleteProgram)

// Admin-only affiliation management
router.get('/affiliations',           authenticate, authorize('admin'), getAffiliations)
router.post('/affiliations',          authenticate, authorize('admin'), createAffiliation)
router.put('/affiliations/:id',       authenticate, authorize('admin'), updateAffiliation)
router.delete('/affiliations/:id',    authenticate, authorize('admin'), deleteAffiliation)

module.exports = router

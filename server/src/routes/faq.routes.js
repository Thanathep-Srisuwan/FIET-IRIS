const express  = require('express')
const router   = express.Router()
const { authenticate, authorize } = require('../middlewares/auth')
const { requirePasswordChange } = require('../middlewares/validate')
const { getFaq, createFaq, updateFaq, deleteFaq } = require('../controllers/faq.controller')

const auth      = [authenticate, requirePasswordChange]
const adminOnly = [authenticate, requirePasswordChange, authorize('admin')]

router.get('/',     ...auth,      getFaq)
router.post('/',    ...adminOnly, createFaq)
router.put('/:id',  ...adminOnly, updateFaq)
router.delete('/:id',...adminOnly, deleteFaq)

module.exports = router

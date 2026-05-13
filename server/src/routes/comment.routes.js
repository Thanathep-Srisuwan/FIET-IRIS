const express  = require('express')
const router   = express.Router({ mergeParams: true }) // รับ :docId จาก parent
const { authenticate } = require('../middlewares/auth')
const { requirePasswordChange } = require('../middlewares/validate')
const { getComments, createComment, updateComment, deleteComment } = require('../controllers/comment.controller')

const auth = [authenticate, requirePasswordChange]

router.get('/',             ...auth, getComments)
router.post('/',            ...auth, createComment)
router.put('/:commentId',   ...auth, updateComment)
router.delete('/:commentId',...auth, deleteComment)

module.exports = router

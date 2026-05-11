const express = require('express')
const router  = express.Router()
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const { authenticate, authorize } = require('../middlewares/auth')
const { getAll, getPublic, create, markRead, markAllRead, remove } = require('../controllers/announcement.controller')

const announcementsDir = path.join(__dirname, '../../uploads/announcements')
if (!fs.existsSync(announcementsDir)) fs.mkdirSync(announcementsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, announcementsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  },
})

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp']
  const ext = path.extname(file.originalname).toLowerCase()
  allowed.includes(ext) ? cb(null, true) : cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (.jpg, .jpeg, .png, .webp)'))
}

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
})

router.get('/public',     getPublic)
router.get('/',           authenticate,                      getAll)
router.post('/',          authenticate, authorize('admin'),  upload.single('image'), create)
router.put('/read-all',   authenticate,                      markAllRead)
router.put('/:id/read',   authenticate,                      markRead)
router.delete('/:id',     authenticate, authorize('admin'),  remove)

module.exports = router

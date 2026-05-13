const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const {
  login,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  updateProfilePicture,
  removeProfilePicture,
  getProfile,
} = require('../controllers/auth.controller')
const { authenticate } = require('../middlewares/auth')

const profilesDir = path.join(__dirname, '../../uploads/profiles')
if (!fs.existsSync(profilesDir)) fs.mkdirSync(profilesDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profilesDir),
  filename: (req, file, cb) => {
    const unique = `${req.user.user_id}-${Date.now()}-${Math.round(Math.random() * 1e6)}`
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`)
  },
})

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp']
  const ext = path.extname(file.originalname).toLowerCase()
  allowed.includes(ext) ? cb(null, true) : cb(new Error('Only .jpg, .jpeg, .png, and .webp images are supported'))
}

const uploadProfileImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
})

router.post('/login',           login)
router.post('/forgot-password', forgotPassword)
router.post('/refresh',         refresh)
router.post('/logout',          authenticate, logout)
router.get('/profile',          authenticate, getProfile)
router.put('/change-password',  authenticate, changePassword)
router.put('/profile-picture',  authenticate, uploadProfileImage.single('image'), updateProfilePicture)
router.delete('/profile-picture', authenticate, removeProfilePicture)

module.exports = router

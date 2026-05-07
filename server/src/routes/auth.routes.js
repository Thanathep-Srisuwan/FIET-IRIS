const express = require('express')
const router = express.Router()
const { login, refresh, logout, changePassword } = require('../controllers/auth.controller')
const { authenticate } = require('../middlewares/auth')

router.post('/login',           login)
router.post('/refresh',         refresh)
router.post('/logout',          authenticate, logout)
router.put('/change-password',  authenticate, changePassword)

module.exports = router

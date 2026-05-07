require('dotenv').config()
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const path = require('path')
const logger = require('./utils/logger')
const { runScheduler } = require('./schedulers/documentScheduler')

const app = express()

// Security Headers
app.use(helmet())

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))

// Rate Limiting
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 20,
  message: { message: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที' },
}))

// Body Parser
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Routes
app.use('/api', require('./routes/index'))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'FIET-IRIS', timestamp: new Date() })
})

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'ไม่พบ endpoint ที่ร้องขอ' })
})

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message}`)
  res.status(err.status || 500).json({ message: err.message || 'เกิดข้อผิดพลาดภายในระบบ' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  logger.info(`🚀 FIET-IRIS Server รันที่ port ${PORT}`)
  runScheduler()
})

module.exports = app

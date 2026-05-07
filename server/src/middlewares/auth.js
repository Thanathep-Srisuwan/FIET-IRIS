const jwt = require('jsonwebtoken')

// ตรวจ Access Token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' })
  }
}

// ตรวจ Role
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้' })
  }
  next()
}

module.exports = { authenticate, authorize }

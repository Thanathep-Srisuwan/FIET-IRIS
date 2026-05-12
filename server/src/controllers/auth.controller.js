const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')
const { sendMail, temporaryPasswordTemplate } = require('../utils/mailer')

const ensureUserProgramColumn = async (pool) => {
  await pool.request().query(`
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='department')
       AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='program')
      EXEC sp_rename 'dbo.USERS.department', 'program', 'COLUMN';
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='program')
      ALTER TABLE dbo.USERS ADD program NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='affiliation')
      ALTER TABLE dbo.USERS ADD affiliation NVARCHAR(100) NULL;
  `)
}

// สร้าง tokens
const generateTokens = (user) => {
  const payload = {
    user_id:       user.user_id,
    email:         user.email,
    role:          user.role,
    must_change_pw: user.must_change_pw,
  }
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  })
  const refreshToken = jwt.sign(
    { user_id: user.user_id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  )
  return { token, refreshToken }
}

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password)
      return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' })

    if (!email.endsWith('@kmutt.ac.th'))
      return res.status(400).json({ message: 'กรุณาใช้อีเมลมหาวิทยาลัย @kmutt.ac.th เท่านั้น' })

    const pool = await getPool()
    await ensureUserProgramColumn(pool)
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM dbo.USERS WHERE email = @email AND is_active = 1')

    if (result.recordset.length === 0)
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })

    const user = result.recordset[0]
    const isMatch = await bcrypt.compare(password, user.password_hash)

    if (!isMatch)
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })

    // อัปเดต last_login
    await pool.request()
      .input('user_id', sql.Int, user.user_id)
      .query('UPDATE dbo.USERS SET last_login = GETDATE() WHERE user_id = @user_id')

    const { token, refreshToken } = generateTokens(user)

    logger.info(`User login: ${user.email} (${user.role})`)

    res.json({
      token,
      refreshToken,
      user: {
        user_id:       user.user_id,
        name:          user.name,
        email:         user.email,
        role:          user.role,
        program:    user.program,
        affiliation: user.affiliation,
        must_change_pw: user.must_change_pw,
      },
    })
  } catch (err) {
    logger.error(`Login error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken)
      return res.status(401).json({ message: 'ไม่พบ Refresh Token' })

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

    const pool = await getPool()
    await ensureUserProgramColumn(pool)
    const result = await pool.request()
      .input('user_id', sql.Int, decoded.user_id)
      .query('SELECT * FROM dbo.USERS WHERE user_id = @user_id AND is_active = 1')

    if (result.recordset.length === 0)
      return res.status(401).json({ message: 'ไม่พบผู้ใช้' })

    const user = result.recordset[0]
    const tokens = generateTokens(user)

    res.json({
      ...tokens,
      user: {
        user_id:       user.user_id,
        name:          user.name,
        email:         user.email,
        role:          user.role,
        program:       user.program,
        affiliation:   user.affiliation,
        must_change_pw: user.must_change_pw,
      },
    })
  } catch (err) {
    res.status(401).json({ message: 'Refresh Token ไม่ถูกต้องหรือหมดอายุ' })
  }
}

// POST /api/auth/logout
const logout = async (req, res) => {
  // JWT stateless — client ลบ token เอง
  res.json({ message: 'ออกจากระบบสำเร็จ' })
}

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body
    const user_id = req.user.user_id

    if (!current_password || !new_password)
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' })

    if (new_password.length < 8)
      return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' })

    const pool = await getPool()
    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query('SELECT password_hash FROM dbo.USERS WHERE user_id = @user_id')

    const user = result.recordset[0]
    const isMatch = await bcrypt.compare(current_password, user.password_hash)

    if (!isMatch)
      return res.status(400).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' })

    const newHash = await bcrypt.hash(new_password, 12)

    await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('hash', sql.NVarChar, newHash)
      .query(`
        UPDATE dbo.USERS
        SET password_hash = @hash, must_change_pw = 0, updated_at = GETDATE()
        WHERE user_id = @user_id
      `)

    logger.info(`Password changed: user_id ${user_id}`)
    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' })
  } catch (err) {
    logger.error(`Change password error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const genericMessage = 'หากอีเมลนี้มีบัญชีในระบบ ระบบจะส่งวิธีรีเซ็ตรหัสผ่านไปให้'

  try {
    const email = String(req.body.email || '').trim().toLowerCase()

    if (!email || !email.endsWith('@kmutt.ac.th')) {
      return res.json({ message: genericMessage })
    }

    const pool = await getPool()
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT user_id, name, email FROM dbo.USERS WHERE email = @email AND is_active = 1')

    if (result.recordset.length === 0) {
      logger.info(`Forgot password requested for unknown/inactive email: ${email}`)
      return res.json({ message: genericMessage })
    }

    const user = result.recordset[0]
    const tempPassword = `Iris@${Math.random().toString(36).slice(-6).toUpperCase()}`
    const hash = await bcrypt.hash(tempPassword, 12)

    await pool.request()
      .input('user_id', sql.Int, user.user_id)
      .input('hash', sql.NVarChar, hash)
      .query(`
        UPDATE dbo.USERS
        SET password_hash = @hash, must_change_pw = 1, updated_at = GETDATE()
        WHERE user_id = @user_id
      `)

    await sendMail({
      to: user.email,
      ...temporaryPasswordTemplate({ name: user.name, email: user.email, tempPassword, reason: 'reset' }),
    })

    logger.info(`Forgot password reset issued: user_id ${user.user_id}`)
    res.json({ message: genericMessage })
  } catch (err) {
    logger.error(`Forgot password error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { login, refresh, logout, changePassword, forgotPassword }

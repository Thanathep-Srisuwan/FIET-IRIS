const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')
const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')
const { sendMail, temporaryPasswordTemplate } = require('../utils/mailer')

const ensureUserProfileColumns = async (pool) => {
  await pool.request().query(`
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='department')
       AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='program')
      EXEC sp_rename 'dbo.USERS.department', 'program', 'COLUMN';
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='program')
      ALTER TABLE dbo.USERS ADD program NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='affiliation')
      ALTER TABLE dbo.USERS ADD affiliation NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='profile_image_url')
      ALTER TABLE dbo.USERS ADD profile_image_url NVARCHAR(500) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='account_status')
      ALTER TABLE dbo.USERS ADD account_status NVARCHAR(30) NOT NULL CONSTRAINT DF_USERS_account_status DEFAULT 'active';
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='graduated_at')
      ALTER TABLE dbo.USERS ADD graduated_at DATETIME NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='archived_at')
      ALTER TABLE dbo.USERS ADD archived_at DATETIME NULL;
    EXEC('UPDATE dbo.USERS
      SET account_status = CASE WHEN is_active = 1 THEN ''active'' ELSE ''inactive'' END
      WHERE account_status IS NULL');
  `)
}

const toPublicUser = (user) => ({
  user_id: user.user_id,
  name: user.name,
  email: user.email,
  role: user.role,
  program: user.program,
  affiliation: user.affiliation,
  profile_image_url: user.profile_image_url || null,
  account_status: user.account_status || 'active',
  must_change_pw: user.must_change_pw,
})

const getPublicUserById = async (pool, userId) => {
  const result = await pool.request()
    .input('user_id', sql.Int, userId)
    .query(`
      SELECT user_id, name, email, role, program, affiliation, profile_image_url, account_status, must_change_pw
      FROM dbo.USERS
      WHERE user_id = @user_id AND is_active = 1
    `)
  return result.recordset[0] ? toPublicUser(result.recordset[0]) : null
}

const removeLocalProfileImage = (imageUrl) => {
  if (!imageUrl || !imageUrl.startsWith('/uploads/profiles/')) return
  const uploadRoot = path.resolve(__dirname, '../../uploads/profiles')
  const filePath = path.resolve(__dirname, '../..', imageUrl.slice(1))
  if (!filePath.startsWith(uploadRoot)) return
  fs.promises.unlink(filePath).catch(() => {})
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
    await ensureUserProfileColumns(pool)
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
      user: toPublicUser(user),
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
    await ensureUserProfileColumns(pool)
    const result = await pool.request()
      .input('user_id', sql.Int, decoded.user_id)
      .query('SELECT * FROM dbo.USERS WHERE user_id = @user_id AND is_active = 1')

    if (result.recordset.length === 0)
      return res.status(401).json({ message: 'ไม่พบผู้ใช้' })

    const user = result.recordset[0]
    const tokens = generateTokens(user)

    res.json({
      ...tokens,
      user: toPublicUser(user),
    })
  } catch (err) {
    res.status(401).json({ message: 'Refresh Token ไม่ถูกต้องหรือหมดอายุ' })
  }
}

// PUT /api/auth/profile-picture
const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' })
    }

    const userId = req.user.user_id
    const imageUrl = `/uploads/profiles/${req.file.filename}`
    const pool = await getPool()
    await ensureUserProfileColumns(pool)

    const current = await pool.request()
      .input('user_id', sql.Int, userId)
      .query('SELECT profile_image_url FROM dbo.USERS WHERE user_id = @user_id AND is_active = 1')

    if (current.recordset.length === 0) {
      removeLocalProfileImage(imageUrl)
      return res.status(404).json({ message: 'User not found' })
    }

    await pool.request()
      .input('user_id', sql.Int, userId)
      .input('profile_image_url', sql.NVarChar(500), imageUrl)
      .query(`
        UPDATE dbo.USERS
        SET profile_image_url = @profile_image_url, updated_at = GETDATE()
        WHERE user_id = @user_id
      `)

    removeLocalProfileImage(current.recordset[0].profile_image_url)
    const user = await getPublicUserById(pool, userId)
    logger.info(`Profile picture updated: user_id ${userId}`)
    res.json({ message: 'Profile picture updated', user })
  } catch (err) {
    logger.error(`Update profile picture error: ${err.message}`)
    res.status(500).json({ message: 'Something went wrong. Please try again.' })
  }
}

// DELETE /api/auth/profile-picture
const removeProfilePicture = async (req, res) => {
  try {
    const userId = req.user.user_id
    const pool = await getPool()
    await ensureUserProfileColumns(pool)

    const current = await pool.request()
      .input('user_id', sql.Int, userId)
      .query('SELECT profile_image_url FROM dbo.USERS WHERE user_id = @user_id AND is_active = 1')

    if (current.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        UPDATE dbo.USERS
        SET profile_image_url = NULL, updated_at = GETDATE()
        WHERE user_id = @user_id
      `)

    removeLocalProfileImage(current.recordset[0].profile_image_url)
    const user = await getPublicUserById(pool, userId)
    logger.info(`Profile picture removed: user_id ${userId}`)
    res.json({ message: 'Profile picture removed', user })
  } catch (err) {
    logger.error(`Remove profile picture error: ${err.message}`)
    res.status(500).json({ message: 'Something went wrong. Please try again.' })
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

// GET /api/auth/profile — ดึงข้อมูลโปรไฟล์พร้อมข้อมูลอาจารย์ที่ปรึกษา
const getProfile = async (req, res) => {
  try {
    const { user_id } = req.user
    const pool = await getPool()
    await ensureUserProfileColumns(pool)

    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT
          u.user_id, u.name, u.email, u.role, u.program, u.affiliation,
          u.profile_image_url, u.account_status, u.must_change_pw,
          u.student_id, u.degree_level, u.phone,
          a.user_id   AS advisor_id,
          a.name      AS advisor_name,
          a.email     AS advisor_email,
          a.profile_image_url AS advisor_image_url
        FROM dbo.USERS u
        LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
        WHERE u.user_id = @user_id AND u.is_active = 1
      `)

    if (!result.recordset[0])
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' })

    const row = result.recordset[0]
    res.json({
      user: {
        ...toPublicUser(row),
        student_id:    row.student_id || null,
        degree_level:  row.degree_level || null,
        phone:         row.phone || null,
        advisor: row.advisor_id ? {
          user_id:           row.advisor_id,
          name:              row.advisor_name,
          email:             row.advisor_email,
          profile_image_url: row.advisor_image_url,
        } : null,
      },
    })
  } catch (err) {
    logger.error(`getProfile: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { login, refresh, logout, changePassword, forgotPassword, updateProfilePicture, removeProfilePicture, getProfile }

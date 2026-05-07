const bcrypt = require('bcrypt')
const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')
const { sendMail } = require('../utils/mailer')

// เพิ่ม column student_id ถ้ายังไม่มี (idempotent)
const ensureStudentIdColumn = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.USERS') AND name = 'student_id'
    )
    ALTER TABLE dbo.USERS ADD student_id NVARCHAR(50) NULL
  `)
}

// GET /api/users — ดูรายชื่อทั้งหมด พร้อม filter และ search
const getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit
    const pool = await getPool()
    await ensureStudentIdColumn(pool)

    let where = 'WHERE u.user_id != @self_id'
    const inputs = [{ name: 'self_id', type: sql.Int, value: req.user.user_id }]

    if (role) {
      where += ' AND u.role = @role'
      inputs.push({ name: 'role', type: sql.NVarChar, value: role })
    }
    if (search) {
      where += ' AND (u.name LIKE @search OR u.email LIKE @search OR u.student_id LIKE @search)'
      inputs.push({ name: 'search', type: sql.NVarChar, value: `%${search}%` })
    }

    const req2 = pool.request()
    inputs.forEach(i => req2.input(i.name, i.type, i.value))

    const result = await req2.query(`
      SELECT
        u.user_id, u.name, u.email, u.student_id, u.role, u.department,
        u.is_active, u.must_change_pw, u.last_login, u.created_at,
        a.name AS advisor_name,
        (SELECT COUNT(*) FROM dbo.DOCUMENTS d WHERE d.user_id = u.user_id AND d.status != 'deleted') AS doc_count
      FROM dbo.USERS u
      LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
      ${where}
      ORDER BY u.created_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `)

    const countReq = pool.request()
    inputs.forEach(i => countReq.input(i.name, i.type, i.value))
    const countResult = await countReq.query(
      `SELECT COUNT(*) AS total FROM dbo.USERS u ${where}`
    )

    res.json({
      users: result.recordset,
      total: countResult.recordset[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
    })
  } catch (err) {
    logger.error(`getUsers error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/users/search?q=xxx — ค้นหาด้วย student_id, ชื่อ, หรืออีเมล (สำหรับ admin เลือกเจ้าของเอกสาร)
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query
    if (!q?.trim()) return res.json([])
    const pool = await getPool()
    await ensureStudentIdColumn(pool)
    const result = await pool.request()
      .input('q', sql.NVarChar, `%${q.trim()}%`)
      .query(`
        SELECT TOP 15 user_id, name, email, student_id, role, department
        FROM dbo.USERS
        WHERE is_active = 1 AND role != 'admin'
          AND (student_id LIKE @q OR name LIKE @q OR email LIKE @q)
        ORDER BY student_id, name
      `)
    res.json(result.recordset)
  } catch (err) {
    logger.error(`searchUsers: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/users — เพิ่มผู้ใช้ทีละคน
const createUser = async (req, res) => {
  try {
    const { name, email, role, advisor_id, department, student_id } = req.body

    if (!name || !email || !role)
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' })
    if (!email.endsWith('@kmutt.ac.th'))
      return res.status(400).json({ message: 'กรุณาใช้อีเมล @kmutt.ac.th เท่านั้น' })
    if (role === 'student' && !advisor_id)
      return res.status(400).json({ message: 'นักศึกษาต้องระบุอาจารย์ที่ปรึกษา' })

    const pool = await getPool()
    await ensureStudentIdColumn(pool)

    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT user_id FROM dbo.USERS WHERE email = @email')
    if (existing.recordset.length > 0)
      return res.status(400).json({ message: 'อีเมลนี้มีในระบบแล้ว' })

    const tempPassword = `Iris@${Math.random().toString(36).slice(-6).toUpperCase()}`
    const hash = await bcrypt.hash(tempPassword, 12)

    await pool.request()
      .input('name',       sql.NVarChar, name)
      .input('email',      sql.NVarChar, email)
      .input('hash',       sql.NVarChar, hash)
      .input('role',       sql.NVarChar, role)
      .input('advisor_id', sql.Int,      advisor_id || null)
      .input('department', sql.NVarChar, department || null)
      .input('student_id', sql.NVarChar, student_id?.trim() || null)
      .query(`
        INSERT INTO dbo.USERS (name, email, password_hash, role, advisor_id, department, student_id, must_change_pw)
        VALUES (@name, @email, @hash, @role, @advisor_id, @department, @student_id, 1)
      `)

    await sendMail({
      to: email,
      subject: '[FIET-IRIS] บัญชีผู้ใช้งานของคุณถูกสร้างแล้ว',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#0d2d3e">ยินดีต้อนรับสู่ FIET-IRIS</h2>
          <p>เรียน คุณ${name}</p>
          <p>บัญชีของคุณถูกสร้างแล้ว กรุณาเข้าสู่ระบบด้วยข้อมูลต่อไปนี้</p>
          <table style="background:#f8fafc;padding:16px;border-radius:8px;width:100%">
            <tr><td style="color:#64748b">อีเมล</td><td><strong>${email}</strong></td></tr>
            <tr><td style="color:#64748b">รหัสผ่านชั่วคราว</td><td><strong>${tempPassword}</strong></td></tr>
          </table>
          <p style="color:#f7924a;font-size:13px">⚠️ กรุณาเปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบครั้งแรก</p>
        </div>
      `,
    })

    logger.info(`User created: ${email} (${role}) by admin ${req.user.user_id}`)
    res.status(201).json({ message: `สร้างบัญชีสำเร็จ ส่งรหัสผ่านไปยัง ${email} แล้ว` })
  } catch (err) {
    logger.error(`createUser error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PUT /api/users/:id — แก้ไขข้อมูลผู้ใช้
const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { name, role, advisor_id, department, student_id } = req.body
    const pool = await getPool()
    await ensureStudentIdColumn(pool)

    await pool.request()
      .input('user_id',    sql.Int,      id)
      .input('name',       sql.NVarChar, name)
      .input('role',       sql.NVarChar, role)
      .input('advisor_id', sql.Int,      advisor_id || null)
      .input('department', sql.NVarChar, department || null)
      .input('student_id', sql.NVarChar, student_id?.trim() || null)
      .query(`
        UPDATE dbo.USERS
        SET name=@name, role=@role, advisor_id=@advisor_id,
            department=@department, student_id=@student_id, updated_at=GETDATE()
        WHERE user_id=@user_id
      `)

    res.json({ message: 'แก้ไขข้อมูลสำเร็จ' })
  } catch (err) {
    logger.error(`updateUser error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PATCH /api/users/:id/toggle — เปิด/ปิดบัญชี
const toggleUser = async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getPool()

    const result = await pool.request()
      .input('user_id', sql.Int, id)
      .query('SELECT is_active, name FROM dbo.USERS WHERE user_id = @user_id')

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' })

    const current = result.recordset[0]
    const newStatus = current.is_active ? 0 : 1

    await pool.request()
      .input('user_id',   sql.Int, id)
      .input('is_active', sql.Bit, newStatus)
      .query('UPDATE dbo.USERS SET is_active=@is_active, updated_at=GETDATE() WHERE user_id=@user_id')

    logger.info(`User ${id} toggled to ${newStatus ? 'active' : 'inactive'}`)
    res.json({ message: `${newStatus ? 'เปิด' : 'ปิด'}บัญชี ${current.name} สำเร็จ`, is_active: newStatus })
  } catch (err) {
    logger.error(`toggleUser error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/users/:id/reset-password — รีเซ็ตรหัสผ่าน
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getPool()

    const result = await pool.request()
      .input('user_id', sql.Int, id)
      .query('SELECT name, email FROM dbo.USERS WHERE user_id = @user_id')

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' })

    const { name, email } = result.recordset[0]
    const tempPassword = `Iris@${Math.random().toString(36).slice(-6).toUpperCase()}`
    const hash = await bcrypt.hash(tempPassword, 12)

    await pool.request()
      .input('user_id', sql.Int,      id)
      .input('hash',    sql.NVarChar, hash)
      .query('UPDATE dbo.USERS SET password_hash=@hash, must_change_pw=1, updated_at=GETDATE() WHERE user_id=@user_id')

    await sendMail({
      to: email,
      subject: '[FIET-IRIS] รหัสผ่านของคุณถูกรีเซ็ตแล้ว',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#0d2d3e">รีเซ็ตรหัสผ่าน</h2>
          <p>เรียน คุณ${name} รหัสผ่านของคุณถูกรีเซ็ตโดยผู้ดูแลระบบ</p>
          <table style="background:#f8fafc;padding:16px;border-radius:8px;width:100%">
            <tr><td style="color:#64748b">รหัสผ่านชั่วคราว</td><td><strong>${tempPassword}</strong></td></tr>
          </table>
          <p style="color:#f7924a;font-size:13px">⚠️ กรุณาเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ</p>
        </div>
      `,
    })

    logger.info(`Password reset: user ${id} by admin ${req.user.user_id}`)
    res.json({ message: `รีเซ็ตรหัสผ่านสำเร็จ ส่งรหัสผ่านใหม่ไปยัง ${email} แล้ว` })
  } catch (err) {
    logger.error(`resetPassword error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/users/import — Import จาก Excel
const importUsers = async (req, res) => {
  try {
    const { users } = req.body
    if (!Array.isArray(users) || users.length === 0)
      return res.status(400).json({ message: 'ไม่พบข้อมูลผู้ใช้' })

    const pool = await getPool()
    await ensureStudentIdColumn(pool)
    const results = { success: 0, failed: 0, errors: [] }

    for (const u of users) {
      try {
        if (!u.name || !u.email || !u.role) {
          results.failed++
          results.errors.push(`${u.email || '?'}: ข้อมูลไม่ครบถ้วน`)
          continue
        }
        if (!u.email.endsWith('@kmutt.ac.th')) {
          results.failed++
          results.errors.push(`${u.email}: ต้องใช้อีเมล @kmutt.ac.th`)
          continue
        }

        const existing = await pool.request()
          .input('email', sql.NVarChar, u.email)
          .query('SELECT user_id FROM dbo.USERS WHERE email = @email')
        if (existing.recordset.length > 0) {
          results.failed++
          results.errors.push(`${u.email}: มีในระบบแล้ว`)
          continue
        }

        const tempPassword = `Iris@${Math.random().toString(36).slice(-6).toUpperCase()}`
        const hash = await bcrypt.hash(tempPassword, 12)

        await pool.request()
          .input('name',       sql.NVarChar, u.name)
          .input('email',      sql.NVarChar, u.email)
          .input('hash',       sql.NVarChar, hash)
          .input('role',       sql.NVarChar, u.role)
          .input('advisor_id', sql.Int,      u.advisor_id || null)
          .input('department', sql.NVarChar, u.department || null)
          .input('student_id', sql.NVarChar, u.student_id?.trim() || null)
          .query(`
            INSERT INTO dbo.USERS (name, email, password_hash, role, advisor_id, department, student_id, must_change_pw)
            VALUES (@name, @email, @hash, @role, @advisor_id, @department, @student_id, 1)
          `)

        await sendMail({
          to: u.email,
          subject: '[FIET-IRIS] บัญชีผู้ใช้งานของคุณถูกสร้างแล้ว',
          html: `<p>รหัสผ่านชั่วคราว: <strong>${tempPassword}</strong></p>`,
        })

        results.success++
      } catch (e) {
        results.failed++
        results.errors.push(`${u.email}: ${e.message}`)
      }
    }

    logger.info(`Import users: ${results.success} success, ${results.failed} failed`)
    res.json({ message: `นำเข้าสำเร็จ ${results.success} คน, ล้มเหลว ${results.failed} คน`, ...results })
  } catch (err) {
    logger.error(`importUsers error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/users/advisors — ดึงรายชื่ออาจารย์
const getAdvisors = async (req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request()
      .query("SELECT user_id, name, email FROM dbo.USERS WHERE role = 'advisor' AND is_active = 1 ORDER BY name")
    res.json({ advisors: result.recordset })
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { getUsers, searchUsers, createUser, updateUser, toggleUser, resetPassword, importUsers, getAdvisors }

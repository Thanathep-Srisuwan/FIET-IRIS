const bcrypt = require('bcrypt')
const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')
const { sendMail, temporaryPasswordTemplate } = require('../utils/mailer')
const { DEAN_OFFICE } = require('../constants/programs')

const normalizeProgramForRole = (role, program) => (
  role === 'student' ? (program || null) : null
)

const normalizeAffiliationForRole = (role, affiliation) => {
  if (role === 'executive') return DEAN_OFFICE
  return affiliation || null
}

const VALID_ACCOUNT_STATUSES = ['active', 'graduated', 'inactive', 'archived']
const VALID_ROLES = ['student', 'advisor', 'admin', 'executive', 'staff']

// เพิ่ม columns ถ้ายังไม่มี (idempotent)
const ensureColumns = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='student_id')
      ALTER TABLE dbo.USERS ADD student_id NVARCHAR(50) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='degree_level')
      ALTER TABLE dbo.USERS ADD degree_level NVARCHAR(20) NULL;
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

const ensureAdminRoleLogs = async (pool) => {
  await pool.request().query(`
    IF OBJECT_ID('dbo.ADMIN_ROLE_LOGS', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.ADMIN_ROLE_LOGS (
        role_log_id INT IDENTITY(1,1) PRIMARY KEY,
        actor_id INT NOT NULL,
        target_user_id INT NOT NULL,
        old_role NVARCHAR(30) NULL,
        new_role NVARCHAR(30) NOT NULL,
        action NVARCHAR(50) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE()
      )
    END
  `)
}

const getActiveAdminCount = async (pool) => {
  const result = await pool.request().query(`
    SELECT COUNT(*) AS total
    FROM dbo.USERS
    WHERE role = 'admin'
      AND is_active = 1
      AND account_status = 'active'
  `)
  return result.recordset[0]?.total || 0
}

const assertCanRemoveAdminAccess = async (pool, userId) => {
  const current = await pool.request()
    .input('user_id', sql.Int, userId)
    .query(`
      SELECT user_id, role, is_active, account_status
      FROM dbo.USERS
      WHERE user_id = @user_id
    `)

  if (current.recordset.length === 0) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }

  const user = current.recordset[0]
  const removesActiveAdmin = user.role === 'admin' && user.is_active && (user.account_status || 'active') === 'active'
  if (removesActiveAdmin) {
    const activeAdmins = await getActiveAdminCount(pool)
    if (activeAdmins <= 1) {
      const err = new Error('Cannot remove the last active admin. Assign another admin first.')
      err.status = 400
      throw err
    }
  }
  return user
}

const logAdminRoleChange = async (pool, { actorId, targetUserId, oldRole, newRole, action }) => {
  await ensureAdminRoleLogs(pool)
  await pool.request()
    .input('actor_id', sql.Int, actorId)
    .input('target_user_id', sql.Int, targetUserId)
    .input('old_role', sql.NVarChar, oldRole || null)
    .input('new_role', sql.NVarChar, newRole)
    .input('action', sql.NVarChar, action)
    .query(`
      INSERT INTO dbo.ADMIN_ROLE_LOGS (actor_id, target_user_id, old_role, new_role, action)
      VALUES (@actor_id, @target_user_id, @old_role, @new_role, @action)
    `)
}

// GET /api/users
const getUsers = async (req, res) => {
  try {
    const { role, search, status, account_status, degree_level, affiliation, sortBy = 'created_at', sortDir = 'desc', page = 1, limit = 20 } = req.query
    const program = req.query.program || req.query.department
    const offset = (page - 1) * limit
    const pool = await getPool()
    await ensureColumns(pool)

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
    if (program) {
      where += ' AND u.program = @program'
      inputs.push({ name: 'program', type: sql.NVarChar, value: program })
    }
    if (affiliation) {
      where += ' AND u.affiliation = @affiliation'
      inputs.push({ name: 'affiliation', type: sql.NVarChar, value: affiliation })
    }
    if (status === 'active') {
      where += ' AND u.is_active = 1'
    } else if (status === 'inactive') {
      where += ' AND u.is_active = 0'
    }
    if (account_status) {
      where += ' AND u.account_status = @account_status'
      inputs.push({ name: 'account_status', type: sql.NVarChar, value: account_status })
    }
    if (degree_level) {
      where += ' AND u.degree_level = @degree_level'
      inputs.push({ name: 'degree_level', type: sql.NVarChar, value: degree_level })
    }

    const SORT_COLS = {
      name: 'u.name', student_id: 'u.student_id', email: 'u.email',
      role: 'u.role', program: 'u.program', affiliation: 'u.affiliation', degree_level: 'u.degree_level',
      account_status: 'u.account_status', is_active: 'u.is_active', created_at: 'u.created_at', doc_count: 'doc_count',
    }
    const orderCol = SORT_COLS[sortBy] || 'u.created_at'
    const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC'

    const req2 = pool.request()
    inputs.forEach(i => req2.input(i.name, i.type, i.value))

    const result = await req2.query(`
      SELECT
        u.user_id, u.name, u.email, u.student_id, u.role, u.degree_level, u.advisor_id,
        u.program, u.affiliation, u.profile_image_url, u.account_status, u.graduated_at, u.archived_at,
        u.is_active, u.must_change_pw, u.last_login, u.created_at,
        a.name AS advisor_name,
        (SELECT COUNT(*) FROM dbo.DOCUMENTS d WHERE d.user_id = u.user_id AND d.status NOT IN ('deleted','trashed')) AS doc_count
      FROM dbo.USERS u
      LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
      ${where}
      ORDER BY ${orderCol} ${orderDir}
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

// GET /api/users/search?q=xxx
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query
    if (!q?.trim()) return res.json([])
    const pool = await getPool()
    await ensureColumns(pool)
    const result = await pool.request()
      .input('q', sql.NVarChar, `%${q.trim()}%`)
      .query(`
        SELECT TOP 15 user_id, name, email, student_id, role, degree_level, program, affiliation, profile_image_url
        FROM dbo.USERS
        WHERE is_active = 1 AND account_status = 'active' AND role != 'admin'
          AND (student_id LIKE @q OR name LIKE @q OR email LIKE @q)
        ORDER BY student_id, name
      `)
    res.json(result.recordset)
  } catch (err) {
    logger.error(`searchUsers: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/users
const createUser = async (req, res) => {
  try {
    const { name, email, role, advisor_id, student_id, degree_level } = req.body
    const program = normalizeProgramForRole(role, req.body.program || req.body.department)
    const affiliation = normalizeAffiliationForRole(role, req.body.affiliation)

    if (!name || !email || !role)
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' })
    if (!email.endsWith('@kmutt.ac.th'))
      return res.status(400).json({ message: 'กรุณาใช้อีเมล @kmutt.ac.th เท่านั้น' })
    if (!VALID_ROLES.includes(role))
      return res.status(400).json({ message: 'Role ไม่ถูกต้อง' })
    if (role === 'student' && !advisor_id)
      return res.status(400).json({ message: 'นักศึกษาต้องระบุอาจารย์ที่ปรึกษา' })

    const pool = await getPool()
    await ensureColumns(pool)

    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT user_id FROM dbo.USERS WHERE email = @email')
    if (existing.recordset.length > 0)
      return res.status(400).json({ message: 'อีเมลนี้มีในระบบแล้ว' })

    const tempPassword = `Iris@${Math.random().toString(36).slice(-6).toUpperCase()}`
    const hash = await bcrypt.hash(tempPassword, 12)

    await pool.request()
      .input('name',         sql.NVarChar, name)
      .input('email',        sql.NVarChar, email)
      .input('hash',         sql.NVarChar, hash)
      .input('role',         sql.NVarChar, role)
      .input('advisor_id',   sql.Int,      role === 'student' ? (advisor_id || null) : null)
      .input('program',   sql.NVarChar, program)
      .input('affiliation', sql.NVarChar, affiliation)
      .input('student_id',   sql.NVarChar, student_id?.trim() || null)
      .input('degree_level', sql.NVarChar, role === 'student' ? (degree_level || 'bachelor') : null)
      .query(`
        INSERT INTO dbo.USERS
          (name, email, password_hash, role, advisor_id, program, affiliation, student_id, degree_level, must_change_pw, account_status)
        VALUES
          (@name, @email, @hash, @role, @advisor_id, @program, @affiliation, @student_id, @degree_level, 1, 'active')
      `)

    await sendMail({
      to: email,
      ...temporaryPasswordTemplate({ name, email, tempPassword, reason: 'new_account' }),
    })

    logger.info(`User created: ${email} (${role}) by admin ${req.user.user_id}`)
    res.status(201).json({ message: `สร้างบัญชีสำเร็จ ส่งรหัสผ่านไปยัง ${email} แล้ว` })
  } catch (err) {
    logger.error(`createUser error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { name, role, advisor_id, student_id, degree_level } = req.body
    const program = normalizeProgramForRole(role, req.body.program || req.body.department)
    const affiliation = normalizeAffiliationForRole(role, req.body.affiliation)
    const pool = await getPool()
    await ensureColumns(pool)

    const current = await pool.request()
      .input('user_id', sql.Int, id)
      .query('SELECT user_id, role FROM dbo.USERS WHERE user_id = @user_id')

    if (current.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Role is invalid' })
    }
    if (parseInt(id, 10) === req.user.user_id && current.recordset[0].role === 'admin' && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot remove your own admin role' })
    }
    if (current.recordset[0].role === 'admin' && role !== 'admin') {
      await assertCanRemoveAdminAccess(pool, parseInt(id, 10))
    }

    await pool.request()
      .input('user_id',      sql.Int,      id)
      .input('name',         sql.NVarChar, name)
      .input('role',         sql.NVarChar, role)
      .input('advisor_id',   sql.Int,      role === 'student' ? (advisor_id || null) : null)
      .input('program',   sql.NVarChar, program)
      .input('affiliation', sql.NVarChar, affiliation)
      .input('student_id',   sql.NVarChar, student_id?.trim() || null)
      .input('degree_level', sql.NVarChar, role === 'student' ? (degree_level || 'bachelor') : null)
      .query(`
        UPDATE dbo.USERS
        SET name=@name, role=@role, advisor_id=@advisor_id,
            program=@program, affiliation=@affiliation, student_id=@student_id,
            degree_level=@degree_level, updated_at=GETDATE()
        WHERE user_id=@user_id
      `)

    const updated = await pool.request()
      .input('user_id', sql.Int, id)
      .query(`
        SELECT
          u.user_id, u.name, u.email, u.student_id, u.role, u.degree_level, u.advisor_id,
          u.program, u.affiliation, u.profile_image_url, u.account_status, u.graduated_at, u.archived_at,
          u.is_active, u.must_change_pw, u.last_login, u.created_at,
          a.name AS advisor_name,
          (SELECT COUNT(*) FROM dbo.DOCUMENTS d WHERE d.user_id = u.user_id AND d.status NOT IN ('deleted','trashed')) AS doc_count
        FROM dbo.USERS u
        LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
        WHERE u.user_id = @user_id
      `)

    if (current.recordset[0].role !== role) {
      await logAdminRoleChange(pool, {
        actorId: req.user.user_id,
        targetUserId: parseInt(id, 10),
        oldRole: current.recordset[0].role,
        newRole: role,
        action: role === 'admin' ? 'promote_admin' : current.recordset[0].role === 'admin' ? 'demote_admin' : 'change_role',
      })
      logger.info(`User ${id} role changed from ${current.recordset[0].role} to ${role} by admin ${req.user.user_id}`)
    }

    res.json({ message: 'User updated', user: updated.recordset[0] })
  } catch (err) {
    logger.error(`updateUser error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PATCH /api/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body
    const userId = parseInt(id, 10)

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Role is invalid' })
    }
    if (userId === req.user.user_id && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot remove your own admin role' })
    }

    const pool = await getPool()
    await ensureColumns(pool)

    const currentResult = await pool.request()
      .input('user_id', sql.Int, userId)
      .query('SELECT user_id, role FROM dbo.USERS WHERE user_id = @user_id')

    if (currentResult.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const current = currentResult.recordset[0]
    if (current.role === 'admin' && role !== 'admin') {
      await assertCanRemoveAdminAccess(pool, userId)
    }

    await pool.request()
      .input('user_id', sql.Int, userId)
      .input('role', sql.NVarChar, role)
      .input('program', sql.NVarChar, null)
      .input('affiliation', sql.NVarChar, role === 'executive' ? DEAN_OFFICE : null)
      .query(`
        UPDATE dbo.USERS
        SET role = @role,
            advisor_id = NULL,
            program = @program,
            affiliation = @affiliation,
            student_id = CASE WHEN @role = 'student' THEN student_id ELSE NULL END,
            degree_level = CASE WHEN @role = 'student' THEN ISNULL(degree_level, 'bachelor') ELSE NULL END,
            account_status = CASE WHEN account_status IN ('inactive', 'archived') THEN account_status ELSE 'active' END,
            is_active = CASE WHEN account_status IN ('inactive', 'archived') THEN is_active ELSE 1 END,
            updated_at = GETDATE()
        WHERE user_id = @user_id
      `)

    const updated = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT
          u.user_id, u.name, u.email, u.student_id, u.role, u.degree_level, u.advisor_id,
          u.program, u.affiliation, u.profile_image_url, u.account_status, u.graduated_at, u.archived_at,
          u.is_active, u.must_change_pw, u.last_login, u.created_at,
          a.name AS advisor_name,
          (SELECT COUNT(*) FROM dbo.DOCUMENTS d WHERE d.user_id = u.user_id AND d.status NOT IN ('deleted','trashed')) AS doc_count
        FROM dbo.USERS u
        LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
        WHERE u.user_id = @user_id
      `)

    if (current.role !== role) {
      await logAdminRoleChange(pool, {
        actorId: req.user.user_id,
        targetUserId: userId,
        oldRole: current.role,
        newRole: role,
        action: role === 'admin' ? 'promote_admin' : current.role === 'admin' ? 'demote_admin' : 'change_role',
      })
      logger.info(`User ${id} role changed from ${current.role} to ${role} by admin ${req.user.user_id}`)
    }

    res.json({ message: 'User role updated', user: updated.recordset[0] })
  } catch (err) {
    logger.error(`updateUserRole error: ${err.message}`)
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' })
  }
}

// PATCH /api/users/:id/toggle
const toggleUser = async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getPool()
    await ensureColumns(pool)

    const result = await pool.request()
      .input('user_id', sql.Int, id)
      .query('SELECT is_active, name, role FROM dbo.USERS WHERE user_id = @user_id')

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' })

    const current = result.recordset[0]
    const newStatus = current.is_active ? 0 : 1
    if (!newStatus && current.role === 'admin') {
      await assertCanRemoveAdminAccess(pool, parseInt(id, 10))
    }

    await pool.request()
      .input('user_id',   sql.Int, id)
      .input('is_active', sql.Bit, newStatus)
      .input('account_status', sql.NVarChar, newStatus ? 'active' : 'inactive')
      .query(`
        UPDATE dbo.USERS
        SET is_active=@is_active,
            account_status=@account_status,
            graduated_at = CASE WHEN @account_status = 'active' THEN NULL ELSE graduated_at END,
            archived_at = CASE WHEN @account_status = 'active' THEN NULL ELSE archived_at END,
            updated_at=GETDATE()
        WHERE user_id=@user_id
      `)

    logger.info(`User ${id} toggled to ${newStatus ? 'active' : 'inactive'}`)
    res.json({ message: `${newStatus ? 'เปิด' : 'ปิด'}บัญชี ${current.name} สำเร็จ`, is_active: newStatus })
  } catch (err) {
    logger.error(`toggleUser error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PATCH /api/users/:id/status
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { account_status } = req.body

    if (!VALID_ACCOUNT_STATUSES.includes(account_status)) {
      return res.status(400).json({ message: 'Account status is invalid' })
    }
    if (parseInt(id, 10) === req.user.user_id && account_status !== 'active') {
      return res.status(400).json({ message: 'Cannot disable your own account' })
    }

    const pool = await getPool()
    await ensureColumns(pool)

    const current = await pool.request()
      .input('user_id', sql.Int, id)
      .query('SELECT user_id, role FROM dbo.USERS WHERE user_id = @user_id')

    if (current.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }
    if (account_status === 'graduated' && current.recordset[0].role !== 'student') {
      return res.status(400).json({ message: 'Only student accounts can be marked as graduated' })
    }
    if (current.recordset[0].role === 'admin' && account_status !== 'active') {
      await assertCanRemoveAdminAccess(pool, parseInt(id, 10))
    }

    await pool.request()
      .input('user_id', sql.Int, id)
      .input('account_status', sql.NVarChar, account_status)
      .input('is_active', sql.Bit, account_status === 'active' ? 1 : 0)
      .input('archived_at', sql.DateTime, account_status === 'archived' ? new Date() : null)
      .query(`
        UPDATE dbo.USERS
        SET account_status = @account_status,
            is_active = @is_active,
            graduated_at = CASE
              WHEN @account_status = 'graduated' THEN ISNULL(graduated_at, GETDATE())
              WHEN @account_status = 'active' THEN NULL
              ELSE graduated_at
            END,
            archived_at = CASE
              WHEN @account_status = 'archived' THEN ISNULL(archived_at, @archived_at)
              WHEN @account_status = 'active' THEN NULL
              ELSE archived_at
            END,
            updated_at = GETDATE()
        WHERE user_id = @user_id
      `)

    logger.info(`User ${id} status changed to ${account_status} by admin ${req.user.user_id}`)
    res.json({ message: 'Account status updated', account_status, is_active: account_status === 'active' })
  } catch (err) {
    logger.error(`updateUserStatus error: ${err.message}`)
    res.status(500).json({ message: 'เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เธ เธฒเธขเนเธเธฃเธฐเธเธ' })
  }
}

// POST /api/users/:id/reset-password
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
      ...temporaryPasswordTemplate({ name, email, tempPassword, reason: 'reset' }),
    })

    logger.info(`Password reset: user ${id} by admin ${req.user.user_id}`)
    res.json({ message: `รีเซ็ตรหัสผ่านสำเร็จ ส่งรหัสผ่านใหม่ไปยัง ${email} แล้ว` })
  } catch (err) {
    logger.error(`resetPassword error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/users/import
const importUsers = async (req, res) => {
  try {
    const { users } = req.body
    if (!Array.isArray(users) || users.length === 0)
      return res.status(400).json({ message: 'ไม่พบข้อมูลผู้ใช้' })

    const pool = await getPool()
    await ensureColumns(pool)
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
        const role = u.role
        const degLevel = role === 'student' ? (u.degree_level || 'bachelor') : null
        const program = normalizeProgramForRole(role, u.program || u.department)
        const affiliation = normalizeAffiliationForRole(role, u.affiliation)

        await pool.request()
          .input('name',         sql.NVarChar, u.name)
          .input('email',        sql.NVarChar, u.email)
          .input('hash',         sql.NVarChar, hash)
          .input('role',         sql.NVarChar, role)
          .input('advisor_id',   sql.Int,      role === 'student' ? (u.advisor_id || null) : null)
          .input('program',   sql.NVarChar, program)
          .input('affiliation', sql.NVarChar, affiliation)
          .input('student_id',   sql.NVarChar, u.student_id?.trim() || null)
          .input('degree_level', sql.NVarChar, degLevel)
          .query(`
            INSERT INTO dbo.USERS
              (name, email, password_hash, role, advisor_id, program, affiliation, student_id, degree_level, must_change_pw, account_status)
            VALUES
              (@name, @email, @hash, @role, @advisor_id, @program, @affiliation, @student_id, @degree_level, 1, 'active')
          `)

        await sendMail({
          to: u.email,
          ...temporaryPasswordTemplate({ name: u.name, email: u.email, tempPassword, reason: 'new_account' }),
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

// GET /api/users/advisors
const getAdvisors = async (req, res) => {
  try {
    const pool = await getPool()
    await ensureColumns(pool)
    const result = await pool.request()
      .query("SELECT user_id, name, email FROM dbo.USERS WHERE role = 'advisor' AND is_active = 1 AND account_status = 'active' ORDER BY name")
    if (req.query.include_relations !== '1') {
      return res.json({ advisors: result.recordset })
    }

    const relationsResult = await pool.request().query(`
      SELECT advisor_id, degree_level, program
      FROM dbo.USERS
      WHERE role = 'student'
        AND is_active = 1
        AND account_status = 'active'
        AND advisor_id IS NOT NULL
    `)
    const relations = {}
    relationsResult.recordset.forEach(row => {
      if (!relations[row.advisor_id]) relations[row.advisor_id] = { degrees: new Set(), programs: new Set() }
      if (row.degree_level) relations[row.advisor_id].degrees.add(row.degree_level)
      if (row.program) relations[row.advisor_id].programs.add(row.program)
    })

    res.json({
      advisors: result.recordset,
      relations: Object.fromEntries(
        Object.entries(relations).map(([id, value]) => [id, {
          degrees: [...value.degrees],
          programs: [...value.programs],
        }])
      ),
    })
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// DELETE /api/users/bulk
const bulkDeleteUsers = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: 'กรุณาเลือกผู้ใช้ที่ต้องการลบ' })

    const pool = await getPool()
    await ensureColumns(pool)
    const placeholders = ids.map((_, i) => `@id${i}`).join(',')

    for (const id of ids) {
      await assertCanRemoveAdminAccess(pool, parseInt(id, 10))
    }

    const checkReq = pool.request()
    ids.forEach((id, i) => checkReq.input(`id${i}`, sql.Int, id))
    const docCheck = await checkReq.query(`
      SELECT u.user_id, u.name
      FROM dbo.USERS u
      WHERE u.user_id IN (${placeholders})
        AND EXISTS (
          SELECT 1 FROM dbo.DOCUMENTS d
          WHERE d.user_id = u.user_id AND d.status NOT IN ('deleted','trashed')
        )
    `)
    if (docCheck.recordset.length > 0) {
      const names = docCheck.recordset.map(r => r.name).join(', ')
      return res.status(400).json({ message: `ไม่สามารถลบได้ ผู้ใช้ต่อไปนี้ยังมีเอกสารในระบบ: ${names}` })
    }

    const delReq = pool.request()
    ids.forEach((id, i) => delReq.input(`id${i}`, sql.Int, id))
    delReq.input('self_id', sql.Int, req.user.user_id)
    const result = await delReq.query(`
      DELETE FROM dbo.USERS WHERE user_id IN (${placeholders}) AND user_id != @self_id
    `)

    logger.info(`Bulk delete ${result.rowsAffected[0]} users by admin ${req.user.user_id}`)
    res.json({ message: `ลบผู้ใช้ ${result.rowsAffected[0]} คนสำเร็จ`, deleted: result.rowsAffected[0] })
  } catch (err) {
    logger.error(`bulkDeleteUsers error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PATCH /api/users/bulk/toggle
const bulkToggleUsers = async (req, res) => {
  try {
    const { ids, is_active } = req.body
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: 'กรุณาเลือกผู้ใช้' })

    const pool = await getPool()
    await ensureColumns(pool)
    const placeholders = ids.map((_, i) => `@id${i}`).join(',')
    if (!is_active) {
      for (const id of ids) {
        await assertCanRemoveAdminAccess(pool, parseInt(id, 10))
      }
    }
    const req2 = pool.request()
    ids.forEach((id, i) => req2.input(`id${i}`, sql.Int, id))
    req2.input('is_active', sql.Bit, is_active ? 1 : 0)
    req2.input('account_status', sql.NVarChar, is_active ? 'active' : 'inactive')
    req2.input('self_id', sql.Int, req.user.user_id)
    const result = await req2.query(`
      UPDATE dbo.USERS
      SET is_active=@is_active,
          account_status=@account_status,
          graduated_at = CASE WHEN @account_status = 'active' THEN NULL ELSE graduated_at END,
          archived_at = CASE WHEN @account_status = 'active' THEN NULL ELSE archived_at END,
          updated_at=GETDATE()
      WHERE user_id IN (${placeholders}) AND user_id != @self_id
    `)

    logger.info(`Bulk toggle ${result.rowsAffected[0]} users to ${is_active ? 'active' : 'inactive'} by admin ${req.user.user_id}`)
    res.json({ message: `${is_active ? 'เปิด' : 'ปิด'}บัญชีผู้ใช้ ${result.rowsAffected[0]} คนสำเร็จ` })
  } catch (err) {
    logger.error(`bulkToggleUsers error: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PATCH /api/users/bulk/status
const bulkUpdateUserStatus = async (req, res) => {
  try {
    const { ids, account_status } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธเธนเนเนเธเน' })
    }
    if (!VALID_ACCOUNT_STATUSES.includes(account_status)) {
      return res.status(400).json({ message: 'Account status is invalid' })
    }

    const pool = await getPool()
    await ensureColumns(pool)
    const placeholders = ids.map((_, i) => `@id${i}`).join(',')
    if (account_status !== 'active') {
      for (const id of ids) {
        await assertCanRemoveAdminAccess(pool, parseInt(id, 10))
      }
    }
    const req2 = pool.request()
    ids.forEach((id, i) => req2.input(`id${i}`, sql.Int, id))
    req2.input('self_id', sql.Int, req.user.user_id)
    req2.input('account_status', sql.NVarChar, account_status)
    req2.input('is_active', sql.Bit, account_status === 'active' ? 1 : 0)
    req2.input('archived_at', sql.DateTime, account_status === 'archived' ? new Date() : null)

    const roleGuard = account_status === 'graduated' ? "AND role = 'student'" : ''
    const result = await req2.query(`
      UPDATE dbo.USERS
      SET account_status = @account_status,
          is_active = @is_active,
          graduated_at = CASE
            WHEN @account_status = 'graduated' THEN ISNULL(graduated_at, GETDATE())
            WHEN @account_status = 'active' THEN NULL
            ELSE graduated_at
          END,
          archived_at = CASE
            WHEN @account_status = 'archived' THEN ISNULL(archived_at, @archived_at)
            WHEN @account_status = 'active' THEN NULL
            ELSE archived_at
          END,
          updated_at = GETDATE()
      WHERE user_id IN (${placeholders})
        AND user_id != @self_id
        ${roleGuard}
    `)

    logger.info(`Bulk status ${result.rowsAffected[0]} users to ${account_status} by admin ${req.user.user_id}`)
    res.json({ message: 'Account status updated', updated: result.rowsAffected[0], account_status })
  } catch (err) {
    logger.error(`bulkUpdateUserStatus error: ${err.message}`)
    res.status(500).json({ message: 'เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เธ เธฒเธขเนเธเธฃเธฐเธเธ' })
  }
}

module.exports = { getUsers, searchUsers, createUser, updateUser, updateUserRole, toggleUser, updateUserStatus, resetPassword, importUsers, getAdvisors, bulkDeleteUsers, bulkToggleUsers, bulkUpdateUserStatus }

const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')
const { getAcademicReferenceOptions } = require('../utils/academicReference')

const ensureUserProgramColumn = async (pool) => {
  await pool.request().query(`
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='department')
       AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='program')
      EXEC sp_rename 'dbo.USERS.department', 'program', 'COLUMN';
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='program')
      ALTER TABLE dbo.USERS ADD program NVARCHAR(100) NULL;
  `)
}

// GET /api/executive/overview — ภาพรวมทั้งคณะ
const getOverview = async (req, res) => {
  try {
    const pool = await getPool()
    await ensureUserProgramColumn(pool)

    const stats = await pool.request().query(`
      SELECT
        COUNT(*)                                                        AS total_docs,
        SUM(CASE WHEN status = 'active'        THEN 1 ELSE 0 END)     AS active,
        SUM(CASE WHEN status = 'expiring_soon' THEN 1 ELSE 0 END)     AS expiring_soon,
        SUM(CASE WHEN status = 'expired'       THEN 1 ELSE 0 END)     AS expired,
        SUM(CASE WHEN doc_type = 'RI'          THEN 1 ELSE 0 END)     AS ri_count,
        SUM(CASE WHEN doc_type = 'IRB'         THEN 1 ELSE 0 END)     AS irb_count
      FROM dbo.DOCUMENTS WHERE status != 'deleted'
    `)

    const users = await pool.request().query(`
      SELECT
        COUNT(*)                                                          AS total_users,
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END)               AS students,
        SUM(CASE WHEN role = 'advisor' THEN 1 ELSE 0 END)               AS advisors,
        SUM(CASE WHEN role = 'staff'   THEN 1 ELSE 0 END)               AS staff
      FROM dbo.USERS WHERE is_active = 1
    `)

    // แนวโน้มรายเดือน (6 เดือนล่าสุด)
    const trend = await pool.request().query(`
      SELECT
        FORMAT(created_at, 'yyyy-MM') AS month,
        COUNT(*)                       AS count,
        SUM(CASE WHEN doc_type='RI'  THEN 1 ELSE 0 END) AS ri,
        SUM(CASE WHEN doc_type='IRB' THEN 1 ELSE 0 END) AS irb
      FROM dbo.DOCUMENTS
      WHERE created_at >= DATEADD(MONTH, -6, GETDATE())
        AND status != 'deleted'
      GROUP BY FORMAT(created_at, 'yyyy-MM')
      ORDER BY month ASC
    `)

    // Top หลักสูตรที่มีเอกสารใกล้หมดอายุ
    const topExpiring = await pool.request().query(`
      SELECT TOP 3
        u.program,
        COUNT(*) AS expiring_count
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      WHERE d.status = 'expiring_soon'
      GROUP BY u.program
      ORDER BY expiring_count DESC
    `)

    res.json({
      stats:       stats.recordset[0],
      users:       users.recordset[0],
      trend:       trend.recordset,
      topExpiring: topExpiring.recordset,
    })
  } catch (err) {
    logger.error(`getOverview: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/executive/programs — สรุปรายหลักสูตร
const getProgramSummary = async (req, res) => {
  try {
    const pool = await getPool()
    await ensureUserProgramColumn(pool)

    const result = await pool.request().query(`
      SELECT
        u.program,
        COUNT(DISTINCT u.user_id)                                           AS user_count,
        COUNT(d.doc_id)                                                     AS total_docs,
        SUM(CASE WHEN d.status = 'active'        THEN 1 ELSE 0 END)       AS active,
        SUM(CASE WHEN d.status = 'expiring_soon' THEN 1 ELSE 0 END)       AS expiring_soon,
        SUM(CASE WHEN d.status = 'expired'       THEN 1 ELSE 0 END)       AS expired,
        SUM(CASE WHEN d.doc_type = 'RI'          THEN 1 ELSE 0 END)       AS ri_count,
        SUM(CASE WHEN d.doc_type = 'IRB'         THEN 1 ELSE 0 END)       AS irb_count
      FROM dbo.USERS u
      LEFT JOIN dbo.DOCUMENTS d ON u.user_id = d.user_id AND d.status != 'deleted'
      WHERE u.role = 'student' AND u.is_active = 1
      GROUP BY u.program
      ORDER BY total_docs DESC
    `)

    // รวมหลักสูตรที่ไม่มีใน DB
    const { programs } = await getAcademicReferenceOptions(pool)
    const existing = result.recordset.map(r => r.program)
    const missing  = programs.filter(b => !existing.includes(b)).map(b => ({
      program: b, user_count: 0, total_docs: 0,
      active: 0, expiring_soon: 0, expired: 0,
      ri_count: 0, irb_count: 0,
    }))

    res.json({ programs: [...result.recordset, ...missing] })
  } catch (err) {
    logger.error(`getProgramSummary: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/executive/documents — ดูเอกสารทั้งคณะ (read-only)
const getAllDocuments = async (req, res) => {
  try {
    const { search, doc_type, status, degree_level, page = 1, limit = 20 } = req.query
    const program = req.query.program || req.query.branch
    const offset = (page - 1) * limit
    const pool = await getPool()
    await ensureUserProgramColumn(pool)
    const r = pool.request()

    let where = "WHERE d.status != 'deleted'"
    if (doc_type)     { where += ' AND d.doc_type = @doc_type';       r.input('doc_type',     sql.NVarChar, doc_type)     }
    if (status)       { where += ' AND d.status = @status';           r.input('status',       sql.NVarChar, status)       }
    if (degree_level) { where += ' AND u.degree_level = @degree_level'; r.input('degree_level', sql.NVarChar, degree_level) }
    if (program)       { where += ' AND u.program = @program';       r.input('program',       sql.NVarChar, program)       }
    if (search)       { where += ' AND (d.title LIKE @search OR u.name LIKE @search)'; r.input('search', sql.NVarChar, `%${search}%`) }

    const result = await r.query(`
      SELECT
        d.doc_id, d.title, d.doc_type, d.status,
        d.issue_date, d.expire_date,
        DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) AS days_remaining,
        u.name AS owner_name, u.email AS owner_email, u.program,
        a.name AS advisor_name
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u  ON d.user_id    = u.user_id
      LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
      ${where}
      ORDER BY d.expire_date ASC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `)

    res.json({ documents: result.recordset })
  } catch (err) {
    logger.error(`getAllDocuments: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { getOverview, getProgramSummary, getAllDocuments }

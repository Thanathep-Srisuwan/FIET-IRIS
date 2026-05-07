const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')

const BRANCHES = [
  'ครุศาสตร์เครื่องกล','ครุศาสตร์โยธา','ครุศาสตร์ไฟฟ้า','ครุศาสตร์อุตสาหการ',
  'เทคโนโลยีและสื่อสารการศึกษา','เทคโนโลยีการพิมพ์และบรรจุภัณฑ์','คอมพิวเตอร์และเทคโนโลยีสารสนเทศ',
]

// GET /api/executive/overview — ภาพรวมทั้งคณะ
const getOverview = async (req, res) => {
  try {
    const pool = await getPool()

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
        SUM(CASE WHEN role = 'advisor' THEN 1 ELSE 0 END)               AS advisors
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

    // Top สาขาที่มีเอกสารใกล้หมดอายุ
    const topExpiring = await pool.request().query(`
      SELECT TOP 3
        u.department,
        COUNT(*) AS expiring_count
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      WHERE d.status = 'expiring_soon'
      GROUP BY u.department
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

// GET /api/executive/branches — สรุปรายสาขา
const getBranchSummary = async (req, res) => {
  try {
    const pool = await getPool()

    const result = await pool.request().query(`
      SELECT
        u.department,
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
      GROUP BY u.department
      ORDER BY total_docs DESC
    `)

    // รวม branch ที่ไม่มีใน DB
    const existing = result.recordset.map(r => r.department)
    const missing  = BRANCHES.filter(b => !existing.includes(b)).map(b => ({
      department: b, user_count: 0, total_docs: 0,
      active: 0, expiring_soon: 0, expired: 0,
      ri_count: 0, irb_count: 0,
    }))

    res.json({ branches: [...result.recordset, ...missing] })
  } catch (err) {
    logger.error(`getBranchSummary: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/executive/documents — ดูเอกสารทั้งคณะ (read-only)
const getAllDocuments = async (req, res) => {
  try {
    const { search, doc_type, status, branch, page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit
    const pool = await getPool()
    const r = pool.request()

    let where = "WHERE d.status != 'deleted'"
    if (doc_type) { where += ' AND d.doc_type = @doc_type'; r.input('doc_type', sql.NVarChar, doc_type) }
    if (status)   { where += ' AND d.status = @status';     r.input('status',   sql.NVarChar, status)   }
    if (branch)   { where += ' AND u.department = @branch';     r.input('branch',   sql.NVarChar, branch)   }
    if (search)   { where += ' AND (d.title LIKE @search OR u.name LIKE @search)'; r.input('search', sql.NVarChar, `%${search}%`) }

    const result = await r.query(`
      SELECT
        d.doc_id, d.title, d.doc_type, d.status,
        d.issue_date, d.expire_date,
        DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) AS days_remaining,
        u.name AS owner_name, u.email AS owner_email, u.department,
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

module.exports = { getOverview, getBranchSummary, getAllDocuments }

const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')

const ensureColumns = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='student_id')
      ALTER TABLE dbo.USERS ADD student_id NVARCHAR(50) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='degree_level')
      ALTER TABLE dbo.USERS ADD degree_level NVARCHAR(20) NULL;
  `)
}

// GET /api/admin/stats
const getAdminStats = async (req, res) => {
  try {
    const pool = await getPool()
    await ensureColumns(pool)

    // เอกสารทั้งหมด (แยกตามสถานะ — คำนวณสดจากวันหมดอายุเสมอ)
    const docStats = await pool.request().query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE
          WHEN no_expire = 1 THEN 1
          WHEN expire_date IS NOT NULL AND expire_date > DATEADD(DAY, 90, CAST(GETDATE() AS DATE)) THEN 1
          ELSE 0
        END) AS active,
        SUM(CASE
          WHEN (no_expire IS NULL OR no_expire = 0)
            AND expire_date IS NOT NULL
            AND expire_date >= CAST(GETDATE() AS DATE)
            AND expire_date <= DATEADD(DAY, 90, CAST(GETDATE() AS DATE))
          THEN 1 ELSE 0
        END) AS expiring_soon,
        SUM(CASE
          WHEN (no_expire IS NULL OR no_expire = 0)
            AND expire_date IS NOT NULL
            AND expire_date < CAST(GETDATE() AS DATE)
          THEN 1 ELSE 0
        END) AS expired
      FROM dbo.DOCUMENTS
      WHERE status NOT IN ('deleted', 'trashed')
    `)

    // ผู้ใช้แยกตามกลุ่ม (ป.ตรี / ป.โท / ป.เอก / อาจารย์ / เจ้าหน้าที่)
    const userBreakdown = await pool.request().query(`
      SELECT
        CASE
          WHEN u.role = 'student' AND u.degree_level = 'master'   THEN 'master'
          WHEN u.role = 'student' AND u.degree_level = 'doctoral' THEN 'doctoral'
          WHEN u.role = 'student'                                  THEN 'bachelor'
          WHEN u.role = 'advisor'                                  THEN 'advisor'
          WHEN u.role = 'staff'                                    THEN 'staff'
          ELSE NULL
        END AS grp,
        COUNT(DISTINCT u.user_id)  AS user_count,
        COUNT(d.doc_id)            AS doc_count
      FROM dbo.USERS u
      LEFT JOIN dbo.DOCUMENTS d
        ON d.user_id = u.user_id AND d.status NOT IN ('deleted', 'trashed')
      WHERE u.is_active = 1
        AND u.role NOT IN ('admin', 'executive')
      GROUP BY
        CASE
          WHEN u.role = 'student' AND u.degree_level = 'master'   THEN 'master'
          WHEN u.role = 'student' AND u.degree_level = 'doctoral' THEN 'doctoral'
          WHEN u.role = 'student'                                  THEN 'bachelor'
          WHEN u.role = 'advisor'                                  THEN 'advisor'
          WHEN u.role = 'staff'                                    THEN 'staff'
          ELSE NULL
        END
      HAVING
        CASE
          WHEN u.role = 'student' AND u.degree_level = 'master'   THEN 'master'
          WHEN u.role = 'student' AND u.degree_level = 'doctoral' THEN 'doctoral'
          WHEN u.role = 'student'                                  THEN 'bachelor'
          WHEN u.role = 'advisor'                                  THEN 'advisor'
          WHEN u.role = 'staff'                                    THEN 'staff'
          ELSE NULL
        END IS NOT NULL
    `)

    // timeline หมดอายุ (กี่ฉบับในแต่ละช่วง — คำนวณจากวันหมดอายุจริง)
    const expiryTimeline = await pool.request().query(`
      SELECT
        SUM(CASE WHEN expire_date > CAST(GETDATE() AS DATE)
                  AND expire_date <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
             THEN 1 ELSE 0 END) AS within_30,
        SUM(CASE WHEN expire_date > DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
                  AND expire_date <= DATEADD(DAY, 60, CAST(GETDATE() AS DATE))
             THEN 1 ELSE 0 END) AS within_60,
        SUM(CASE WHEN expire_date > DATEADD(DAY, 60, CAST(GETDATE() AS DATE))
                  AND expire_date <= DATEADD(DAY, 90, CAST(GETDATE() AS DATE))
             THEN 1 ELSE 0 END) AS within_90,
        SUM(CASE WHEN expire_date IS NOT NULL AND expire_date < CAST(GETDATE() AS DATE)
             THEN 1 ELSE 0 END) AS already_expired
      FROM dbo.DOCUMENTS
      WHERE status NOT IN ('deleted', 'trashed')
        AND (no_expire IS NULL OR no_expire = 0)
    `)

    // เอกสารที่หมดอายุแล้ว / ใกล้หมดอายุ (สำหรับ notification panel)
    const alertDocs = await pool.request().query(`
      SELECT TOP 10
        d.doc_id,
        d.title       AS doc_title,
        d.doc_type,
        d.expire_date,
        DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) AS days_remaining,
        u.name        AS owner_name
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      WHERE d.status NOT IN ('deleted', 'trashed')
        AND (d.no_expire IS NULL OR d.no_expire = 0)
        AND d.expire_date IS NOT NULL
        AND d.expire_date <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
      ORDER BY d.expire_date ASC
    `)

    // กิจกรรมล่าสุด (10 รายการ)
    const recentActivity = await pool.request().query(`
      SELECT TOP 10
        d.doc_id,
        d.title        AS doc_title,
        d.doc_type,
        d.created_at,
        u.name         AS owner_name,
        u.role         AS owner_role
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      WHERE d.status NOT IN ('deleted', 'trashed')
      ORDER BY d.created_at DESC
    `)

    res.json({
      docStats:       docStats.recordset[0],
      userBreakdown:  userBreakdown.recordset,
      expiryTimeline: expiryTimeline.recordset[0],
      recentActivity: recentActivity.recordset,
      alertDocs:      alertDocs.recordset,
    })
  } catch (err) {
    logger.error(`getAdminStats: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { getAdminStats }

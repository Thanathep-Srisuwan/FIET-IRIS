const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')

const ensureColumns = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='student_id')
      ALTER TABLE dbo.USERS ADD student_id NVARCHAR(50) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='degree_level')
      ALTER TABLE dbo.USERS ADD degree_level NVARCHAR(20) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='no_expire')
      ALTER TABLE dbo.DOCUMENTS ADD no_expire BIT NOT NULL DEFAULT 0;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='trashed_at')
      ALTER TABLE dbo.DOCUMENTS ADD trashed_at DATETIME NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='trashed_by')
      ALTER TABLE dbo.DOCUMENTS ADD trashed_by INT NULL;
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='expire_date' AND is_nullable = 0)
    BEGIN
      DECLARE @dateConstraint NVARCHAR(200)
      SELECT @dateConstraint = cc.name
      FROM sys.check_constraints cc
      WHERE cc.parent_object_id = OBJECT_ID('dbo.DOCUMENTS')
        AND cc.definition LIKE '%expire_date%'
      IF @dateConstraint IS NOT NULL
        EXEC('ALTER TABLE dbo.DOCUMENTS DROP CONSTRAINT [' + @dateConstraint + ']')
      ALTER TABLE dbo.DOCUMENTS ALTER COLUMN expire_date DATE NULL
      IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('dbo.DOCUMENTS') AND name = 'CHK_DOCUMENTS_dates_nullable'
      )
      ALTER TABLE dbo.DOCUMENTS
      ADD CONSTRAINT CHK_DOCUMENTS_dates_nullable
      CHECK (expire_date IS NULL OR expire_date >= issue_date)
    END
  `)
}

// GET /api/admin/stats
const getAdminStats = async (req, res) => {
  try {
    const pool = await getPool()
    await ensureColumns(pool)

    // อ่าน expiry_warning_days จาก SYSTEM_SETTINGS
    let expiryDays = 90
    try {
      const settingRow = await pool.request().query(`
        SELECT setting_value FROM dbo.SYSTEM_SETTINGS WHERE setting_key = 'expiry_warning_days'
      `)
      if (settingRow.recordset.length) expiryDays = parseInt(settingRow.recordset[0].setting_value, 10) || 90
    } catch { /* migration ยังไม่ได้รัน ใช้ default */ }

    // เอกสารทั้งหมด (แยกตามสถานะ — คำนวณสดจากวันหมดอายุเสมอ)
    const docStats = await pool.request()
      .input('expiry_days', sql.Int, expiryDays)
      .query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE
          WHEN no_expire = 1 THEN 1
          WHEN expire_date IS NOT NULL AND expire_date > DATEADD(DAY, @expiry_days, CAST(GETDATE() AS DATE)) THEN 1
          ELSE 0
        END) AS active,
        SUM(CASE
          WHEN (no_expire IS NULL OR no_expire = 0)
            AND expire_date IS NOT NULL
            AND expire_date >= CAST(GETDATE() AS DATE)
            AND expire_date <= DATEADD(DAY, @expiry_days, CAST(GETDATE() AS DATE))
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

    // ผู้ใช้แยกตามกลุ่ม (ป.ตรี / ป.โท / ป.เอก / อาจารย์ / เจ้าหน้าที่) (ป.ตรี / ป.โท / ป.เอก / อาจารย์ / เจ้าหน้าที่)
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
    const expiryTimeline = await pool.request()
      .input('expiry_days2', sql.Int, expiryDays)
      .query(`
      SELECT
        SUM(CASE WHEN expire_date > CAST(GETDATE() AS DATE)
                  AND expire_date <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
             THEN 1 ELSE 0 END) AS within_30,
        SUM(CASE WHEN expire_date > DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
                  AND expire_date <= DATEADD(DAY, 60, CAST(GETDATE() AS DATE))
             THEN 1 ELSE 0 END) AS within_60,
        SUM(CASE WHEN expire_date > DATEADD(DAY, 60, CAST(GETDATE() AS DATE))
                  AND expire_date <= DATEADD(DAY, @expiry_days2, CAST(GETDATE() AS DATE))
             THEN 1 ELSE 0 END) AS within_warning,
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
      docStats:        docStats.recordset[0],
      userBreakdown:   userBreakdown.recordset,
      expiryTimeline:  expiryTimeline.recordset[0],
      recentActivity:  recentActivity.recordset,
      alertDocs:       alertDocs.recordset,
      expiryDays,
    })
  } catch (err) {
    logger.error(`getAdminStats: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { getAdminStats }

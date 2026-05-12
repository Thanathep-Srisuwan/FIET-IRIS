const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')

const ensureTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ANNOUNCEMENTS' AND xtype='U')
    CREATE TABLE dbo.ANNOUNCEMENTS (
      announcement_id INT IDENTITY(1,1) PRIMARY KEY,
      title           NVARCHAR(255) NOT NULL,
      content         NVARCHAR(MAX) NOT NULL,
      link_url        NVARCHAR(500) NULL,
      image_url       NVARCHAR(500) NULL,
      created_by      INT NOT NULL,
      created_at      DATETIME DEFAULT GETDATE(),
      is_active       BIT DEFAULT 1
    )
  `)
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name=N'link_url' AND Object_ID=OBJECT_ID(N'dbo.ANNOUNCEMENTS'))
      ALTER TABLE dbo.ANNOUNCEMENTS ADD link_url NVARCHAR(500) NULL
  `)
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name=N'image_url' AND Object_ID=OBJECT_ID(N'dbo.ANNOUNCEMENTS'))
      ALTER TABLE dbo.ANNOUNCEMENTS ADD image_url NVARCHAR(500) NULL
  `)
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ANNOUNCEMENT_READS' AND xtype='U')
    CREATE TABLE dbo.ANNOUNCEMENT_READS (
      read_id         INT IDENTITY(1,1) PRIMARY KEY,
      announcement_id INT NOT NULL,
      user_id         INT NOT NULL,
      read_at         DATETIME DEFAULT GETDATE()
    )
  `)
}

// GET /api/announcements — ดูทั้งหมด พร้อมสถานะอ่าน/ยังไม่อ่าน
const getAll = async (req, res) => {
  try {
    const { user_id } = req.user
    const pool = await getPool()
    await ensureTable(pool)
    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT
          a.announcement_id, a.title, a.content, a.link_url, a.image_url, a.created_at,
          u.name AS created_by_name,
          CASE WHEN ar.read_id IS NULL THEN 0 ELSE 1 END AS is_read
        FROM dbo.ANNOUNCEMENTS a
        JOIN  dbo.USERS u              ON a.created_by      = u.user_id
        LEFT  JOIN dbo.ANNOUNCEMENT_READS ar
                                       ON ar.announcement_id = a.announcement_id
                                      AND ar.user_id         = @user_id
        WHERE a.is_active = 1
        ORDER BY a.created_at DESC
      `)
    res.json(result.recordset)
  } catch (err) {
    logger.error(`getAnnouncements: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/announcements/public — ดูทั้งหมดโดยไม่ต้อง auth (สำหรับ landing page)
const getPublic = async (req, res) => {
  try {
    const pool = await getPool()
    await ensureTable(pool)
    const result = await pool.request().query(`
      SELECT a.announcement_id, a.title, a.content, a.link_url, a.image_url, a.created_at,
             u.name AS created_by_name
      FROM dbo.ANNOUNCEMENTS a
      JOIN  dbo.USERS u ON a.created_by = u.user_id
      WHERE a.is_active = 1
      ORDER BY a.created_at DESC
    `)
    res.json(result.recordset)
  } catch (err) {
    logger.error(`getPublicAnnouncements: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/announcements (admin only)
const create = async (req, res) => {
  try {
    const { title, content, link_url } = req.body
    const { user_id } = req.user
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: 'กรุณากรอกหัวข้อและเนื้อหา' })
    }
    const image_url = req.file
      ? `/uploads/announcements/${req.file.filename}`
      : null
    const pool = await getPool()
    await ensureTable(pool)
    const result = await pool.request()
      .input('title',      sql.NVarChar(255),    title.trim())
      .input('content',    sql.NVarChar(sql.MAX), content.trim())
      .input('link_url',   sql.NVarChar(500),    link_url?.trim() || null)
      .input('image_url',  sql.NVarChar(500),    image_url)
      .input('created_by', sql.Int,               user_id)
      .query(`
        DECLARE @inserted TABLE (announcement_id INT);

        INSERT INTO dbo.ANNOUNCEMENTS (title, content, link_url, image_url, created_by)
        OUTPUT INSERTED.announcement_id INTO @inserted
        VALUES (@title, @content, @link_url, @image_url, @created_by)

        SELECT
          a.announcement_id, a.title, a.content, a.link_url, a.image_url, a.created_at,
          u.name AS created_by_name,
          CAST(0 AS BIT) AS is_read
        FROM dbo.ANNOUNCEMENTS a
        JOIN dbo.USERS u ON a.created_by = u.user_id
        WHERE a.announcement_id = (SELECT TOP 1 announcement_id FROM @inserted)
      `)
    res.status(201).json({
      message: 'สร้างประกาศสำเร็จ',
      announcement: result.recordset[0],
    })
  } catch (err) {
    logger.error(`createAnnouncement: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PUT /api/announcements/:id/read — อ่านทีละรายการ
const markRead = async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.user
    const pool = await getPool()
    await ensureTable(pool)
    const existing = await pool.request()
      .input('announcement_id', sql.Int, id)
      .input('user_id',         sql.Int, user_id)
      .query(`
        SELECT read_id FROM dbo.ANNOUNCEMENT_READS
        WHERE announcement_id = @announcement_id AND user_id = @user_id
      `)
    if (existing.recordset.length === 0) {
      await pool.request()
        .input('announcement_id', sql.Int, id)
        .input('user_id',         sql.Int, user_id)
        .query(`
          INSERT INTO dbo.ANNOUNCEMENT_READS (announcement_id, user_id)
          VALUES (@announcement_id, @user_id)
        `)
    }
    res.json({ message: 'อ่านแล้ว' })
  } catch (err) {
    logger.error(`markAnnouncementRead: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PUT /api/announcements/read-all — อ่านทั้งหมด
const markAllRead = async (req, res) => {
  try {
    const { user_id } = req.user
    const pool = await getPool()
    await ensureTable(pool)
    await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        INSERT INTO dbo.ANNOUNCEMENT_READS (announcement_id, user_id)
        SELECT a.announcement_id, @user_id
        FROM dbo.ANNOUNCEMENTS a
        WHERE a.is_active = 1
          AND NOT EXISTS (
            SELECT 1 FROM dbo.ANNOUNCEMENT_READS ar
            WHERE ar.announcement_id = a.announcement_id AND ar.user_id = @user_id
          )
      `)
    res.json({ message: 'อ่านทั้งหมดแล้ว' })
  } catch (err) {
    logger.error(`markAllAnnouncementsRead: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// DELETE /api/announcements/:id (admin only)
const remove = async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getPool()
    await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE dbo.ANNOUNCEMENTS SET is_active = 0 WHERE announcement_id = @id`)
    res.json({ message: 'ลบประกาศสำเร็จ' })
  } catch (err) {
    logger.error(`deleteAnnouncement: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { getAll, getPublic, create, markRead, markAllRead, remove }

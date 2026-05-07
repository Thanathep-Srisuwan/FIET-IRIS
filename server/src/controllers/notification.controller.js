const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')

// GET /api/notifications/unread
const getUnread = async (req, res) => {
  try {
    const { user_id } = req.user
    const pool = await getPool()

    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT
          n.notif_id, n.type, n.message, n.created_at,
          n.in_app_read, n.channel,
          d.doc_id, d.title AS doc_title, d.doc_type, d.expire_date
        FROM dbo.NOTIFICATIONS n
        JOIN dbo.DOCUMENTS d ON n.doc_id = d.doc_id
        WHERE n.user_id = @user_id
          AND n.in_app_read = 0
          AND n.channel IN ('in_app', 'both')
        ORDER BY n.created_at DESC
      `)

    res.json(result.recordset)
  } catch (err) {
    logger.error(`getUnread: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/notifications — ดูทั้งหมด (มีและยังไม่ได้อ่าน)
const getAll = async (req, res) => {
  try {
    const { user_id } = req.user
    const pool = await getPool()

    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT TOP 30
          n.notif_id, n.type, n.message, n.created_at,
          n.in_app_read, n.in_app_read_at,
          d.doc_id, d.title AS doc_title, d.doc_type, d.expire_date
        FROM dbo.NOTIFICATIONS n
        JOIN dbo.DOCUMENTS d ON n.doc_id = d.doc_id
        WHERE n.user_id = @user_id
          AND n.channel IN ('in_app', 'both')
        ORDER BY n.created_at DESC
      `)

    res.json(result.recordset)
  } catch (err) {
    logger.error(`getAll notifications: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PUT /api/notifications/:id/read — อ่านทีละรายการ
const markRead = async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.user
    const pool = await getPool()

    await pool.request()
      .input('notif_id', sql.Int, id)
      .input('user_id',  sql.Int, user_id)
      .query(`
        UPDATE dbo.NOTIFICATIONS
        SET in_app_read = 1, in_app_read_at = GETDATE()
        WHERE notif_id = @notif_id AND user_id = @user_id
      `)

    res.json({ message: 'อ่านแล้ว' })
  } catch (err) {
    logger.error(`markRead: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PUT /api/notifications/read-all — อ่านทั้งหมด
const markAllRead = async (req, res) => {
  try {
    const { user_id } = req.user
    const pool = await getPool()

    await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        UPDATE dbo.NOTIFICATIONS
        SET in_app_read = 1, in_app_read_at = GETDATE()
        WHERE user_id = @user_id AND in_app_read = 0
      `)

    res.json({ message: 'อ่านทั้งหมดแล้ว' })
  } catch (err) {
    logger.error(`markAllRead: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { getUnread, getAll, markRead, markAllRead }

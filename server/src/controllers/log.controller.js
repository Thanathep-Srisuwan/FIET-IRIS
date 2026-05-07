const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')

// GET /api/logs/deletions
const getDeletionLogs = async (req, res) => {
  try {
    const { search, reason, page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit
    const pool = await getPool()
    const r = pool.request()

    let where = 'WHERE 1=1'
    if (reason) { where += ' AND dl.reason = @reason'; r.input('reason', sql.NVarChar, reason) }
    if (search) {
      where += ' AND (dl.doc_title LIKE @search OR dl.owner_email LIKE @search)'
      r.input('search', sql.NVarChar, `%${search}%`)
    }

    const result = await r.query(`
      SELECT
        dl.log_id, dl.doc_id, dl.reason, dl.doc_title,
        dl.owner_email, dl.original_file_name, dl.deleted_at,
        u.name AS deleted_by_name
      FROM dbo.DELETION_LOGS dl
      LEFT JOIN dbo.USERS u ON dl.deleted_by = u.user_id
      ${where}
      ORDER BY dl.deleted_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `)

    const countR = pool.request()
    if (reason) countR.input('reason', sql.NVarChar, reason)
    if (search) countR.input('search', sql.NVarChar, `%${search}%`)
    const countResult = await countR.query(
      `SELECT COUNT(*) AS total FROM dbo.DELETION_LOGS dl ${where}`
    )

    res.json({ logs: result.recordset, total: countResult.recordset[0].total })
  } catch (err) {
    logger.error(`getDeletionLogs: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { getDeletionLogs }

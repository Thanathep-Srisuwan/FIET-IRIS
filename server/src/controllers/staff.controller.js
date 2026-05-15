const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')

// GET /api/staff/stats
const getStaffStats = async (req, res) => {
  try {
    const { user_id } = req.user
    const pool = await getPool()

    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT
          (
            SELECT COUNT(*)
            FROM dbo.DOCUMENTS d
            INNER JOIN dbo.DOC_TYPES dt ON dt.type_code = d.doc_type
            WHERE dt.approver_user_id = @user_id
              AND dt.requires_approval = 1
              AND dt.is_active = 1
              AND ISNULL(d.approval_status, 'pending') = 'pending'
              AND d.status NOT IN ('deleted', 'trashed')
          ) AS pending_count,
          (
            SELECT COUNT(*)
            FROM dbo.DOCUMENTS d
            WHERE d.approval_by = @user_id
              AND d.approval_status = 'approved'
              AND MONTH(d.approval_at) = MONTH(GETDATE())
              AND YEAR(d.approval_at) = YEAR(GETDATE())
          ) AS approved_this_month,
          (
            SELECT COUNT(*)
            FROM dbo.DOCUMENTS d
            WHERE d.approval_by = @user_id
              AND d.approval_status = 'rejected'
              AND MONTH(d.approval_at) = MONTH(GETDATE())
              AND YEAR(d.approval_at) = YEAR(GETDATE())
          ) AS rejected_this_month,
          (
            SELECT COUNT(*)
            FROM dbo.DOC_TYPES dt
            WHERE dt.approver_user_id = @user_id
              AND dt.requires_approval = 1
              AND dt.is_active = 1
          ) AS assigned_types_count
      `)

    const assignedTypes = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT type_id, type_code, type_name
        FROM dbo.DOC_TYPES
        WHERE approver_user_id = @user_id
          AND requires_approval = 1
          AND is_active = 1
        ORDER BY sort_order, type_name
      `)

    const stats = result.recordset[0]
    res.json({
      pending_count:        stats.pending_count,
      approved_this_month:  stats.approved_this_month,
      rejected_this_month:  stats.rejected_this_month,
      assigned_types_count: stats.assigned_types_count,
      assigned_types:       assignedTypes.recordset,
    })
  } catch (err) {
    logger.error(`getStaffStats: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/staff/history?status=approved|rejected&page=1&limit=20
const getStaffHistory = async (req, res) => {
  try {
    const { user_id } = req.user
    const { status, page = 1, limit = 20 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const pool = await getPool()

    const validStatuses = ['approved', 'rejected']
    const statusFilter = validStatuses.includes(status) ? status : null

    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('status',  sql.NVarChar, statusFilter)
      .input('limit',   sql.Int, parseInt(limit))
      .input('offset',  sql.Int, offset)
      .query(`
        SELECT
          d.doc_id,
          d.title,
          d.doc_type,
          d.approval_status,
          d.approval_note,
          d.approval_at,
          u.name AS owner_name,
          u.student_id AS owner_student_id
        FROM dbo.DOCUMENTS d
        INNER JOIN dbo.USERS u ON u.user_id = d.user_id
        WHERE d.approval_by = @user_id
          AND (@status IS NULL OR d.approval_status = @status)
        ORDER BY d.approval_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `)

    const countResult = await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('status',  sql.NVarChar, statusFilter)
      .query(`
        SELECT COUNT(*) AS total
        FROM dbo.DOCUMENTS d
        WHERE d.approval_by = @user_id
          AND (@status IS NULL OR d.approval_status = @status)
      `)

    res.json({
      data:  result.recordset,
      total: countResult.recordset[0].total,
      page:  parseInt(page),
      limit: parseInt(limit),
    })
  } catch (err) {
    logger.error(`getStaffHistory: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { getStaffStats, getStaffHistory }

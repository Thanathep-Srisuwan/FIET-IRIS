const { getPool, sql } = require('../config/db')
const { logAdminAction } = require('../utils/adminLogger')

// ============================================================
//  System Settings
// ============================================================

const getAllSettings = async (req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT setting_key, setting_value, setting_type, description, updated_at
      FROM dbo.SYSTEM_SETTINGS
      ORDER BY setting_key
    `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const bulkUpdateSettings = async (req, res) => {
  const { settings } = req.body
  if (!Array.isArray(settings) || !settings.length)
    return res.status(400).json({ message: 'settings array required' })

  try {
    const pool = await getPool()
    for (const { key, value } of settings) {
      if (!key || value === undefined || value === null) continue
      await pool.request()
        .input('key',        sql.NVarChar, key)
        .input('value',      sql.NVarChar, String(value))
        .input('updated_by', sql.Int,      req.user.id)
        .query(`
          UPDATE dbo.SYSTEM_SETTINGS
          SET setting_value = @value, updated_at = GETDATE(), updated_by = @updated_by
          WHERE setting_key = @key
        `)
    }
    await logAdminAction(pool, sql, {
      adminId: req.user?.user_id || req.user?.id,
      adminName: req.user?.name,
      action: 'update',
      entityType: 'setting',
      entityLabel: settings.map(s => s.key).join(', '),
    })
    res.json({ message: 'updated' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// ============================================================
//  Email Templates
// ============================================================

const getAllTemplates = async (req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT template_key, subject, body_html, variables, description, updated_at
      FROM dbo.EMAIL_TEMPLATES
      ORDER BY template_key
    `)
    res.json(result.recordset)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const updateTemplate = async (req, res) => {
  const { key } = req.params
  const { subject, body_html } = req.body
  if (!subject || !body_html)
    return res.status(400).json({ message: 'subject and body_html required' })

  try {
    const pool = await getPool()
    const check = await pool.request()
      .input('key', sql.NVarChar, key)
      .query('SELECT template_key FROM dbo.EMAIL_TEMPLATES WHERE template_key = @key')
    if (!check.recordset.length)
      return res.status(404).json({ message: 'Template not found' })

    await pool.request()
      .input('key',        sql.NVarChar, key)
      .input('subject',    sql.NVarChar, subject)
      .input('body_html',  sql.NVarChar, body_html)
      .input('updated_by', sql.Int,      req.user.id)
      .query(`
        UPDATE dbo.EMAIL_TEMPLATES
        SET subject = @subject, body_html = @body_html,
            updated_at = GETDATE(), updated_by = @updated_by
        WHERE template_key = @key
      `)
    await logAdminAction(pool, sql, {
      adminId: req.user?.user_id || req.user?.id,
      adminName: req.user?.name,
      action: 'update',
      entityType: 'email_template',
      entityId: key,
      entityLabel: key,
    })
    res.json({ message: 'updated' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getAllSettings, bulkUpdateSettings, getAllTemplates, updateTemplate }

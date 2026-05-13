const logger = require('./logger')

const ensureActivityLogsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ADMIN_ACTIVITY_LOGS' AND xtype='U')
    CREATE TABLE dbo.ADMIN_ACTIVITY_LOGS (
      log_id       INT IDENTITY(1,1) PRIMARY KEY,
      admin_id     INT NULL,
      admin_name   NVARCHAR(255) NULL,
      action       NVARCHAR(50)  NOT NULL,
      entity_type  NVARCHAR(50)  NULL,
      entity_id    NVARCHAR(100) NULL,
      entity_label NVARCHAR(500) NULL,
      details      NVARCHAR(MAX) NULL,
      created_at   DATETIME NOT NULL DEFAULT GETDATE()
    )
  `)
}

const logAdminAction = async (pool, sql, { adminId, adminName, action, entityType, entityId, entityLabel, details } = {}) => {
  try {
    await ensureActivityLogsTable(pool)
    await pool.request()
      .input('admin_id',     sql.Int,               adminId || null)
      .input('admin_name',   sql.NVarChar(255),      adminName || null)
      .input('action',       sql.NVarChar(50),       action)
      .input('entity_type',  sql.NVarChar(50),       entityType || null)
      .input('entity_id',    sql.NVarChar(100),      entityId != null ? String(entityId) : null)
      .input('entity_label', sql.NVarChar(500),      entityLabel || null)
      .input('details',      sql.NVarChar(sql.MAX),  details ? JSON.stringify(details) : null)
      .query(`
        INSERT INTO dbo.ADMIN_ACTIVITY_LOGS (admin_id, admin_name, action, entity_type, entity_id, entity_label, details)
        VALUES (@admin_id, @admin_name, @action, @entity_type, @entity_id, @entity_label, @details)
      `)
  } catch (err) {
    logger.error(`logAdminAction failed: ${err.message}`)
  }
}

module.exports = { logAdminAction, ensureActivityLogsTable }

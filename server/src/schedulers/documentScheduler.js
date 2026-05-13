const cron = require('node-cron')
const fs   = require('fs')
const { getPool, sql } = require('../config/db')
const { sendMail, renderTemplate, loadTemplate, loadSettings } = require('../utils/mailer')
const logger = require('../utils/logger')

// โหลด threshold settings จาก SYSTEM_SETTINGS
const loadThresholds = async (pool) => {
  const defaults = { expiry_warning_days: 90, trash_retention_days: 30 }
  try {
    const result = await pool.request().query(`
      SELECT setting_key, setting_value FROM dbo.SYSTEM_SETTINGS
      WHERE setting_key IN ('expiry_warning_days', 'trash_retention_days')
    `)
    for (const row of result.recordset) {
      defaults[row.setting_key] = parseInt(row.setting_value, 10) || defaults[row.setting_key]
    }
  } catch {
    // ก่อนรัน migration ใช้ค่า default
  }
  return defaults
}

const ensureGraduationRetentionColumns = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='account_status')
      ALTER TABLE dbo.USERS ADD account_status NVARCHAR(30) NOT NULL CONSTRAINT DF_USERS_account_status DEFAULT 'active';
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='graduated_at')
      ALTER TABLE dbo.USERS ADD graduated_at DATETIME NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='archived_at')
      ALTER TABLE dbo.USERS ADD archived_at DATETIME NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='trash_reason')
      ALTER TABLE dbo.DOCUMENTS ADD trash_reason NVARCHAR(500) NULL;
    EXEC('UPDATE dbo.USERS
      SET account_status = CASE WHEN is_active = 1 THEN ''active'' ELSE ''inactive'' END
      WHERE account_status IS NULL');
  `)
}

const runStatusAndTrash = async () => {
  const pool = await getPool()
  await ensureGraduationRetentionColumns(pool)
  await pool.request().execute('dbo.sp_UpdateDocumentStatus')
  const graduatedRetentionResult = await pool.request().query(`
    UPDATE d
    SET status = 'trashed',
        trashed_at = GETDATE(),
        trashed_by = NULL,
        trash_reason = N'เอกสารของนักศึกษาที่จบการศึกษาถูกเก็บครบ 10 ปีและย้ายเข้าถังขยะโดยอัตโนมัติ',
        updated_at = GETDATE()
    FROM dbo.DOCUMENTS d
    JOIN dbo.USERS u ON d.user_id = u.user_id
    WHERE u.role = 'student'
      AND u.account_status = 'graduated'
      AND u.graduated_at IS NOT NULL
      AND u.graduated_at <= DATEADD(YEAR, -10, GETDATE())
      AND d.status NOT IN ('deleted', 'trashed')
  `)
  const trashedResult = await pool.request().query(`
    UPDATE d
    SET d.status = 'trashed',
        d.trashed_at = GETDATE(),
        d.trashed_by = NULL,
        d.trash_reason = N'เอกสารหมดอายุและถูกย้ายเข้าถังขยะโดยอัตโนมัติ',
        d.updated_at = GETDATE()
    FROM dbo.DOCUMENTS d
    JOIN dbo.USERS u ON d.user_id = u.user_id
    WHERE d.status = 'expired'
      AND NOT (
        u.role = 'student'
        AND u.account_status = 'graduated'
        AND u.graduated_at IS NOT NULL
        AND u.graduated_at > DATEADD(YEAR, -10, GETDATE())
      )
  `)
  const totalTrashed = (graduatedRetentionResult.rowsAffected[0] || 0) + (trashedResult.rowsAffected[0] || 0)
  logger.info(`Auto-trashed: ${totalTrashed} documents (${graduatedRetentionResult.rowsAffected[0]} after 10-year graduation retention)`)
  return totalTrashed
}

const purgeExpiredTrash = async (trashDays) => {
  const pool = await getPool()
  const sysSettings = await loadSettings(pool, sql)

  const expiredDocs = await pool.request()
    .input('trash_days', sql.Int, trashDays)
    .query(`
      SELECT d.doc_id, d.title, d.doc_type, d.trash_reason,
             u.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      WHERE d.status = 'trashed'
        AND d.trashed_at < DATEADD(DAY, -@trash_days, GETDATE())
    `)

  if (expiredDocs.recordset.length === 0) return 0

  const tmpl = await loadTemplate(pool, sql, 'permanent_delete')

  for (const doc of expiredDocs.recordset) {
    try {
      const reason = `อยู่ในถังขยะนานเกิน ${trashDays} วัน`
      const vars = {
        name:        doc.owner_name,
        docTitle:    doc.title,
        docType:     doc.doc_type,
        reason,
        deletedBy:   `ระบบอัตโนมัติ (ครบ ${trashDays} วัน)`,
        system_name: sysSettings.system_name,
        org_name:    sysSettings.org_name,
      }

      await sendMail({
        to:      doc.owner_email,
        subject: renderTemplate(tmpl.subject, vars),
        html:    renderTemplate(tmpl.body_html, vars),
      })

      // in-app notification
      await pool.request()
        .input('user_id', sql.Int,      doc.owner_id)
        .input('doc_id',  sql.Int,      doc.doc_id)
        .input('type',    sql.NVarChar, 'deleted')
        .input('message', sql.NVarChar, `เอกสาร ${doc.doc_type} "${doc.title}" ถูกลบถาวรโดยอัตโนมัติ เนื่องจากอยู่ในถังขยะครบ ${trashDays} วัน`)
        .input('channel', sql.NVarChar, 'both')
        .query(`INSERT INTO dbo.NOTIFICATIONS (user_id, doc_id, type, message, channel)
                VALUES (@user_id, @doc_id, @type, @message, @channel)`)

      // ลบไฟล์จาก disk
      const filesResult = await pool.request()
        .input('doc_id', sql.Int, doc.doc_id)
        .query('SELECT * FROM dbo.DOCUMENT_FILES WHERE doc_id = @doc_id')
      for (const f of filesResult.recordset) {
        if (fs.existsSync(f.file_path)) fs.unlinkSync(f.file_path)
      }

      await pool.request()
        .input('doc_id', sql.Int, doc.doc_id)
        .query(`UPDATE dbo.DOCUMENTS
                SET status='deleted', deleted_at=GETDATE(), updated_at=GETDATE()
                WHERE doc_id=@doc_id`)

      const firstFile = filesResult.recordset[0]
      await pool.request()
        .input('doc_id',             sql.Int,      doc.doc_id)
        .input('deleted_by',         sql.Int,      null)
        .input('reason',             sql.NVarChar, 'auto_purge_30d')
        .input('original_file_path', sql.NVarChar, firstFile?.file_path || '')
        .input('original_file_name', sql.NVarChar, firstFile?.file_name || '')
        .input('doc_title',          sql.NVarChar, doc.title)
        .input('owner_email',        sql.NVarChar, doc.owner_email)
        .query(`INSERT INTO dbo.DELETION_LOGS
                  (doc_id, deleted_by, reason, original_file_path, original_file_name, doc_title, owner_email)
                VALUES (@doc_id, @deleted_by, @reason, @original_file_path, @original_file_name, @doc_title, @owner_email)`)

      logger.info(`🗑️ Auto-purged doc ${doc.doc_id} "${doc.title}" (owner: ${doc.owner_email})`)
    } catch (err) {
      logger.error(`❌ Auto-purge error for doc ${doc.doc_id}: ${err.message}`)
    }
  }

  logger.info(`✅ Auto-purge เสร็จ: ลบถาวร ${expiredDocs.recordset.length} เอกสาร`)
  return expiredDocs.recordset.length
}

const runScheduler = () => {
  setImmediate(async () => {
    logger.info('🕐 Startup check: ตรวจสอบเอกสารหมดอายุ')
    try {
      const pool = await getPool()
      const { trash_retention_days } = await loadThresholds(pool)
      await runStatusAndTrash()
      await purgeExpiredTrash(trash_retention_days)
      logger.info('✅ Startup check เสร็จสิ้น')
    } catch (err) {
      logger.error(`❌ Startup check error: ${err.message}`)
    }
  })

  cron.schedule('0 8 * * *', async () => {
    logger.info('🕐 Scheduler เริ่มทำงาน: ตรวจสอบเอกสารหมดอายุ')
    try {
      const pool = await getPool()
      const { expiry_warning_days, trash_retention_days } = await loadThresholds(pool)
      const sysSettings = await loadSettings(pool, sql)

      await runStatusAndTrash()
      await purgeExpiredTrash(trash_retention_days)

      // ดึงเอกสารที่ต้องแจ้งเตือน (อ่าน threshold จาก DB)
      const result = await pool.request()
        .input('expiry_days', sql.Int, expiry_warning_days)
        .query(`
          SELECT d.doc_id, d.title, d.doc_type, d.expire_date,
                 DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) AS days_remaining,
                 u.user_id, u.name AS owner_name, u.email AS owner_email
          FROM dbo.DOCUMENTS d
          JOIN dbo.USERS u ON d.user_id = u.user_id
          WHERE d.status IN ('active', 'expiring_soon')
            AND d.expire_date <= DATEADD(DAY, @expiry_days, CAST(GETDATE() AS DATE))
            AND d.doc_id NOT IN (
              SELECT doc_id FROM dbo.NOTIFICATIONS
              WHERE type = 'expiry_warning'
                AND created_at >= DATEADD(DAY, -1, GETDATE())
            )
        `)

      const tmpl = await loadTemplate(pool, sql, 'expiry_warning')

      for (const doc of result.recordset) {
        const notifResult = await pool.request()
          .input('user_id', sql.Int,      doc.user_id)
          .input('doc_id',  sql.Int,      doc.doc_id)
          .input('type',    sql.NVarChar, 'expiry_warning')
          .input('message', sql.NVarChar, `ใบประกาศ ${doc.doc_type} "${doc.title}" จะหมดอายุในอีก ${doc.days_remaining} วัน`)
          .input('channel', sql.NVarChar, 'both')
          .query(`INSERT INTO dbo.NOTIFICATIONS (user_id, doc_id, type, message, channel)
                  OUTPUT INSERTED.notif_id
                  VALUES (@user_id, @doc_id, @type, @message, @channel)`)

        const notifId = notifResult.recordset[0].notif_id

        const vars = {
          name:          doc.owner_name,
          docTitle:      doc.title,
          docType:       doc.doc_type,
          expireDate:    new Date(doc.expire_date).toLocaleDateString('th-TH'),
          daysRemaining: doc.days_remaining,
          system_name:   sysSettings.system_name,
          org_name:      sysSettings.org_name,
          clientUrl:     process.env.CLIENT_URL,
        }

        const subject = renderTemplate(tmpl.subject, vars)
        const html    = renderTemplate(tmpl.body_html, vars)
        const mailResult = await sendMail({ to: doc.owner_email, subject, html })

        await pool.request()
          .input('notif_id',     sql.Int,      notifId)
          .input('to_email',     sql.NVarChar, doc.owner_email)
          .input('subject',      sql.NVarChar, subject)
          .input('body',         sql.NVarChar, html)
          .input('status',       sql.NVarChar, mailResult.success ? 'sent' : 'failed')
          .input('error_message',sql.NVarChar, mailResult.error || null)
          .input('sent_at',      sql.DateTime, mailResult.success ? new Date() : null)
          .query(`INSERT INTO dbo.EMAIL_LOGS (notif_id, to_email, subject, body, status, error_message, sent_at)
                  VALUES (@notif_id, @to_email, @subject, @body, @status, @error_message, @sent_at)`)

        if (mailResult.success) {
          await pool.request()
            .input('notif_id', sql.Int, notifId)
            .query(`UPDATE dbo.NOTIFICATIONS
                    SET email_sent = 1, email_sent_at = GETDATE()
                    WHERE notif_id = @notif_id`)
        }
      }

      logger.info(`✅ Scheduler เสร็จ: แจ้งเตือน ${result.recordset.length} เอกสาร (threshold: ${expiry_warning_days} วัน, trash: ${trash_retention_days} วัน)`)
    } catch (err) {
      logger.error(`❌ Scheduler error: ${err.message}`)
    }
  }, { timezone: 'Asia/Bangkok' })

  logger.info('📅 Scheduler พร้อมทำงาน (ทุกวัน 08:00 น. เวลาไทย)')
}

module.exports = { runScheduler }

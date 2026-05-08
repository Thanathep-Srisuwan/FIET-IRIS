const cron = require('node-cron')
const fs   = require('fs')
const { getPool, sql } = require('../config/db')
const { sendMail, expiryWarningTemplate, permanentDeleteTemplate } = require('../utils/mailer')
const logger = require('../utils/logger')

const runStatusAndTrash = async () => {
  const pool = await getPool()
  await pool.request().execute('dbo.sp_UpdateDocumentStatus')
  const trashedResult = await pool.request().query(`
    UPDATE dbo.DOCUMENTS
    SET status = 'trashed',
        trashed_at = GETDATE(),
        trashed_by = NULL,
        trash_reason = 'เอกสารหมดอายุและถูกย้ายมาโดยอัตโนมัติ',
        updated_at = GETDATE()
    WHERE status = 'expired'
  `)
  logger.info(`🗑️ Auto-trashed: ${trashedResult.rowsAffected[0]} เอกสาร`)
  return trashedResult.rowsAffected[0]
}

const purgeExpiredTrash = async () => {
  const pool = await getPool()

  // ดึงเอกสารที่อยู่ในถังขยะนานเกิน 30 วัน
  const expiredDocs = await pool.request().query(`
    SELECT d.doc_id, d.title, d.doc_type, d.trash_reason,
           u.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email
    FROM dbo.DOCUMENTS d
    JOIN dbo.USERS u ON d.user_id = u.user_id
    WHERE d.status = 'trashed'
      AND d.trashed_at < DATEADD(DAY, -30, GETDATE())
  `)

  if (expiredDocs.recordset.length === 0) return 0

  for (const doc of expiredDocs.recordset) {
    try {
      // แจ้งเจ้าของก่อนลบ
      const reason = 'อยู่ในถังขยะนานเกิน 30 วัน'
      const template = permanentDeleteTemplate({
        name:        doc.owner_name,
        docTitle:    doc.title,
        docType:     doc.doc_type,
        reason,
        deletedBy:   'ระบบอัตโนมัติ (ครบ 30 วัน)',
      })
      await sendMail({ to: doc.owner_email, ...template })

      // แจ้งเตือน in-app
      await pool.request()
        .input('user_id', sql.Int,      doc.owner_id)
        .input('doc_id',  sql.Int,      doc.doc_id)
        .input('type',    sql.NVarChar, 'deleted')
        .input('message', sql.NVarChar, `เอกสาร ${doc.doc_type} "${doc.title}" ถูกลบถาวรโดยอัตโนมัติ เนื่องจากอยู่ในถังขยะครบ 30 วัน`)
        .input('channel', sql.NVarChar, 'both')
        .query(`INSERT INTO dbo.NOTIFICATIONS (user_id, doc_id, type, message, channel) VALUES (@user_id, @doc_id, @type, @message, @channel)`)

      // ลบไฟล์จาก disk
      const filesResult = await pool.request()
        .input('doc_id', sql.Int, doc.doc_id)
        .query('SELECT * FROM dbo.DOCUMENT_FILES WHERE doc_id = @doc_id')
      for (const f of filesResult.recordset) {
        if (fs.existsSync(f.file_path)) fs.unlinkSync(f.file_path)
      }

      // อัปเดต status เป็น deleted
      await pool.request()
        .input('doc_id', sql.Int, doc.doc_id)
        .query(`UPDATE dbo.DOCUMENTS SET status='deleted', deleted_at=GETDATE(), updated_at=GETDATE() WHERE doc_id=@doc_id`)

      // บันทึก deletion log
      const firstFile = filesResult.recordset[0]
      await pool.request()
        .input('doc_id',             sql.Int,      doc.doc_id)
        .input('deleted_by',         sql.Int,      null)
        .input('reason',             sql.NVarChar, 'auto_purge_30d')
        .input('original_file_path', sql.NVarChar, firstFile?.file_path || '')
        .input('original_file_name', sql.NVarChar, firstFile?.file_name || '')
        .input('doc_title',          sql.NVarChar, doc.title)
        .input('owner_email',        sql.NVarChar, doc.owner_email)
        .query(`
          INSERT INTO dbo.DELETION_LOGS
            (doc_id, deleted_by, reason, original_file_path, original_file_name, doc_title, owner_email)
          VALUES (@doc_id, @deleted_by, @reason, @original_file_path, @original_file_name, @doc_title, @owner_email)
        `)

      logger.info(`🗑️ Auto-purged doc ${doc.doc_id} "${doc.title}" (owner: ${doc.owner_email})`)
    } catch (err) {
      logger.error(`❌ Auto-purge error for doc ${doc.doc_id}: ${err.message}`)
    }
  }

  logger.info(`✅ Auto-purge เสร็จ: ลบถาวร ${expiredDocs.recordset.length} เอกสาร`)
  return expiredDocs.recordset.length
}

const runScheduler = () => {
  // รันทันทีเมื่อ server เริ่ม เพื่อจัดการเอกสารที่หมดอายุขณะ server ดับอยู่
  setImmediate(async () => {
    logger.info('🕐 Startup check: ตรวจสอบเอกสารหมดอายุ')
    try {
      await runStatusAndTrash()
      await purgeExpiredTrash()
      logger.info('✅ Startup check เสร็จสิ้น')
    } catch (err) {
      logger.error(`❌ Startup check error: ${err.message}`)
    }
  })

  // รันทุกวัน 08:00 น.
  cron.schedule('0 8 * * *', async () => {
    logger.info('🕐 Scheduler เริ่มทำงาน: ตรวจสอบเอกสารหมดอายุ')
    try {
      const pool = await getPool()

      // 1 & 2. อัปเดต status และย้ายไปถังขยะ
      await runStatusAndTrash()

      // 3. ลบถาวรเอกสารที่อยู่ในถังนานเกิน 30 วัน
      await purgeExpiredTrash()

      // 4. ดึงเอกสารที่ต้องแจ้งเตือน (expiring_soon เท่านั้น)
      const result = await pool.request().query(`
        SELECT * FROM dbo.v_ExpiringDocuments
        WHERE doc_id NOT IN (
          SELECT doc_id FROM dbo.NOTIFICATIONS
          WHERE type = 'expiry_warning'
            AND created_at >= DATEADD(DAY, -1, GETDATE())
        )
      `)

      for (const doc of result.recordset) {
        const notifResult = await pool.request()
          .input('user_id', sql.Int, doc.user_id)
          .input('doc_id', sql.Int, doc.doc_id)
          .input('type', sql.NVarChar, 'expiry_warning')
          .input('message', sql.NVarChar,
            `ใบประกาศ ${doc.doc_type} "${doc.title}" จะหมดอายุในอีก ${doc.days_remaining} วัน`)
          .input('channel', sql.NVarChar, 'both')
          .query(`
            INSERT INTO dbo.NOTIFICATIONS (user_id, doc_id, type, message, channel)
            OUTPUT INSERTED.notif_id
            VALUES (@user_id, @doc_id, @type, @message, @channel)
          `)

        const notifId = notifResult.recordset[0].notif_id

        const template = expiryWarningTemplate({
          name: doc.owner_name,
          docTitle: doc.title,
          docType: doc.doc_type,
          expireDate: new Date(doc.expire_date).toLocaleDateString('th-TH'),
          daysRemaining: doc.days_remaining,
        })

        const mailResult = await sendMail({ to: doc.owner_email, ...template })

        await pool.request()
          .input('notif_id', sql.Int, notifId)
          .input('to_email', sql.NVarChar, doc.owner_email)
          .input('subject', sql.NVarChar, template.subject)
          .input('body', sql.NVarChar, template.html)
          .input('status', sql.NVarChar, mailResult.success ? 'sent' : 'failed')
          .input('error_message', sql.NVarChar, mailResult.error || null)
          .input('sent_at', sql.DateTime, mailResult.success ? new Date() : null)
          .query(`
            INSERT INTO dbo.EMAIL_LOGS (notif_id, to_email, subject, body, status, error_message, sent_at)
            VALUES (@notif_id, @to_email, @subject, @body, @status, @error_message, @sent_at)
          `)

        if (mailResult.success) {
          await pool.request()
            .input('notif_id', sql.Int, notifId)
            .query(`
              UPDATE dbo.NOTIFICATIONS
              SET email_sent = 1, email_sent_at = GETDATE()
              WHERE notif_id = @notif_id
            `)
        }
      }

      logger.info(`✅ Scheduler เสร็จ: แจ้งเตือน ${result.recordset.length} เอกสาร`)
    } catch (err) {
      logger.error(`❌ Scheduler error: ${err.message}`)
    }
  }, { timezone: 'Asia/Bangkok' })

  logger.info('📅 Scheduler พร้อมทำงาน (ทุกวัน 08:00 น. เวลาไทย)')
}

module.exports = { runScheduler }

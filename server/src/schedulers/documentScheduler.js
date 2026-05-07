const cron = require('node-cron')
const { getPool, sql } = require('../config/db')
const { sendMail, expiryWarningTemplate } = require('../utils/mailer')
const logger = require('../utils/logger')

const runScheduler = () => {
  // รันทุกวัน 08:00 น.
  cron.schedule('0 8 * * *', async () => {
    logger.info('🕐 Scheduler เริ่มทำงาน: ตรวจสอบเอกสารหมดอายุ')
    try {
      const pool = await getPool()

      // 1. อัปเดต status ผ่าน Stored Procedure (active → expiring_soon → expired)
      await pool.request().execute('dbo.sp_UpdateDocumentStatus')

      // 2. ย้ายเอกสาร expired ทั้งหมดไปถังขยะโดยอัตโนมัติ
      const trashedResult = await pool.request().query(`
        UPDATE dbo.DOCUMENTS
        SET status = 'trashed',
            trashed_at = GETDATE(),
            trashed_by = NULL,
            updated_at = GETDATE()
        WHERE status = 'expired'
      `)
      logger.info(`🗑️ Auto-trashed: ${trashedResult.rowsAffected[0]} เอกสาร`)

      // 3. ดึงเอกสารที่ต้องแจ้งเตือน (expiring_soon เท่านั้น)
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

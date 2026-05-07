const nodemailer = require('nodemailer')
const logger = require('./logger')

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
})

const sendMail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
    })
    logger.info(`Email sent to ${to}: ${subject}`)
    return { success: true }
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`)
    return { success: false, error: err.message }
  }
}

// Template: แจ้งเตือนใกล้หมดอายุ
const expiryWarningTemplate = ({ name, docTitle, docType, expireDate, daysRemaining }) => ({
  subject: `[FIET-IRIS] ใบประกาศ ${docType} ของท่านใกล้หมดอายุใน ${daysRemaining} วัน`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #d97706;">⚠️ แจ้งเตือนใบประกาศใกล้หมดอายุ</h2>
      <p>เรียน คุณ${name}</p>
      <p>ใบประกาศ <strong>${docType}</strong> ของท่านชื่อ <strong>"${docTitle}"</strong>
         จะหมดอายุในอีก <strong>${daysRemaining} วัน</strong> (วันที่ ${expireDate})</p>
      <p>กรุณาดำเนินการต่ออายุหรืออัปโหลดเอกสารใหม่ก่อนวันหมดอายุ</p>
      <a href="${process.env.CLIENT_URL}/documents"
         style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
        เข้าสู่ระบบ FIET-IRIS
      </a>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">
        อีเมลนี้ส่งโดยอัตโนมัติจากระบบ FIET-IRIS คณะ FIET มจธ.
      </p>
    </div>
  `,
})

module.exports = { sendMail, expiryWarningTemplate }

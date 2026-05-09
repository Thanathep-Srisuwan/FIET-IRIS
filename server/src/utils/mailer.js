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
    await transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, html })
    logger.info(`Email sent to ${to}: ${subject}`)
    return { success: true }
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`)
    return { success: false, error: err.message }
  }
}

// แทนที่ {{variable}} ในข้อความด้วย vars object
const renderTemplate = (template, vars) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)

// ============================================================
//  Fallback templates (ใช้เมื่อ DB ยังไม่มีข้อมูล)
// ============================================================
const FALLBACK_TEMPLATES = {
  expiry_warning: {
    subject: '[{{system_name}}] ใบประกาศ {{docType}} ของท่านใกล้หมดอายุใน {{daysRemaining}} วัน',
    body_html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <h2 style="color: #d97706;">&#9888;&#65039; แจ้งเตือนใบประกาศใกล้หมดอายุ</h2>
  <p>เรียน คุณ{{name}}</p>
  <p>ใบประกาศ <strong>{{docType}}</strong> ของท่านชื่อ <strong>"{{docTitle}}"</strong>
     จะหมดอายุในอีก <strong>{{daysRemaining}} วัน</strong> (วันที่ {{expireDate}})</p>
  <p>กรุณาดำเนินการต่ออายุหรืออัปโหลดเอกสารใหม่ก่อนวันหมดอายุ</p>
  <a href="{{clientUrl}}/documents"
     style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin:8px 0;">
    เข้าสู่ระบบ {{system_name}}
  </a>
  <p style="color:#6b7280;font-size:12px;margin-top:24px;">
    อีเมลนี้ส่งโดยอัตโนมัติจากระบบ {{system_name}} {{org_name}}
  </p>
</div>`,
  },
  permanent_delete: {
    subject: '[{{system_name}}] เอกสาร {{docType}} ของท่านถูกลบออกจากระบบถาวรแล้ว',
    body_html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <h2 style="color: #dc2626;">&#128465;&#65039; แจ้งเตือน: เอกสารถูกลบถาวร</h2>
  <p>เรียน คุณ{{name}}</p>
  <p>เอกสาร <strong>{{docType}}</strong> ชื่อ <strong>"{{docTitle}}"</strong>
     ถูกลบออกจากระบบถาวรแล้ว และ<strong>ไม่สามารถกู้คืนได้อีกต่อไป</strong></p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0;">
    <tr style="background:#f8fafc;">
      <td style="padding:8px 12px;font-size:13px;color:#64748b;width:120px;">ดำเนินการโดย</td>
      <td style="padding:8px 12px;font-size:13px;color:#1e293b;">{{deletedBy}}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#64748b;">เหตุผล</td>
      <td style="padding:8px 12px;font-size:13px;color:#1e293b;">{{reason}}</td>
    </tr>
  </table>
  <p style="color:#6b7280;font-size:13px;">
    หากคุณมีข้อสงสัยเกี่ยวกับการลบเอกสารนี้ กรุณาติดต่อผู้ดูแลระบบ
  </p>
  <p style="color:#6b7280;font-size:12px;margin-top:24px;">
    อีเมลนี้ส่งโดยอัตโนมัติจากระบบ {{system_name}} {{org_name}}
  </p>
</div>`,
  },
}

// โหลด template จาก DB, fallback ถ้า DB ยังไม่มี
const loadTemplate = async (pool, sql, templateKey) => {
  try {
    const result = await pool.request()
      .input('key', sql.NVarChar, templateKey)
      .query('SELECT subject, body_html FROM dbo.EMAIL_TEMPLATES WHERE template_key = @key')
    if (result.recordset.length) return result.recordset[0]
  } catch {
    // DB ยังไม่มีตาราง EMAIL_TEMPLATES (ก่อนรัน migration)
  }
  return FALLBACK_TEMPLATES[templateKey] || null
}

// โหลด system settings จาก DB
const loadSettings = async (pool, sql) => {
  const defaults = {
    system_name: 'FIET-IRIS',
    org_name: 'คณะ FIET มจธ.',
  }
  try {
    const result = await pool.request().query(`
      SELECT setting_key, setting_value FROM dbo.SYSTEM_SETTINGS
      WHERE setting_key IN ('system_name', 'org_name')
    `)
    for (const row of result.recordset) defaults[row.setting_key] = row.setting_value
  } catch {
    // ก่อนรัน migration
  }
  return defaults
}

module.exports = { sendMail, renderTemplate, loadTemplate, loadSettings, FALLBACK_TEMPLATES }

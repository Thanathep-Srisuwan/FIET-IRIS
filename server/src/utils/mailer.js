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

const sendMail = async ({ to, subject, html, attachments }) => {
  try {
    await transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, html, attachments })
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

const temporaryPasswordTemplate = ({ name, email, tempPassword, reason = 'reset' }) => {
  const isNewAccount = reason === 'new_account'
  const title = isNewAccount ? 'แจ้งข้อมูลบัญชีผู้ใช้งาน FIET-IRIS' : 'แจ้งการรีเซ็ตรหัสผ่าน FIET-IRIS'
  const intro = isNewAccount
    ? 'บัญชีผู้ใช้งานระบบ FIET-IRIS ของท่านได้ถูกสร้างเรียบร้อยแล้ว'
    : 'ระบบได้ดำเนินการรีเซ็ตรหัสผ่านสำหรับบัญชีผู้ใช้งานของท่านเรียบร้อยแล้ว'

  return {
    subject: `[FIET-IRIS] ${title}`,
    html: `
      <div style="font-family:Arial,'Noto Sans Thai',sans-serif;max-width:640px;margin:auto;color:#1e293b;line-height:1.7">
        <div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
          <div style="background:#0d4f8c;padding:22px 28px;color:#ffffff">
            <h2 style="margin:0;font-size:20px">${title}</h2>
            <p style="margin:6px 0 0;color:#dbeafe;font-size:13px">Integrity Research Information System</p>
          </div>
          <div style="padding:26px 28px;background:#ffffff">
            <p style="margin-top:0">เรียน คุณ${name}</p>
            <p>${intro} กรุณาใช้ข้อมูลด้านล่างสำหรับเข้าสู่ระบบ</p>
            <table style="border-collapse:collapse;width:100%;margin:18px 0;background:#f8fafc;border-radius:10px;overflow:hidden">
              <tr>
                <td style="padding:12px 14px;color:#64748b;width:150px;border-bottom:1px solid #e2e8f0">อีเมลผู้ใช้งาน</td>
                <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0"><strong>${email}</strong></td>
              </tr>
              <tr>
                <td style="padding:12px 14px;color:#64748b">รหัสผ่านชั่วคราว</td>
                <td style="padding:12px 14px"><strong style="font-size:16px;color:#0f172a">${tempPassword}</strong></td>
              </tr>
            </table>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 14px;margin:18px 0;color:#9a3412;font-size:13px">
              เพื่อความปลอดภัย กรุณาเข้าสู่ระบบและเปลี่ยนรหัสผ่านใหม่ทันทีหลังจากเข้าสู่ระบบครั้งแรก
              และไม่ควรเปิดเผยรหัสผ่านชั่วคราวนี้แก่ผู้อื่น
            </div>
            <p style="font-size:13px;color:#64748b">
              หากท่านไม่ได้ร้องขอการดำเนินการนี้ หรือพบความผิดปกติ กรุณาติดต่อผู้ดูแลระบบ FIET-IRIS โดยเร็วที่สุด
            </p>
            <p style="font-size:12px;color:#94a3b8;margin-top:26px">
              อีเมลฉบับนี้เป็นข้อความอัตโนมัติจากระบบ FIET-IRIS กรุณาอย่าตอบกลับอีเมลฉบับนี้
            </p>
          </div>
        </div>
      </div>
    `,
  }
}

module.exports = { sendMail, renderTemplate, loadTemplate, loadSettings, temporaryPasswordTemplate, FALLBACK_TEMPLATES }

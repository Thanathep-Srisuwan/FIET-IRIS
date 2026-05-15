require('dotenv').config()
const bcrypt = require('bcrypt')
const { getPool, sql } = require('./db')

async function seedStaff() {
  try {
    const pool = await getPool()

    const email = 'staff@kmutt.ac.th'
    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT user_id FROM dbo.USERS WHERE email = @email')

    if (existing.recordset.length > 0) {
      console.log('⚠️  Staff account มีอยู่แล้ว ไม่ต้อง seed ซ้ำ')
      process.exit(0)
    }

    const hash = await bcrypt.hash('Staff@1234', 12)

    await pool.request()
      .input('name',        sql.NVarChar, 'เจ้าหน้าที่ทดสอบ')
      .input('email',       sql.NVarChar, email)
      .input('hash',        sql.NVarChar, hash)
      .input('affiliation', sql.NVarChar, 'สำนักงานคณะ')
      .query(`
        INSERT INTO dbo.USERS (name, email, password_hash, role, affiliation, must_change_pw, account_status)
        VALUES (@name, @email, @hash, 'staff', @affiliation, 0, 'active')
      `)

    console.log('✅ Seed staff สำเร็จ!')
    console.log('   Email   : staff@kmutt.ac.th')
    console.log('   Password: Staff@1234')
    console.log('   ⚠️  สำหรับทดสอบเท่านั้น กรุณาลบหรือเปลี่ยนรหัสผ่านก่อน deploy!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Seed staff ล้มเหลว:', err.message)
    process.exit(1)
  }
}

seedStaff()

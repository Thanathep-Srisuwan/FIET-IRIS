require('dotenv').config()
const bcrypt = require('bcrypt')
const { getPool } = require('./db')

async function seed() {
  try {
    const pool = await getPool()

    // ตรวจว่ามี admin อยู่แล้วหรือยัง
    const existing = await pool.request()
      .input('email', 'admin@kmutt.ac.th')
      .query('SELECT user_id FROM dbo.USERS WHERE email = @email')

    if (existing.recordset.length > 0) {
      console.log('⚠️  Admin มีอยู่แล้ว ไม่ต้อง seed ซ้ำ')
      process.exit(0)
    }

    const hash = await bcrypt.hash('Admin@1234', 12)

    await pool.request()
      .input('name', 'ผู้ดูแลระบบ')
      .input('email', 'admin@kmutt.ac.th')
      .input('password_hash', hash)
      .input('role', 'admin')
      .input('department', 'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี')
      .query(`
        INSERT INTO dbo.USERS (name, email, password_hash, role, department, must_change_pw)
        VALUES (@name, @email, @password_hash, @role, @department, 0)
      `)

    console.log('✅ Seed admin สำเร็จ!')
    console.log('   Email   : admin@kmutt.ac.th')
    console.log('   Password: Admin@1234')
    console.log('   ⚠️  กรุณาเปลี่ยนรหัสผ่านหลัง deploy!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Seed ล้มเหลว:', err.message)
    process.exit(1)
  }
}

seed()

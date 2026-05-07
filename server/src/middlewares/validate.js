// ตรวจ domain อีเมล KMUTT
const validateKMUTTEmail = (req, res, next) => {
  const { email } = req.body
  if (!email?.endsWith('@kmutt.ac.th')) {
    return res.status(400).json({ message: 'กรุณาใช้อีเมลมหาวิทยาลัย @kmutt.ac.th เท่านั้น' })
  }
  next()
}

// ตรวจ must_change_pw
const requirePasswordChange = (req, res, next) => {
  if (req.user.must_change_pw) {
    return res.status(403).json({
      message: 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งานระบบ',
      must_change_pw: true,
    })
  }
  next()
}

module.exports = { validateKMUTTEmail, requirePasswordChange }

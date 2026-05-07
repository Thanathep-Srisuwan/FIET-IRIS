import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { authService } from '../../services/api'
import toast from 'react-hot-toast'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()

  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.current_password || !form.new_password || !form.confirm_password)
      return toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')

    if (form.new_password.length < 8)
      return toast.error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')

    if (form.new_password !== form.confirm_password)
      return toast.error('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน')

    setLoading(true)
    try {
      await authService.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      })
      updateUser({ ...user, must_change_pw: false })
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-white">เปลี่ยนรหัสผ่าน</h1>
          <p className="text-primary-200 mt-1 text-sm">
            กรุณาตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานระบบ
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* แจ้งเตือน */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-800">
            ⚠️ บัญชีของคุณต้องเปลี่ยนรหัสผ่านก่อนใช้งาน
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รหัสผ่านปัจจุบัน
              </label>
              <input
                type="password"
                name="current_password"
                value={form.current_password}
                onChange={handleChange}
                className="input-field"
                placeholder="รหัสผ่านที่ได้รับจากระบบ"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รหัสผ่านใหม่
              </label>
              <input
                type="password"
                name="new_password"
                value={form.new_password}
                onChange={handleChange}
                className="input-field"
                placeholder="อย่างน้อย 8 ตัวอักษร"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                type="password"
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                className="input-field"
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังบันทึก...
                </>
              ) : 'บันทึกรหัสผ่านใหม่'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}

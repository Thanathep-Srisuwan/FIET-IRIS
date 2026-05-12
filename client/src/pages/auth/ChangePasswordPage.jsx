import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LockKeyhole } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useLanguage } from '../../contexts/LanguageContext'
import { authService } from '../../services/api'
import ThemeToggle from '../../components/common/ThemeToggle'
import LanguageToggle from '../../components/common/LanguageToggle'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const { t } = useLanguage()
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
    if (!form.current_password || !form.new_password || !form.confirm_password) return toast.error(t('auth.fillAll'))
    if (form.new_password.length < 8) return toast.error(t('auth.minLength'))
    if (form.new_password !== form.confirm_password) return toast.error(t('auth.passwordMismatch'))

    setLoading(true)
    try {
      await authService.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      })
      updateUser({ ...user, must_change_pw: false })
      toast.success(t('auth.changeSuccess'))
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || t('auth.changeFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-primary-900 p-4">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageToggle className="h-10 bg-white/10 px-3 text-white hover:bg-white/20" />
        <ThemeToggle className="bg-white/10 text-white hover:bg-white/20 dark:bg-slate-900/70 dark:hover:bg-slate-800" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <LockKeyhole size={30} className="text-primary-700" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('auth.changePassword')}</h1>
          <p className="mt-1 text-sm text-primary-200">{t('auth.changePasswordDesc')}</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900">
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {t('auth.mustChangePassword')}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">{t('auth.currentPassword')}</label>
              <input
                type="password"
                name="current_password"
                value={form.current_password}
                onChange={handleChange}
                className="input-field"
                placeholder={t('auth.currentPasswordPlaceholder')}
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">{t('auth.newPassword')}</label>
              <input
                type="password"
                name="new_password"
                value={form.new_password}
                onChange={handleChange}
                className="input-field"
                placeholder={t('auth.newPasswordPlaceholder')}
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">{t('auth.confirmNewPassword')}</label>
              <input
                type="password"
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                className="input-field"
                placeholder={t('auth.confirmNewPasswordPlaceholder')}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 flex w-full items-center justify-center gap-2 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('common.saving')}
                </>
              ) : t('auth.saveNewPassword')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

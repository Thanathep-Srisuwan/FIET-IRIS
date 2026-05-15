import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, KeyRound, LogIn, Mail, X } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useLanguage } from '../../contexts/LanguageContext'
import { authService } from '../../services/api'
import ThemeToggle from '../../components/common/ThemeToggle'
import LanguageToggle from '../../components/common/LanguageToggle'
import fietLogo from '../../assets/fiet-logo.png'
import kmuttLogo from '../../assets/kmutt-logo.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { t } = useLanguage()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error(t('auth.enterEmailPassword'))
    setLoading(true)
    try {
      const { data } = await authService.login(form)
      setAuth(data.user, data.token, data.refreshToken)
      toast.success(t('auth.welcome', { name: data.user.name }))
      navigate(data.user.must_change_pw ? '/change-password' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || t('auth.signInFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    const email = (forgotEmail || form.email).trim()
    if (!email) return toast.error(t('auth.enterKmuttEmail'))
    if (!email.endsWith('@kmutt.ac.th')) return toast.error(t('auth.useKmuttEmail'))

    setForgotLoading(true)
    try {
      const { data } = await authService.forgotPassword({ email })
      toast.success(data.message || t('auth.resetSubmitted'))
      setForgotOpen(false)
      setForgotEmail('')
    } catch (err) {
      toast.error(err.response?.data?.message || t('auth.resetFailed'))
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f8] transition-colors duration-300 dark:bg-slate-950">
      <header className="flex h-[60px] items-center justify-between border-b border-[#e8edf2] bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg transition-transform hover:scale-105">
            <img src={kmuttLogo} alt="KMUTT" className="h-full w-full object-contain dark:brightness-110" />
          </div>
          <div className="h-8 w-px bg-[#dde5ee] dark:bg-slate-800" />
          <div className="h-14 w-12 flex-shrink-0 overflow-hidden rounded-lg transition-transform hover:scale-105">
            <img src={fietLogo} alt="FIET" className="h-full w-full object-contain dark:brightness-110" />
          </div>
          <div className="h-8 w-px bg-[#dde5ee] dark:bg-slate-800" />
          <div>
            <p className="text-[15px] font-bold leading-none tracking-wide text-[#1a2d45] dark:text-slate-200">FIET IRIS</p>
            <p className="mt-1.5 text-[11px] font-medium leading-none text-[#7a96b0] dark:text-slate-500">Faculty of Industrial Education and Technology</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle className="h-10 px-3" />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[400px] overflow-hidden rounded-3xl border border-[#e0e8f0] bg-white shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="relative overflow-hidden bg-[#42b5e1] px-8 py-8 dark:bg-slate-800">
            <div className="pointer-events-none absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-white/5" />
            <h1 className="relative z-10 text-[22px] font-bold tracking-tight text-white">{t('auth.signInTitle')}</h1>
            <p className="relative z-10 mt-1.5 text-[14px] text-white/80 dark:text-slate-400">{t('auth.signInSubtitle')}</p>
            <div className="relative z-10 mt-5 h-[4px] w-12 rounded-full bg-[#f7931e] shadow-sm" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 px-8 py-8">
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-[#3a5068] dark:text-slate-400">{t('auth.username')}</label>
              <div className="group relative">
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="username@kmutt.ac.th"
                  disabled={loading}
                  className="h-12 w-full rounded-xl border-[1.5px] border-[#dde5ee] bg-[#fafcfe] pl-4 pr-11 text-sm text-[#1a2d45] outline-none transition-all placeholder:text-[#b8c8d8] focus:border-[#42b5e1] focus:bg-white focus:ring-4 focus:ring-[#42b5e1]/10 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:border-primary-500 dark:focus:bg-slate-900 dark:focus:ring-primary-500/10"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b8c8d8] transition-colors group-focus-within:text-[#42b5e1] dark:text-slate-600">
                  <Mail size={20} />
                </div>
              </div>
              <p className="mt-2 flex items-center gap-2 text-[11px] font-medium text-[#8fa5bc] dark:text-slate-500">
                <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-[#42b5e1]" />
                {t('auth.kmuttOnly')}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#3a5068] dark:text-slate-400">{t('auth.password')}</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(form.email)
                    setForgotOpen(true)
                  }}
                  className="text-[11px] font-bold text-primary-600 hover:underline dark:text-primary-400"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
              <div className="group relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={t('auth.passwordPlaceholder')}
                  disabled={loading}
                  className="h-12 w-full rounded-xl border-[1.5px] border-[#dde5ee] bg-[#fafcfe] pl-4 pr-11 text-sm text-[#1a2d45] outline-none transition-all placeholder:text-[#b8c8d8] focus:border-[#42b5e1] focus:bg-white focus:ring-4 focus:ring-[#42b5e1]/10 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:border-primary-500 dark:focus:bg-slate-900 dark:focus:ring-primary-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b8c8d8] transition-colors hover:text-[#7a96b0] dark:text-slate-600 dark:hover:text-slate-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex h-12 w-full items-center justify-center gap-2.5 rounded-[14px] bg-primary-600 text-[15px] font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-700 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('auth.signingIn')}
                </>
              ) : (
                <>
                  <LogIn size={20} className="opacity-90 transition-transform group-hover:translate-x-1" />
                  {t('auth.signIn')}
                </>
              )}
            </button>

            <p className="pt-2 text-center text-[11px] font-medium leading-relaxed text-[#a0b4c8] dark:text-slate-600">
              {t('auth.helpLine1')}<br />
              <span className="cursor-pointer font-bold text-[#42b5e1] transition-all hover:underline dark:text-primary-500">{t('auth.helpLine2')}</span>
            </p>
          </form>
        </div>
      </main>

      <footer className="flex h-12 items-center justify-center border-t border-[#e8edf2] bg-white px-10 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#a8bdd0] dark:text-slate-600">
          © {new Date().getFullYear()} Faculty of Industrial Education and Technology, KMUTT. ALL RIGHTS RESERVED.
        </span>
      </footer>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/25 dark:text-primary-400">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{t('auth.resetTitle')}</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('auth.resetDesc')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                aria-label={t('auth.closeResetDialog')}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-[#3a5068] dark:text-slate-400">{t('auth.kmuttEmail')}</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="username@kmutt.ac.th"
                  disabled={forgotLoading}
                  className="h-12 w-full rounded-xl border-[1.5px] border-[#dde5ee] bg-[#fafcfe] px-4 text-sm text-[#1a2d45] outline-none transition-all placeholder:text-[#b8c8d8] focus:border-[#42b5e1] focus:ring-4 focus:ring-[#42b5e1]/10 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:border-primary-500"
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setForgotOpen(false)} disabled={forgotLoading} className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={forgotLoading} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
                  {forgotLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {t('auth.sending')}
                    </>
                  ) : t('auth.sendReset')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

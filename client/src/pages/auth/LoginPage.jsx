import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { authService } from '../../services/api'
import ThemeToggle from '../../components/common/ThemeToggle'
import toast from 'react-hot-toast'
import { Mail, Eye, EyeOff, LogIn } from 'lucide-react'

import fietLogo from '../../assets/fiet-logo.png'
import kmuttLogo from '../../assets/kmutt-logo.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password)
      return toast.error('Please enter your email and password')
    setLoading(true)
    try {
      const { data } = await authService.login(form)
      setAuth(data.user, data.token, data.refreshToken)
      toast.success(`Welcome, ${data.user.name}`)
      navigate(data.user.must_change_pw ? '/change-password' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-slate-950 flex flex-col transition-colors duration-300">

      {/* Topbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-[#e8edf2] dark:border-slate-800 h-[60px] flex items-center justify-between px-4 sm:px-10">
        <div className="flex items-center gap-3">

          {/* KMUTT Logo */}
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-transform hover:scale-105">
            <img src={kmuttLogo} alt="KMUTT" className="w-full h-full object-contain dark:brightness-110" />
          </div>

          <div className="w-px h-8 bg-[#dde5ee] dark:bg-slate-800" />

          {/* FIET Logo */}
          <div className="w-12 h-14 rounded-lg overflow-hidden flex-shrink-0 transition-transform hover:scale-105">
            <img src={fietLogo} alt="FIET" className="w-full h-full object-contain dark:brightness-110" />
          </div>

          <div className="w-px h-8 bg-[#dde5ee] dark:bg-slate-800" />

          <div>
            <p className="text-[15px] font-bold text-[#1a2d45] dark:text-slate-200 tracking-wide leading-none">FIET-IRIS</p>
            <p className="text-[11px] text-[#7a96b0] dark:text-slate-500 mt-1.5 font-medium leading-none">Faculty of Industrial Education and Technology</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-3xl border border-[#e0e8f0] dark:border-slate-800 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none">

          {/* Card Header */}
          <div className="bg-[#42b5e1] dark:bg-slate-800 px-8 py-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
            <h1 className="text-white text-[22px] font-bold tracking-tight relative z-10">Sign in to FIET-IRIS</h1>
            <p className="text-white/80 dark:text-slate-400 text-[14px] mt-1.5 relative z-10">Use your KMUTT university email to continue</p>
            <div className="mt-5 h-[4px] w-12 rounded-full bg-[#f7931e] relative z-10 shadow-sm" />
          </div>

          {/* Card Body */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-[#3a5068] dark:text-slate-400 uppercase tracking-widest mb-2">
                Username
              </label>
              <div className="relative group">
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="username@kmutt.ac.th"
                  disabled={loading}
                  className="w-full h-12 border-[1.5px] border-[#dde5ee] dark:border-slate-800 rounded-xl pl-4 pr-11 text-sm text-[#1a2d45] dark:text-slate-200 bg-[#fafcfe] dark:bg-slate-800 placeholder-[#b8c8d8] dark:placeholder-slate-600 outline-none transition-all focus:border-[#42b5e1] dark:focus:border-primary-500 focus:ring-4 focus:ring-[#42b5e1]/10 dark:focus:ring-primary-500/10 focus:bg-white dark:focus:bg-slate-900 disabled:opacity-60"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b8c8d8] dark:text-slate-600 transition-colors group-focus-within:text-[#42b5e1]">
                  <Mail size={20} />
                </div>
              </div>
              <p className="flex items-center gap-2 mt-2 text-[11px] text-[#8fa5bc] dark:text-slate-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#42b5e1] flex-shrink-0 animate-pulse" />
                Only @kmutt.ac.th addresses are accepted
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-[#3a5068] dark:text-slate-400 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="w-full h-12 border-[1.5px] border-[#dde5ee] dark:border-slate-800 rounded-xl pl-4 pr-11 text-sm text-[#1a2d45] dark:text-slate-200 bg-[#fafcfe] dark:bg-slate-800 placeholder-[#b8c8d8] dark:placeholder-slate-600 outline-none transition-all focus:border-[#42b5e1] dark:focus:border-primary-500 focus:ring-4 focus:ring-[#42b5e1]/10 dark:focus:ring-primary-500/10 focus:bg-white dark:focus:bg-slate-900 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b8c8d8] dark:text-slate-600 hover:text-[#7a96b0] dark:hover:text-slate-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="group w-full h-12 rounded-[14px] text-white text-[15px] font-semibold transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 bg-primary-600 shadow-sm hover:bg-primary-700 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={20} className="opacity-90 transition-transform group-hover:translate-x-1" />
                  Sign In
                </>
              )}
            </button>

            {/* Help */}
            <p className="text-center text-[11px] text-[#a0b4c8] dark:text-slate-600 leading-relaxed pt-2 font-medium">
              Having trouble signing in?<br />
              Please contact{' '}
              <span className="text-[#42b5e1] dark:text-primary-500 font-bold hover:underline cursor-pointer transition-all">Administrator</span>
            </p>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-[#e8edf2] dark:border-slate-800 h-12 flex items-center justify-center px-10 transition-colors duration-300">
        <span className="text-[11px] text-[#a8bdd0] dark:text-slate-600 font-semibold tracking-wide uppercase">
          © {new Date().getFullYear()} FIET, KMUTT · Integrity Research Information System
        </span>
      </footer>

    </div>
  )
}

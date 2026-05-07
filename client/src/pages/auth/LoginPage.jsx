import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { authService } from '../../services/api'
import toast from 'react-hot-toast'

import fietLogo from '../../assets/fiet-logo.png'
import kmuттLogo from '../../assets/kmutt-logo.png'

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
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">

      {/* Topbar */}
      <header className="bg-white border-b border-[#e8edf2] h-[60px] flex items-center px-10">
        <div className="flex items-center gap-3">

          {/* KMUTT Logo */}
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            <img src={kmuттLogo} alt="KMUTT" className="w-full h-full object-contain" />
          </div>

          <div className="w-px h-8 bg-[#dde5ee]" />

          {/* FIET Logo */}
          <div className="w-12 h-14 rounded-lg overflow-hidden flex-shrink-0">
            <img src={fietLogo} alt="FIET" className="w-full h-full object-contain" />
          </div>

          <div className="w-px h-8 bg-[#dde5ee]" />

          <div>
            <p className="text-[15px] font-medium text-[#1a2d45] tracking-wide">Integrity Research Information System</p>
            <p className="text-[11px] text-[#7a96b0] mt-0.5">Faculty of Industrial Education and Technology</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] bg-white rounded-2xl border border-[#e0e8f0] overflow-hidden">

          {/* Card Header */}
          <div className="bg-[#42b5e1] px-8 py-7">
            <h1 className="text-white text-[22px] font-medium tracking-wide">Sign in to FIET-IRIS</h1>
            <p className="text-white/80 text-[14px] mt-1">Use your KMUTT university email to continue</p>
            <div className="mt-4 h-[3px] w-10 rounded-full bg-[#f7931e]" />
          </div>

          {/* Card Body */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">

            {/* Email */}
            <div>
              <label className="block text-[11px] font-medium text-[#3a5068] uppercase tracking-widest mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="username@kmutt.ac.th"
                  disabled={loading}
                  className="w-full h-11 border-[1.5px] border-[#dde5ee] rounded-lg pl-3.5 pr-11 text-sm text-[#1a2d45] bg-[#fafcfe] placeholder-[#b8c8d8] outline-none transition focus:border-[#42b5e1] focus:ring-[3px] focus:ring-[#42b5e1]/10 focus:bg-white disabled:opacity-60"
                />
                <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-[#b8c8d8] pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
              </div>
              <p className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#8fa5bc]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#42b5e1] flex-shrink-0" />
                Only @kmutt.ac.th addresses are accepted
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-medium text-[#3a5068] uppercase tracking-widest mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="w-full h-11 border-[1.5px] border-[#dde5ee] rounded-lg pl-3.5 pr-11 text-sm text-[#1a2d45] bg-[#fafcfe] placeholder-[#b8c8d8] outline-none transition focus:border-[#42b5e1] focus:ring-[3px] focus:ring-[#42b5e1]/10 focus:bg-white disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b8c8d8] hover:text-[#7a96b0] transition"
                >
                  {showPassword ? (
                    <svg className="w-[17px] h-[17px]" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <svg className="w-[17px] h-[17px]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-[10px] text-white text-[15px] font-semibold tracking-wide transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #42b5e1 0%, #1a90c0 100%)',
                boxShadow: '0 4px 14px rgba(66,181,225,0.45)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg,#2da3d0 0%,#1278a8 100%)'
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(66,181,225,0.55)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg,#42b5e1 0%,#1a90c0 100%)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(66,181,225,0.45)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-[18px] h-[18px] opacity-90" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Sign In
                </>
              )}
            </button>

            {/* Help */}
            <p className="text-center text-[11px] text-[#a0b4c8] leading-relaxed pt-1">
              Having trouble signing in?<br />
              Please contact{' '}
              <span className="text-[#42b5e1] font-medium">Administrator</span>
            </p>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e8edf2] h-10 flex items-center justify-between px-10">
        <span className="text-[11px] text-[#a8bdd0]">
          © {new Date().getFullYear()} Faculty of Industrial Education and Technology, KMUTT. All rights reserved.
        </span>
      </footer>

    </div>
  )
}
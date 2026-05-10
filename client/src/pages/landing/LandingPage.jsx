import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { announcementService } from '../../services/api'
import ThemeToggle from '../../components/common/ThemeToggle'

import fietLogo  from '../../assets/fiet-logo.png'
import kmuttLogo from '../../assets/kmutt-logo.png'
import irisLogo   from '../../assets/LOGO-IRIS.png'

const RI_URL   = 'https://ethics.kmutt.ac.th/riservice/'
const IRB_URL  = 'https://ethics.kmutt.ac.th/irb/'
const FIET_URL = 'https://www.fiet.kmutt.ac.th/'
const TRACK_IRB_URL = 'https://www.kmutt.me/FIET.IRB.Tracking.Report'

function renderWithLinks(text) {
  if (!text) return null
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="text-blue-600 underline break-all hover:text-blue-800">
        {part}
      </a>
    ) : part
  )
}

function AnnouncementModal({ item, onClose }) {
  if (!item) return null
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onMouseDown={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug">{item.title}</h2>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                </svg>
                {new Date(item.created_at).toLocaleString('th-TH', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            ✕
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto flex-1 custom-scrollbar">
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-auto rounded-2xl mb-6 shadow-sm"
            />
          )}
          <div className="text-[15px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-body">
            {renderWithLinks(item.content)}
          </div>
        </div>
        {item.link_url && (
          <div className="px-6 pb-4 pt-2">
            <a href={item.link_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-[15px] font-bold text-white transition-all hover:opacity-90 shadow-lg hover:shadow-xl active:scale-[0.98]"
              style={{ backgroundColor: '#1262a0' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              ดูรายละเอียดเพิ่มเติม
            </a>
          </div>
        )}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button onClick={onClose}
            className="text-sm font-bold px-6 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  )
}

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect width="48" height="48" rx="12" fill="#e0f2fe"/>
        <path d="M13 14a2 2 0 012-2h12l8 8v16a2 2 0 01-2 2H15a2 2 0 01-2-2V14z" fill="white" stroke="#0284c7" strokeWidth="2.2"/>
        <path d="M27 12v8h8" stroke="#0284c7" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M18 22h12M18 26h9M18 30h6" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    title: 'จัดการเอกสารวิจัย',
    desc: 'อัปโหลด จัดเก็บ และติดตามสถานะเอกสารงานวิจัยอย่างเป็นระบบตลอดทุกขั้นตอน',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect width="48" height="48" rx="12" fill="#fef3c7"/>
        <path d="M24 11v3" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/>
        <path d="M16 29v-7a8 8 0 0116 0v7" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 30h24" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M21.5 33a2.5 2.5 0 005 0" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="32" cy="15" r="5" fill="#f59e0b"/>
      </svg>
    ),
    title: 'แจ้งเตือนอัตโนมัติ',
    desc: 'รับการแจ้งเตือนเมื่อเอกสารใกล้หมดอายุ หมดอายุ หรือมีการเปลี่ยนแปลงที่สำคัญ',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect width="48" height="48" rx="12" fill="#dcfce7"/>
        <rect x="13" y="30" width="5" height="8" rx="1.5" fill="#16a34a"/>
        <rect x="21" y="22" width="5" height="16" rx="1.5" fill="#22c55e"/>
        <rect x="29" y="14" width="5" height="24" rx="1.5" fill="#4ade80"/>
      </svg>
    ),
    title: 'รายงานภาพรวม',
    desc: 'ผู้บริหารดูสถิติและสถานะงานวิจัยของทุกสาขาวิชาได้ในที่เดียว พร้อม dashboard แบบ real-time',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect width="48" height="48" rx="12" fill="#ede9fe"/>
        <circle cx="19" cy="20" r="5" stroke="#7c3aed" strokeWidth="2.5"/>
        <path d="M11 34c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="31" cy="20" r="4" stroke="#a78bfa" strokeWidth="2"/>
        <path d="M35 34c0-3.3-2.7-6-6-6" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'จัดการผู้ใช้งาน',
    desc: 'กำหนดสิทธิ์การเข้าถึงตามบทบาท ไม่ว่าจะเป็นนักวิจัย อาจารย์ หรือผู้บริหารคณะ',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect width="48" height="48" rx="12" fill="#fce7f3"/>
        <circle cx="21" cy="21" r="9" stroke="#db2777" strokeWidth="2.5"/>
        <path d="M27.5 27.5l7 7" stroke="#db2777" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M17 19.5h8M18.5 22h5M20 24.5h2" stroke="#db2777" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    title: 'ค้นหาและกรองข้อมูล',
    desc: 'ค้นหาเอกสารและข้อมูลวิจัยได้อย่างรวดเร็ว กรองตามปีการศึกษา สถานะ หรือสาขาวิชา',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect width="48" height="48" rx="12" fill="#cffafe"/>
        <rect x="7" y="19" width="15" height="10" rx="5" stroke="#0891b2" strokeWidth="2.5"/>
        <rect x="26" y="19" width="15" height="10" rx="5" stroke="#06b6d4" strokeWidth="2.5"/>
        <path d="M22 24h4" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'เชื่อมต่อระบบภายนอก',
    desc: 'เชื่อมต่อกับระบบ RI และ IRB ของ มจธ. เพื่อการยืนยันและติดตามสถานะอย่างครบวงจร',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const [announcements, setAnnouncements] = useState([])
  const [loadingAnn, setLoadingAnn]       = useState(true)
  const [selected, setSelected]           = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true })
  }, [token])

  useEffect(() => {
    announcementService.getPublic()
      .then(res => setAnnouncements(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingAnn(false))
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      <AnnouncementModal item={selected} onClose={() => setSelected(null)} />

      {/* ===== Top announcement banner ===== */}
      {!loadingAnn && announcements.length > 0 && (
        <div className="w-full py-2.5 px-4 text-center text-[11px] text-white font-bold flex items-center justify-center gap-2 shadow-sm relative z-[60]"
          style={{ backgroundColor: '#1262a0' }}>
          <svg className="w-4 h-4 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <span
            className="cursor-pointer underline underline-offset-4 hover:text-white/80 transition-colors tracking-wide"
            onClick={() => setSelected(announcements[0])}
          >
            {announcements[0].title}
          </span>
          <span className="opacity-60 font-medium hidden sm:inline">— คลิกเพื่ออ่านเพิ่มเติม</span>
        </div>
      )}

      {/* ===== Navbar ===== */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-50 shadow-sm transition-all duration-300">
        <div className="w-full px-6 h-[64px] flex items-center justify-between">
          {/* Logo group */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-transform hover:scale-105">
              <img src={kmuttLogo} alt="KMUTT" className="w-full h-full object-contain dark:brightness-110" />
            </div>
            <div className="w-px h-8 bg-[#dde5ee] dark:bg-slate-800" />
            <div className="w-12 h-14 rounded-lg overflow-hidden flex-shrink-0 transition-transform hover:scale-105">
              <img src={fietLogo} alt="FIET" className="w-full h-full object-contain dark:brightness-110" />
            </div>
            <div className="w-px h-8 bg-[#dde5ee] dark:bg-slate-800 hidden md:block" />
            <div className="hidden md:block">
              <p className="text-[15px] font-bold text-[#1a2d45] dark:text-slate-100 tracking-wide leading-tight">FIET IRIS</p>
              <p className="text-[11px] text-[#7a96b0] dark:text-slate-500 mt-0.5 leading-tight font-medium">Faculty of Industrial Education and Technology</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: 'หน้าแรก', href: '#top' },
              { label: 'ฟีเจอร์', href: '#features' },
              { label: 'ระบบที่เกี่ยวข้อง', href: '#links' },
              { label: 'ข่าวสาร', href: '#announcements' },
              { label: 'ตรวจสอบสถานะ IRB', href: TRACK_IRB_URL, target: '_blank' },
              { label: 'ติดต่อเรา', href: '#contact' },
            ].map(n => (
              <a key={n.label} href={n.href} target={n.target} rel={n.target ? 'noopener noreferrer' : undefined}
                className="px-3 py-1.5 text-sm font-bold text-gray-600 dark:text-slate-400 hover:text-[#1262a0] dark:hover:text-primary-400 rounded-md hover:bg-blue-50 dark:hover:bg-primary-900/20 transition-all duration-200">
                {n.label}
              </a>
            ))}
            <div className="w-px h-5 bg-gray-200 dark:bg-slate-800 mx-2" />
            <ThemeToggle />
            <Link to="/login"
              className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 hover:shadow-[0_4px_12px_rgba(66,181,225,0.4)] hover:-translate-y-0.5 active:translate-y-0"
              style={{ backgroundColor: '#1262a0' }}>
              เข้าสู่ระบบ
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              className="p-2 rounded-md text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(v => !v)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 flex flex-col gap-1">
            {[
              { label: 'หน้าแรก', href: '#top' },
              { label: 'ฟีเจอร์', href: '#features' },
              { label: 'ระบบที่เกี่ยวข้อง', href: '#links' },
              { label: 'ข่าวสาร', href: '#announcements' },
              { label: 'ตรวจสอบสถานะ IRB', href: TRACK_IRB_URL, target: '_blank' },
              { label: 'ติดต่อเรา', href: '#contact' },
            ].map(n => (
              <a key={n.label} href={n.href} target={n.target} rel={n.target ? 'noopener noreferrer' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-sm text-gray-700 dark:text-slate-300 hover:text-[#1262a0] dark:hover:text-primary-400">
                {n.label}
              </a>
            ))}
            <Link to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 py-2.5 text-center rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: '#1262a0' }}>
              เข้าสู่ระบบ
            </Link>
          </div>
        )}
      </header>

      {/* ===== Hero ===== */}
      <section id="top"
        className="relative overflow-hidden flex flex-col items-center justify-center text-center px-6 py-28 md:py-44 transition-colors"
        style={{ background: 'linear-gradient(135deg,#0d4f8c 0%,#1a7db8 50%,#42b5e1 100%)' }}
      >
        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10 bg-white pointer-events-none blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-20 w-[500px] h-[500px] rounded-full opacity-10 bg-white pointer-events-none blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full opacity-5 bg-white pointer-events-none blur-2xl animate-bounce duration-[3000ms]" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-md border border-white/25 text-white text-[11px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full mb-10 shadow-lg transition-transform hover:scale-105 duration-300">
            <span className="w-2 h-2 rounded-full bg-[#f7931e] shadow-[0_0_8px_#f7931e]" />
            Faculty of Industrial Education and Technology · KMUTT
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-6 drop-shadow-2xl">
            FIET IRIS
          </h1>
          <p className="text-white/70 text-sm md:text-lg tracking-[0.3em] uppercase mb-8 font-black">
            Integrity Research Information System
          </p>
          <p className="text-white/90 text-lg md:text-2xl max-w-3xl mx-auto leading-relaxed mb-12 font-medium">
            แพลตฟอร์มเพื่อการบริหารจัดการเอกสารงานวิจัยอย่างเป็นระบบ<br className="hidden md:block"/>
            สำหรับคณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี มจธ.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a href="#features"
              className="group inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-black text-base border-2 border-white/40 text-white hover:bg-white hover:text-[#1a7db8] transition-all duration-300 shadow-xl active:scale-95">
              เริ่มต้นใช้งาน
              <svg className="w-5 h-5 transition-transform group-hover:translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 100" fill="none" preserveAspectRatio="none" className="w-full h-12 md:h-20">
            <path d="M0 100L1440 100L1440 20C1200 80 960 0 720 20C480 40 240 0 0 20Z" className="fill-white dark:fill-slate-950 transition-colors duration-300"/>
          </svg>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="py-24 px-6 bg-white dark:bg-slate-950 transition-colors">
        <div className="max-w-6xl mx-auto">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-center mb-3"
            style={{ color: '#42b5e1' }}>ฟีเจอร์แนะนำ</p>
          <h2 className="text-3xl md:text-4xl font-black text-[#1a2d45] dark:text-slate-100 text-center mb-4 tracking-tight">
            6 ฟีเจอร์หลักที่จะช่วยยกระดับการจัดการเอกสารงานวิจัยของคุณ
          </h2>
          <p className="text-sm md:text-base text-gray-500 dark:text-slate-400 text-center max-w-2xl mx-auto mb-16 leading-relaxed font-medium">
            เร่งกระบวนการจัดการเอกสารงานวิจัยให้รวดเร็ว แม่นยำ และตรวจสอบได้ง่ายขึ้น สำหรับนักศึกษา บุคลากร คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map(f => (
              <div key={f.title}
                className="group bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-8 flex flex-col items-start hover:shadow-2xl hover:-translate-y-2 hover:border-[#42b5e1]/30 transition-all duration-500">
                <div className="mb-6 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-3 group-hover:text-[#1262a0] dark:group-hover:text-primary-400 transition-colors">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== External Links ===== */}
      <section id="links" className="py-24 px-6 bg-slate-50/50 dark:bg-slate-900/20 transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16 items-center">

          {/* Left — RI / IRB systems */}
          <div className="flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-3"
              style={{ color: '#42b5e1' }}>ระบบที่เกี่ยวข้อง</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#1a2d45] dark:text-slate-100 mb-4 leading-tight tracking-tight">
              เชื่อมต่อกลุ่มงานวิจัย<br/>และจริยธรรม มจธ.
            </h2>
            <p className="text-sm md:text-base text-gray-500 dark:text-slate-400 mb-10 leading-relaxed font-medium">
              บูรณาการร่วมกับระบบส่วนกลางเพื่อให้ข้อมูลงานวิจัยลื่นไหลและเป็นปัจจุบันที่สุด
            </p>
            <div className="flex flex-col gap-5">
              {[
                {
                  href: RI_URL,
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  ),
                  bg: '#e0f2fe',
                  color: '#0284c7',
                  title: 'ระบบ RI',
                  sub: 'Research Integrity · มจธ.',
                  desc: 'คณะทำงานจัดทำนโยบายจริยธรรมการวิจัยและส่งเสริมจริยธรรมการวิจัย มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี',
                },
                {
                  href: IRB_URL,
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H5a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  ),
                  bg: '#f0fdf4',
                  color: '#16a34a',
                  title: 'ระบบ IRB',
                  sub: 'Institutional Review Board · มจธ.',
                  desc: 'คณะกรรมการจริยธรรมการวิจัยในมนุษย์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี',
                },
              ].map(link => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                  className="group flex gap-5 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-7 hover:shadow-2xl hover:-translate-y-1 hover:border-[#42b5e1]/30 transition-all duration-300">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-300 shadow-inner"
                    style={{ background: link.bg, color: link.color }}>
                    {link.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-800 dark:text-slate-100 group-hover:text-[#1262a0] dark:group-hover:text-primary-400 transition-colors">{link.title}</p>
                    <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 mt-1 mb-2 uppercase tracking-wide">{link.sub}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed font-medium">{link.desc}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 dark:text-slate-700 group-hover:text-[#42b5e1] flex-shrink-0 mt-1 transition-colors"
                    viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Right — Faculty website */}
          <div className="flex-1 w-full flex flex-col gap-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-3"
              style={{ color: '#42b5e1' }}>เว็บไซต์คณะ</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#1a2d45] dark:text-slate-100 mb-4 leading-tight tracking-tight">
              คณะครุศาสตร์อุตสาหกรรม<br/>และเทคโนโลยี มจธ.
            </h2>
            <p className="text-sm md:text-base text-gray-500 dark:text-slate-400 mb-10 leading-relaxed font-medium">
              ศูนย์รวมนวัตกรรมการศึกษาและเทคโนโลยี เพื่อสร้างบัณฑิตคุณภาพสู่สังคม
            </p>
            <a href={FIET_URL} target="_blank" rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-3xl border border-gray-100 dark:border-slate-800 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
              style={{ backgroundColor: '#0d4f8c' }}>
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none transition-transform group-hover:scale-150 duration-700" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none transition-transform group-hover:scale-150 duration-700" />

              <div className="relative z-10 p-10">
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white mb-6 transition-transform group-hover:scale-110 group-hover:-rotate-3 duration-500 shadow-lg">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                </div>
                <p className="text-2xl font-black text-white mb-1 tracking-tight">FIET KMUTT</p>
                <p className="text-sm text-white/70 mb-5 font-bold uppercase tracking-widest">Faculty of Industrial Education and Technology</p>
                <p className="text-base text-white/80 leading-relaxed mb-8 font-medium">
                  สร้างวัฒนธรรมการเรียนรู้ตลอดชีวิต มีกระบวนการคิดแบบผู้ประกอบการ
                  สร้างผู้นำด้านนวัตกรรม วิชาการ งานวิจัย และมีคุณธรรม <br/>
                  สร้างองค์กรใฝ่การเรียนรู้ สู่ความยั่งยืน
                </p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-base font-black transition-all group-hover:shadow-xl group-hover:-translate-y-0.5 active:translate-y-0 shadow-lg"
                  style={{ color: '#1262a0' }}>
                  ไปยังเว็บไซต์คณะ
                  <svg className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </span>
              </div>
            </a>
          </div>

        </div>
      </section>

      {/* ===== Announcements ===== */}
      <section id="announcements" className="py-24 px-6 bg-slate-50 dark:bg-slate-900/40 transition-colors">
        <div className="max-w-6xl mx-auto">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-center mb-3"
            style={{ color: '#42b5e1' }}>ข่าวสาร</p>
          <h2 className="text-3xl md:text-4xl font-black text-[#1a2d45] dark:text-slate-100 text-center mb-4 tracking-tight">
            ติดตามข่าวสารและประกาศ
          </h2>
          <p className="text-sm md:text-base text-gray-500 dark:text-slate-400 text-center max-w-2xl mx-auto mb-16 leading-relaxed font-medium">
            ไม่พลาดทุกความเคลื่อนไหวและกิจกรรม จากทางคณะ
          </p>

          {loadingAnn ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-[#42b5e1] border-t-transparent rounded-full animate-spin"/>
              <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest">กำลังโหลดข้อมูล...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[40px] border border-gray-100 dark:border-slate-800 shadow-sm">
              <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-400 dark:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-base font-bold">ยังไม่มีประกาศในขณะนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {announcements.map(item => (
                <div
                  key={item.announcement_id}
                  className="group bg-white dark:bg-slate-900 rounded-[32px] border border-gray-100 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1.5 hover:border-[#42b5e1]/30 transition-all duration-500 flex flex-col md:flex-row"
                  onClick={() => setSelected(item)}
                >
                  {item.image_url && (
                    <div className="md:w-48 lg:w-56 shrink-0 h-48 md:h-auto overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>
                  )}
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-white px-3 py-1 rounded-full uppercase tracking-[0.15em]" style={{ background: '#42b5e1' }}>Update</span>
                        <span className="text-[11px] text-gray-400 dark:text-slate-500 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(item.created_at).toLocaleDateString('th-TH', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 group-hover:text-[#1262a0] dark:group-hover:text-primary-400 transition-colors line-clamp-1 mb-3">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium mb-6">
                        {item.content}
                      </p>
                    </div>
                    <div className="flex items-center justify-end">
                      <span className="text-sm font-black flex items-center gap-2 transition-all group-hover:gap-3"
                        style={{ color: '#42b5e1' }}>
                        อ่านเพิ่มเติม
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer id="contact" className="bg-[#0f1e2e] dark:bg-slate-950 text-white pt-20 pb-10 px-6 transition-colors border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <img src={kmuttLogo} alt="KMUTT" className="h-12 w-auto object-contain brightness-0 invert opacity-90" />
                <img src={fietLogo} alt="FIET" className="h-14 w-auto object-contain brightness-0 invert opacity-90" />
                <img src={irisLogo} alt="IRIS" className="h-10 w-auto object-contain brightness-0 invert opacity-90" />
              </div>
              <div>
                <p className="text-lg font-black tracking-tight text-white mb-1">FIET IRIS</p>
                <p className="text-xs text-white/50 leading-relaxed font-medium">
                  Integrity Research Information System<br/>
                  คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี<br/>
                  มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี
                </p>
              </div>
            </div>
            {/* Nav */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">เมนูหลัก</p>
              <ul className="space-y-3">
                {[
                  { label: 'หน้าแรก', href: '#top' },
                  { label: 'ฟีเจอร์', href: '#features' },
                  { label: 'ระบบที่เกี่ยวข้อง', href: '#links' },
                  { label: 'ประกาศ / ข่าวสาร', href: '#announcements' },
                  { label: 'ตรวจสอบสถานะ IRB', href: TRACK_IRB_URL, target: '_blank' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-sm font-bold text-white/60 hover:text-primary-400 transition-colors flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-primary-400 transition-colors" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            {/* External */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">ระบบที่เกี่ยวข้อง</p>
              <ul className="space-y-4">
                <li>
                  <a href={RI_URL} target="_blank" rel="noopener noreferrer"
                    className="group bg-white/5 hover:bg-white/10 p-3 rounded-2xl transition-all flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold group-hover:text-primary-400 transition-colors">ระบบ RI</p>
                      <p className="text-[10px] text-white/40 font-medium">Research Integrity</p>
                    </div>
                  </a>
                </li>
                <li>
                  <a href={IRB_URL} target="_blank" rel="noopener noreferrer"
                    className="group bg-white/5 hover:bg-white/10 p-3 rounded-2xl transition-all flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H5a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold group-hover:text-emerald-400 transition-colors">ระบบ IRB</p>
                      <p className="text-[10px] text-white/40 font-medium">Institutional Review Board</p>
                    </div>
                  </a>
                </li>
              </ul>
            </div>
            {/* Contact */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">ติดต่อเรา</p>
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 112.828-2.828l4.243 4.242z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed font-medium">
                    สำนักงานคณบดี คณะครุศาสตร์อุตสาหกรรมฯ<br/>อาคารเรียนรวม 3 (S13) ชั้น 2 มจธ.
                  </p>
                </div>
                <a href="mailto:irb.fiet@kmutt.ac.th" className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-primary-500/20 flex items-center justify-center text-white/40 group-hover:text-primary-400 shrink-0 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold transition-colors group-hover:text-primary-400" style={{ color: '#42b5e1' }}>irb.fiet@kmutt.ac.th</p>
                </a>
              </div>
              <div className="flex gap-3 mt-8">
                {[
                  { href: "https://www.facebook.com/fiet.kmutt", color: "#1877f2", icon: "M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.031 4.437 11.028 10.125 11.927v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796v8.437C19.563 23.101 24 18.104 24 12.073z" },
                  { href: "https://www.youtube.com/@FIETkmutt", color: "#ff0000", icon: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
                  { href: "https://line.me/R/ti/p/@413kjbml", color: "#06c755", icon: "M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" }
                ].map(social => (
                  <a key={social.href} href={social.href} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-2xl flex items-center justify-center hover:opacity-80 transition-all hover:-translate-y-1 shadow-lg"
                    style={{ background: social.color }}>
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d={social.icon}/>
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-center sm:text-left">
              © {new Date().getFullYear()} Faculty of Industrial Education and Technology, KMUTT. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

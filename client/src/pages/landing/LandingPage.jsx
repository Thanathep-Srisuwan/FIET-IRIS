import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { 
  MapPin, Mail, Phone, Bell, ShieldCheck, BarChart3, 
  Users, Search, Link as LinkIcon, Zap, X, ExternalLink,
  Info, ChevronDown, ArrowRight, Menu,
  Calendar, Globe
} from 'lucide-react'
import { FaFacebookF, FaYoutube, FaLine } from 'react-icons/fa6'
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
        className="text-blue-700 dark:text-sky-300 underline break-all hover:text-blue-900 dark:hover:text-sky-200">
        {part}
      </a>
    ) : part
  )
}

function AnnouncementModal({ item, onClose }) {
  useEffect(() => {
    if (!item) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [item, onClose])

  if (!item) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-transparent dark:border-slate-700"
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-modal-title"
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-sky-500/15 flex items-center justify-center text-blue-600 dark:text-sky-300 flex-shrink-0">
              <Bell size={24} strokeWidth={2} />
            </div>
            <div>
              <h2 id="announcement-modal-title" className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug">{item.title}</h2>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-300 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                <Info size={14} strokeWidth={2.5} />
                {new Date(item.created_at).toLocaleString('th-TH', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิดหน้าต่างประกาศ"
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto flex-1 custom-scrollbar">
          {item.image_url && (
            <div className="relative w-full h-auto min-h-[200px] bg-slate-100 dark:bg-slate-800 overflow-hidden mb-6 shadow-md border border-slate-100 dark:border-slate-800">
              <div className="absolute inset-0 opacity-20 blur-3xl scale-150">
                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
              </div>
              <img
                src={item.image_url}
                alt={item.title}
                className="relative z-10 w-full h-auto max-h-[800px] object-contain mx-auto shadow-sm"
              />
            </div>
          )}
          <div className="text-[15px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-body">
            {renderWithLinks(item.content)}
          </div>
        </div>
        {item.link_url && (
          <div className="px-6 pb-4 pt-2">
            <a href={item.link_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-[15px] font-bold text-white transition-all hover:opacity-90 shadow-lg hover:shadow-xl active:scale-[0.98]"
              style={{ backgroundColor: '#1262a0' }}>
              <ExternalLink size={20} strokeWidth={2} className="mr-2" />
              ดูรายละเอียดเพิ่มเติม
            </a>
          </div>
        )}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button type="button" onClick={onClose}
            className="text-sm font-bold px-6 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

const FEATURES = [
  {
    icon: <ShieldCheck size={40} className="text-blue-600" />,
    title: 'จัดการเอกสารวิจัย',
    desc: 'อัปโหลด จัดเก็บ และติดตามสถานะเอกสารงานวิจัยอย่างเป็นระบบตลอดทุกขั้นตอน',
  },
  {
    icon: <Bell size={40} className="text-amber-600" />,
    title: 'แจ้งเตือนอัตโนมัติ',
    desc: 'รับการแจ้งเตือนเมื่อเอกสารใกล้หมดอายุ หมดอายุ หรือมีการเปลี่ยนแปลงที่สำคัญ',
  },
  {
    icon: <BarChart3 size={40} className="text-emerald-600" />,
    title: 'รายงานภาพรวม',
    desc: 'ผู้บริหารดูสถิติและสถานะงานวิจัยของทุกหลักสูตรได้ในที่เดียว พร้อม dashboard แบบ real-time',
  },
  {
    icon: <Users size={40} className="text-purple-600" />,
    title: 'จัดการผู้ใช้งาน',
    desc: 'กำหนดสิทธิ์การเข้าถึงตามบทบาท ไม่ว่าจะเป็นนักวิจัย อาจารย์ หรือผู้บริหารคณะ',
  },
  {
    icon: <Search size={40} className="text-pink-600" />,
    title: 'ค้นหาและกรองข้อมูล',
    desc: 'ค้นหาเอกสารและข้อมูลวิจัยได้อย่างรวดเร็ว กรองตามปีการศึกษา สถานะ หรือหลักสูตร',
  },
  {
    icon: <LinkIcon size={40} className="text-cyan-600" />,
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
  }, [navigate, token])

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
          <Zap size={14} className="flex-shrink-0 animate-pulse" />
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
              <p className="text-[11px] text-[#5f7892] dark:text-slate-300 mt-0.5 leading-tight font-medium">Faculty of Industrial Education and Technology</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {[
              { label: 'หน้าแรก', href: '#top' },
              { label: 'ฟีเจอร์', href: '#features' },
              { label: 'ระบบที่เกี่ยวข้อง', href: '#links' },
              { label: 'ข่าวสาร', href: '#announcements' },
              { label: 'ตรวจสอบสถานะ IRB', href: TRACK_IRB_URL, target: '_blank' },
              { label: 'ติดต่อเรา', href: '#contact' },
            ].map(n => (
              <a key={n.label} href={n.href} target={n.target} rel={n.target ? 'noopener noreferrer' : undefined}
                className="px-3 py-1.5 text-sm font-bold text-gray-700 dark:text-slate-200 hover:text-[#1262a0] dark:hover:text-sky-300 rounded-md hover:bg-blue-50 dark:hover:bg-primary-900/20 transition-all duration-200">
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

          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="p-2 rounded-md text-gray-600 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label={mobileMenuOpen ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก'}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div id="landing-mobile-menu" className="lg:hidden border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 flex flex-col gap-1">
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
                className="py-2 text-sm text-gray-700 dark:text-slate-100 hover:text-[#1262a0] dark:hover:text-sky-300">
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

      <section id="top"
        className="relative overflow-hidden flex flex-col items-center justify-center text-center px-6 py-28 md:py-44 transition-colors"
        style={{ background: 'linear-gradient(135deg,#0d4f8c 0%,#1a7db8 50%,#42b5e1 100%)' }}
      >
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
          <p className="text-white/85 text-sm md:text-lg tracking-[0.3em] uppercase mb-8 font-black">
            Integrity Research Information System
          </p>
          <p className="text-white/95 text-lg md:text-2xl max-w-3xl mx-auto leading-relaxed mb-12 font-medium">
            แพลตฟอร์มเพื่อการบริหารจัดการเอกสารงานวิจัยอย่างเป็นระบบ<br className="hidden md:block"/>
            สำหรับคณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี มจธ.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a href="#features"
              className="group inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-black text-base border-2 border-white/40 text-white hover:bg-white hover:text-[#1a7db8] transition-all duration-300 shadow-xl active:scale-95">
              เริ่มต้นใช้งาน
              <ChevronDown size={20} className="transition-transform group-hover:translate-y-1" />
            </a>
          </div>
        </div>

        <div className="absolute -bottom-10 left-1/2 h-20 w-[120vw] -translate-x-1/2 rounded-t-[50%] bg-white transition-colors duration-300 dark:bg-slate-950 md:-bottom-14 md:h-28" />
      </section>

      <section id="features" className="py-24 px-6 bg-white dark:bg-slate-950 transition-colors">
        <div className="max-w-6xl mx-auto">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-center mb-3"
            style={{ color: '#42b5e1' }}>ฟีเจอร์แนะนำ</p>
          <h2 className="text-3xl md:text-4xl font-black text-[#1a2d45] dark:text-slate-100 text-center mb-4 tracking-tight">
            6 ฟีเจอร์หลักที่จะช่วยยกระดับการจัดการเอกสารงานวิจัยของคุณ
          </h2>
          <p className="text-sm md:text-base text-gray-600 dark:text-slate-300 text-center max-w-2xl mx-auto mb-16 leading-relaxed font-medium">
            เร่งกระบวนการจัดการเอกสารงานวิจัยให้รวดเร็ว แม่นยำ และตรวจสอบได้ง่ายขึ้น สำหรับนักศึกษา บุคลากร คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map(f => (
              <div key={f.title}
                className="group bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-8 flex flex-col items-start hover:shadow-2xl hover:-translate-y-2 hover:border-[#42b5e1]/30 transition-all duration-500">
                <div className="mb-6 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-3 group-hover:text-[#1262a0] dark:group-hover:text-primary-400 transition-colors">{f.title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="links" className="py-24 px-6 bg-slate-50/50 dark:bg-slate-900/20 transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
          <div className="flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-3"
              style={{ color: '#42b5e1' }}>ระบบที่เกี่ยวข้อง</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#1a2d45] dark:text-slate-100 mb-4 leading-tight tracking-tight">
              เชื่อมต่อกลุ่มงานวิจัย<br/>และจริยธรรม มจธ.
            </h2>
            <p className="text-sm md:text-base text-gray-600 dark:text-slate-300 mb-10 leading-relaxed font-medium">
              บูรณาการร่วมกับระบบส่วนกลางเพื่อให้ข้อมูลงานวิจัยลื่นไหลและเป็นปัจจุบันที่สุด
            </p>
            <div className="flex flex-col gap-5">
              {[
                {
                  href: RI_URL,
                  icon: <Search size={32} />,
                  bg: '#e0f2fe',
                  color: '#0284c7',
                  title: 'ระบบ RI',
                  sub: 'Research Integrity · มจธ.',
                  desc: 'คณะทำงานจัดทำนโยบายจริยธรรมการวิจัยและส่งเสริมจริยธรรมการวิจัย มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี',
                },
                {
                  href: IRB_URL,
                  icon: <ShieldCheck size={32} />,
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
                    <p className="text-[11px] font-bold text-gray-500 dark:text-slate-300 mt-1 mb-2 uppercase tracking-wide">{link.sub}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed font-medium">{link.desc}</p>
                  </div>
                  <ArrowRight size={20} className="text-gray-400 dark:text-slate-400 group-hover:text-[#42b5e1] flex-shrink-0 mt-1 transition-colors" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full flex flex-col gap-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-3"
              style={{ color: '#42b5e1' }}>เว็บไซต์คณะ</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#1a2d45] dark:text-slate-100 mb-4 leading-tight tracking-tight">
              คณะครุศาสตร์อุตสาหกรรม<br/>และเทคโนโลยี มจธ.
            </h2>
            <p className="text-sm md:text-base text-gray-600 dark:text-slate-300 mb-10 leading-relaxed font-medium">
              ศูนย์รวมนวัตกรรมการศึกษาและเทคโนโลยี เพื่อสร้างบัณฑิตคุณภาพสู่สังคม
            </p>
            <a href={FIET_URL} target="_blank" rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-3xl border border-gray-100 dark:border-slate-800 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
              style={{ backgroundColor: '#0d4f8c' }}>
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none transition-transform group-hover:scale-150 duration-700" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none transition-transform group-hover:scale-150 duration-700" />

              <div className="relative z-10 p-10">
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white mb-6 transition-transform group-hover:scale-110 group-hover:-rotate-3 duration-500 shadow-lg">
                  <Globe size={40} />
                </div>
                <p className="text-2xl font-black text-white mb-1 tracking-tight">FIET KMUTT</p>
                <p className="text-sm text-white/85 mb-5 font-bold uppercase tracking-widest">Faculty of Industrial Education and Technology</p>
                <p className="text-base text-white/90 leading-relaxed mb-8 font-medium">
                  สร้างวัฒนธรรมการเรียนรู้ตลอดชีวิต มีกระบวนการคิดแบบผู้ประกอบการ
                  สร้างผู้นำด้านนวัตกรรม วิชาการ งานวิจัย และมีคุณธรรม <br/>
                  สร้างองค์กรใฝ่การเรียนรู้ สู่ความยั่งยืน
                </p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-base font-black transition-all group-hover:shadow-xl group-hover:-translate-y-0.5 active:translate-y-0 shadow-lg"
                  style={{ color: '#1262a0' }}>
                  ไปยังเว็บไซต์คณะ
                  <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <section id="announcements" className="py-24 px-6 bg-slate-50 dark:bg-slate-900/40 transition-colors">
        <div className="max-w-6xl mx-auto">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-center mb-3"
            style={{ color: '#42b5e1' }}>ข่าวสาร</p>
          <h2 className="text-3xl md:text-4xl font-black text-[#1a2d45] dark:text-slate-100 text-center mb-4 tracking-tight">
            ติดตามข่าวสารและประกาศ
          </h2>
          <p className="text-sm md:text-base text-gray-600 dark:text-slate-300 text-center max-w-2xl mx-auto mb-16 leading-relaxed font-medium">
            ไม่พลาดทุกความเคลื่อนไหวและกิจกรรม จากทางคณะ
          </p>

          {loadingAnn ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-[#42b5e1] border-t-transparent rounded-full animate-spin"/>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-300 animate-pulse uppercase tracking-widest">กำลังโหลดข้อมูล...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[40px] border border-gray-100 dark:border-slate-800 shadow-sm">
              <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-6">
                <Bell size={40} className="text-blue-400 dark:text-blue-500" />
              </div>
              <p className="text-slate-500 dark:text-slate-300 text-base font-bold">ยังไม่มีประกาศในขณะนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {announcements.map(item => (
                <div
                  key={item.announcement_id}
                  className="group bg-white dark:bg-slate-900 rounded-[32px] border border-gray-100 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1.5 hover:border-[#42b5e1]/30 transition-all duration-500 flex flex-col md:flex-row"
                  onClick={() => setSelected(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelected(item)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`อ่านประกาศ ${item.title}`}
                >
                  {item.image_url && (
                    <div className="relative md:w-56 lg:w-64 shrink-0 h-52 md:h-auto overflow-hidden bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center border-r border-gray-50 dark:border-slate-800 group/thumb">
                      <div className="absolute inset-0 opacity-15 blur-2xl scale-150 transition-transform duration-700 group-hover/thumb:scale-[1.8]">
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="relative z-10 w-full h-full object-contain p-2 transition-transform duration-700 group-hover/thumb:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-white px-3 py-1 rounded-full uppercase tracking-[0.15em]" style={{ background: '#42b5e1' }}>Update</span>
                        <span className="text-[11px] text-gray-500 dark:text-slate-300 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                          <Calendar size={14} />
                          {new Date(item.created_at).toLocaleDateString('th-TH', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 group-hover:text-[#1262a0] dark:group-hover:text-primary-400 transition-colors line-clamp-1 mb-3">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium mb-6">
                        {item.content}
                      </p>
                    </div>
                    <div className="flex items-center justify-end">
                      <span className="text-sm font-black flex items-center gap-2 transition-all group-hover:gap-3"
                        style={{ color: '#42b5e1' }}>
                        อ่านเพิ่มเติม
                        <ArrowRight size={16} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer id="contact" className="bg-[#0f1e2e] dark:bg-slate-950 text-white pt-20 pb-10 px-6 transition-colors border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-4 flex-wrap">
                <img src={kmuttLogo} alt="KMUTT" className="h-14 w-auto object-contain brightness-0 invert opacity-60 hover:opacity-100 transition-opacity" />
                <img src={fietLogo} alt="FIET" className="h-14 w-auto object-contain brightness-0 invert opacity-60 hover:opacity-100 transition-opacity" />
                <img src={irisLogo} alt="IRIS" className="h-10 w-auto object-contain brightness-0 invert opacity-60 hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-lg font-black tracking-tight text-white mb-1">FIET IRIS</p>
                <p className="text-xs text-white/75 leading-relaxed font-medium">
                  Integrity Research Information System<br/>
                  คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี<br/>
                  มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี
                </p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/55 mb-6">เมนูหลัก</p>
              <ul className="space-y-3">
                {[
                  { label: 'หน้าแรก', href: '#top' },
                  { label: 'ฟีเจอร์', href: '#features' },
                  { label: 'ระบบที่เกี่ยวข้อง', href: '#links' },
                  { label: 'ประกาศ / ข่าวสาร', href: '#announcements' },
                  { label: 'ตรวจสอบสถานะ IRB', href: TRACK_IRB_URL, target: '_blank' },
                ].map(({ label, href, target }) => (
                  <li key={label}>
                    <a href={href} target={target} rel={target ? 'noopener noreferrer' : undefined}
                      className="text-sm font-bold text-white/75 hover:text-sky-300 transition-colors flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-sky-300 transition-colors" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/55 mb-6">ระบบที่เกี่ยวข้อง</p>
              <ul className="space-y-4">
                <li>
                  <a href={RI_URL} target="_blank" rel="noopener noreferrer"
                    className="group bg-white/5 hover:bg-white/10 p-3 rounded-2xl transition-all flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                      <Search size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold group-hover:text-primary-400 transition-colors">ระบบ RI</p>
                      <p className="text-[10px] text-white/65 font-medium">Research Integrity</p>
                    </div>
                  </a>
                </li>
                <li>
                  <a href={IRB_URL} target="_blank" rel="noopener noreferrer"
                    className="group bg-white/5 hover:bg-white/10 p-3 rounded-2xl transition-all flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold group-hover:text-emerald-400 transition-colors">ระบบ IRB</p>
                      <p className="text-[10px] text-white/65 font-medium">Institutional Review Board</p>
                    </div>
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/55 mb-6">ติดต่อเรา</p>
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400 shrink-0 shadow-[0_0_15px_rgba(66,181,225,0.1)]">
                    <MapPin size={20} strokeWidth={1.8} />
                  </div>
                  <p className="text-xs text-white/75 leading-relaxed font-medium">
                    สำนักงานคณบดี คณะครุศาสตร์อุตสาหกรรมฯ<br/>อาคารเรียนรวม 3 (S13) ชั้น 2 มจธ.
                  </p>
                </div>
                <a href="mailto:irb.fiet@kmutt.ac.th" className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 group-hover:bg-primary-500/25 flex items-center justify-center text-primary-400 group-hover:text-primary-300 shrink-0 transition-all shadow-[0_0_15px_rgba(66,181,225,0.1)]">
                    <Mail size={20} strokeWidth={1.8} />
                  </div>
                  <p className="text-xs font-bold transition-colors group-hover:text-primary-400" style={{ color: '#42b5e1' }}>irb.fiet@kmutt.ac.th</p>
                </a>
                <a href="tel:024709500" className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 group-hover:bg-primary-500/25 flex items-center justify-center text-primary-400 group-hover:text-primary-300 shrink-0 transition-all shadow-[0_0_15px_rgba(66,181,225,0.1)]">
                    <Phone size={20} strokeWidth={1.8} />
                  </div>
                  <p className="text-xs font-bold transition-colors group-hover:text-primary-400" style={{ color: '#42b5e1' }}>02-470-8500</p>
                </a>
              </div>
              <div className="flex gap-3 mt-8">
                <a href="https://www.facebook.com/fiet.kmutt" target="_blank" rel="noopener noreferrer"
                  aria-label="Facebook FIET KMUTT"
                  className="w-10 h-10 rounded-2xl flex items-center justify-center hover:opacity-80 transition-all hover:-translate-y-1 shadow-lg bg-[#1877f2]">
                  <FaFacebookF size={18} />
                </a>
                <a href="https://www.youtube.com/@FIETkmutt" target="_blank" rel="noopener noreferrer"
                  aria-label="YouTube FIET KMUTT"
                  className="w-10 h-10 rounded-2xl flex items-center justify-center hover:opacity-80 transition-all hover:-translate-y-1 shadow-lg bg-[#ff0000]">
                  <FaYoutube size={20} />
                </a>
                <a href="https://line.me/R/ti/p/@413kjbml" target="_blank" rel="noopener noreferrer"
                  aria-label="LINE FIET KMUTT"
                  className="w-10 h-10 rounded-2xl flex items-center justify-center hover:opacity-80 transition-all hover:-translate-y-1 shadow-lg bg-[#06c755]">
                  <FaLine size={20} />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45 text-center sm:text-left">
              © {new Date().getFullYear()} Faculty of Industrial Education and Technology, KMUTT. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

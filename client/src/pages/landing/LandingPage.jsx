import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { announcementService } from '../../services/api'

import fietLogo  from '../../assets/fiet-logo.png'
import kmuttLogo from '../../assets/kmutt-logo.png'

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex gap-3 items-start">
            <span className="text-2xl flex-shrink-0">📢</span>
            <div>
              <h2 className="text-base font-semibold text-slate-800">{item.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(item.created_at).toLocaleString('th-TH', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0 ml-3 text-lg leading-none">
            ✕
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-auto rounded-xl mb-4"
            />
          )}
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {renderWithLinks(item.content)}
          </p>
        </div>
        {item.link_url && (
          <div className="px-6 pt-2 pb-1">
            <a href={item.link_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#42b5e1' }}>
              🔗 ดูลิ้งค์เพิ่มเติม
            </a>
          </div>
        )}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <button onClick={onClose}
            className="text-sm px-5 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: '#42b5e1' }}>
            ปิด
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
        <path d="M14 16h20M14 22h14M14 28h10" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M30 28l4 4m0 0l4-4m-4 4V20" stroke="#42b5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'จัดการเอกสารวิจัย',
    desc: 'อัปโหลด จัดเก็บ และติดตามสถานะเอกสารงานวิจัยอย่างเป็นระบบตลอดทุกขั้นตอน',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect width="48" height="48" rx="12" fill="#fef3c7"/>
        <path d="M24 12v4M24 32v4M12 24h4m16 0h4" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="24" cy="24" r="6" stroke="#f59e0b" strokeWidth="2.5"/>
        <path d="M16.9 16.9l2.8 2.8M28.3 28.3l2.8 2.8M16.9 31.1l2.8-2.8M28.3 19.7l2.8-2.8" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
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
        <path d="M14 24h20M14 18h12M14 30h16" stroke="#db2777" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="35" cy="18" r="4" fill="#fbcfe8" stroke="#db2777" strokeWidth="2"/>
        <path d="M33.5 18h1.5l1 1" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'ค้นหาและกรองข้อมูล',
    desc: 'ค้นหาเอกสารและข้อมูลวิจัยได้อย่างรวดเร็ว กรองตามปีการศึกษา สถานะ หรือสาขาวิชา',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect width="48" height="48" rx="12" fill="#cffafe"/>
        <path d="M24 13v6m0 10v6M13 24h6m10 0h6" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="24" cy="24" r="4" stroke="#06b6d4" strokeWidth="2.5"/>
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
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <AnnouncementModal item={selected} onClose={() => setSelected(null)} />

      {/* ===== Top announcement banner ===== */}
      {!loadingAnn && announcements.length > 0 && (
        <div className="w-full py-2 px-4 text-center text-xs text-white font-medium"
          style={{ background: 'linear-gradient(90deg,#1262a0,#42b5e1)' }}>
          📢&nbsp;
          <span
            className="cursor-pointer underline underline-offset-2 hover:opacity-80"
            onClick={() => setSelected(announcements[0])}
          >
            {announcements[0].title}
          </span>
          &nbsp;— คลิกเพื่ออ่านเพิ่มเติม
        </div>
      )}

      {/* ===== Navbar ===== */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-6 h-[64px] flex items-center justify-between">
          {/* Logo group */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <img src={kmuttLogo} alt="KMUTT" className="w-full h-full object-contain" />
            </div>
            <div className="w-px h-8 bg-[#dde5ee]" />
            <div className="w-12 h-14 rounded-lg overflow-hidden flex-shrink-0">
              <img src={fietLogo} alt="FIET" className="w-full h-full object-contain" />
            </div>
            <div className="w-px h-8 bg-[#dde5ee] hidden md:block" />
            <div className="hidden md:block">
              <p className="text-[15px] font-medium text-[#1a2d45] tracking-wide leading-tight">Integrity Research Information System</p>
              <p className="text-[11px] text-[#7a96b0] mt-0.5 leading-tight">Faculty of Industrial Education and Technology</p>
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
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-[#1262a0] rounded-md hover:bg-blue-50 transition-colors">
                {n.label}
              </a>
            ))}
            <div className="w-px h-5 bg-gray-200 mx-2" />
            <Link to="/login"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
              style={{ background: 'linear-gradient(135deg,#42b5e1,#1262a0)' }}>
              เข้าสู่ระบบ
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(v => !v)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>}
            </svg>
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-3 flex flex-col gap-1">
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
                className="py-2 text-sm text-gray-700 hover:text-[#1262a0]">
                {n.label}
              </a>
            ))}
            <Link to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 py-2.5 text-center rounded-lg text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#42b5e1,#1262a0)' }}>
              เข้าสู่ระบบ
            </Link>
          </div>
        )}
      </header>

      {/* ===== Hero ===== */}
      <section id="top"
        className="relative overflow-hidden flex flex-col items-center justify-center text-center px-6 py-24 md:py-36"
        style={{ background: 'linear-gradient(135deg,#0d4f8c 0%,#1a7db8 50%,#42b5e1 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10 bg-white pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full opacity-10 bg-white pointer-events-none" />
        <div className="absolute top-10 left-10 w-20 h-20 rounded-full opacity-5 bg-white pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f7931e]" />
            คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี · มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี
          </span>

          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
            FIET-IRIS
          </h1>
          <p className="text-white/80 text-sm md:text-base tracking-[0.2em] uppercase mb-6 font-medium">
            Integrity Research Information System
          </p>
          <p className="text-white/85 text-base md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            ระบบบริหารจัดการเอกสารและข้อมูลงานวิจัยแบบครบวงจร<br className="hidden md:block"/>
            สำหรับนักศึกษา นักวิจัย อาจารย์ และผู้บริหารคณะ
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#features"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm border-2 border-white/40 text-white hover:bg-white/10 transition-all">
              ฟีเจอร์แนะนำ
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" className="w-full h-10 md:h-14">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-center mb-2"
            style={{ color: '#42b5e1' }}>ฟีเจอร์แนะนำ</p>
          <h2 className="text-2xl md:text-3xl font-black text-[#1a2d45] text-center mb-3">
            ระบบครอบคลุมทุกขั้นตอน
          </h2>
          <p className="text-sm text-gray-500 text-center max-w-xl mx-auto mb-12 leading-relaxed">
            ออกแบบมาเพื่อรองรับการทำงานของนักวิจัยและผู้บริหารคณะครุศาสตร์อุตสาหกรรมฯ โดยเฉพาะ
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title}
                className="group bg-white rounded-2xl border border-gray-100 p-7 flex flex-col items-start hover:shadow-xl hover:-translate-y-1 hover:border-[#42b5e1]/30 transition-all duration-300">
                <div className="mb-4">{f.icon}</div>
                <h3 className="text-sm font-bold text-gray-800 mb-2 group-hover:text-[#1262a0] transition-colors">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== About section (alternating) ===== */}
      <section className="py-20 px-6 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          {/* Visual */}
          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-sm">
              <div className="w-full aspect-square rounded-3xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#e0f2fe,#bfdbfe)' }}>
                <svg viewBox="0 0 200 200" className="w-3/4 h-3/4" fill="none">
                  <rect x="20" y="30" width="160" height="140" rx="12" fill="white" stroke="#93c5fd" strokeWidth="2"/>
                  <rect x="36" y="52" width="80" height="8" rx="4" fill="#bfdbfe"/>
                  <rect x="36" y="68" width="60" height="8" rx="4" fill="#dbeafe"/>
                  <rect x="36" y="84" width="100" height="8" rx="4" fill="#dbeafe"/>
                  <rect x="36" y="106" width="128" height="44" rx="8" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.5"/>
                  <rect x="48" y="116" width="50" height="6" rx="3" fill="#93c5fd"/>
                  <rect x="48" y="128" width="72" height="6" rx="3" fill="#dbeafe"/>
                  <circle cx="148" cy="128" r="16" fill="#1262a0"/>
                  <path d="M141 128l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-lg px-4 py-3 border border-gray-100">
                <p className="text-xs font-semibold text-[#1262a0]">สถานะเอกสาร</p>
                <p className="text-[10px] text-gray-400 mt-0.5">อัปเดตแบบ Real-time</p>
              </div>
            </div>
          </div>
          {/* Text */}
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#42b5e1' }}>
              เกี่ยวกับระบบ
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-[#1a2d45] mb-5 leading-tight">
              ติดตามงานวิจัยได้<br/>ทุกที่ ทุกเวลา
            </h2>
            <div className="space-y-3">
              {[
                'ติดตามสถานะเอกสารของคุณแบบ real-time',
                'รับแจ้งเตือนก่อนเอกสารหมดอายุ',
                'ดาวน์โหลดรายงานภาพรวมได้ทันที',
                'รองรับการทำงานทุกขนาดหน้าจอ',
              ].map(item => (
                <div key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: 'linear-gradient(135deg,#42b5e1,#1262a0)' }}>
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== External Links ===== */}
      <section id="links" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-start">

          {/* Left — RI / IRB systems */}
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: '#42b5e1' }}>ระบบที่เกี่ยวข้อง</p>
            <h2 className="text-2xl md:text-3xl font-black text-[#1a2d45] mb-3 leading-snug">
              กลุ่มงานจริยธรรมวิจัยและ<br/>ธรรมาภิบาลวิจัย<br/>สำนักงานวิจัย นวัตกรรมและพันธมิตร มจธ.
            </h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              เชื่อมต่อกับระบบอื่น ๆ ของมหาวิทยาลัยที่เกี่ยวข้องกับงานวิจัยและจริยธรรม
            </p>
            <div className="flex flex-col gap-4">
              {[
                {
                  href: RI_URL,
                  emoji: '🔬',
                  bg: '#e0f2fe',
                  title: 'ระบบ RI',
                  sub: 'Research Integrity · มจธ.',
                  desc: 'คณะทำงานจัดทำนโยบายจริยธรรมการวิจัยและส่งเสริมจริยธรรมการวิจัย',
                },
                {
                  href: IRB_URL,
                  emoji: '🏥',
                  bg: '#f0fdf4',
                  title: 'ระบบ IRB',
                  sub: 'Institutional Review Board · มจธ.',
                  desc: 'คณะกรรมการจริยธรรมการวิจัยในมนุษย์',
                },
              ].map(link => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                  className="group flex gap-5 bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 hover:border-[#42b5e1]/30 transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: link.bg }}>
                    {link.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 group-hover:text-[#1262a0] transition-colors">{link.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 mb-2">{link.sub}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{link.desc}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-[#42b5e1] flex-shrink-0 mt-1 transition-colors"
                    viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Right — Faculty website */}
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: '#42b5e1' }}>เว็บไซต์คณะ</p>
            <h2 className="text-2xl md:text-3xl font-black text-[#1a2d45] mb-3 leading-snug">
              คณะครุศาสตร์อุตสาหกรรม<br/>และเทคโนโลยี มจธ.
            </h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              ข้อมูลคณะ หลักสูตร และกิจกรรมต่าง ๆ ของคณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี
            </p>
            <a href={FIET_URL} target="_blank" rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              style={{ background: 'linear-gradient(135deg,#0d4f8c 0%,#1a7db8 60%,#42b5e1 100%)' }}>
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

              <div className="relative z-10 p-8">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-3xl mb-5">
                  🎓
                </div>
                <p className="text-lg font-black text-white mb-1">FIET · มจธ.</p>
                <p className="text-xs text-white/70 mb-4">Faculty of Industrial Education and Technology</p>
                <p className="text-sm text-white/80 leading-relaxed mb-6">
                  ศูนย์กลางข้อมูลคณะ ครอบคลุมหลักสูตร บุคลากร งานวิจัย และข่าวสารกิจกรรมทั้งหมด
                </p>
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-sm font-bold transition-all group-hover:shadow-lg"
                  style={{ color: '#1262a0' }}>
                  ไปยังเว็บไซต์คณะ
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </span>
              </div>
            </a>
          </div>

        </div>
      </section>

      {/* ===== Announcements ===== */}
      <section id="announcements" className="py-20 px-6 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-center mb-2"
            style={{ color: '#42b5e1' }}>ข่าวสาร</p>
          <h2 className="text-2xl md:text-3xl font-black text-[#1a2d45] text-center mb-3">
            ประกาศ / ข่าวสาร
          </h2>
          <p className="text-sm text-gray-500 text-center max-w-xl mx-auto mb-12">
            ข่าวสาร ประกาศ และกิจกรรมล่าสุดจากคณะ
          </p>

          {loadingAnn ? (
            <div className="flex justify-center py-16">
              <div className="flex gap-2 items-center text-gray-400">
                <div className="w-4 h-4 border-2 border-[#42b5e1] border-t-transparent rounded-full animate-spin"/>
                <span className="text-sm">กำลังโหลด...</span>
              </div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl mx-auto mb-4">📢</div>
              <p className="text-gray-400 text-sm font-medium">ยังไม่มีประกาศในขณะนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {announcements.map(item => (
                <div
                  key={item.announcement_id}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-[#42b5e1]/30 transition-all duration-300"
                  onClick={() => setSelected(item)}
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-auto"
                    />
                  )}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {!item.image_url && (
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0 mt-0.5">
                          📢
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-800 group-hover:text-[#1262a0] transition-colors line-clamp-1">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {item.content}
                        </p>
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M5 1a1 1 0 00-1 1v1H3a2 2 0 00-2 2v9a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-1V2a1 1 0 10-2 0v1H6V2a1 1 0 00-1-1zm0 5a1 1 0 000 2h6a1 1 0 100-2H5z"/>
                            </svg>
                            {new Date(item.created_at).toLocaleDateString('th-TH', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </span>
                          <span className="text-xs font-bold flex items-center gap-1"
                            style={{ color: '#42b5e1' }}>
                            อ่านเพิ่มเติม
                            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer id="contact" className="bg-[#0f1e2e] text-white pt-12 pb-6 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={kmuttLogo} alt="KMUTT" className="h-8 w-auto object-contain brightness-0 invert opacity-80" />
                <img src={fietLogo} alt="FIET" className="h-9 w-auto object-contain brightness-0 invert opacity-80" />
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                ระบบสารสนเทศงานวิจัย<br/>
                คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี<br/>
                มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี
              </p>
            </div>
            {/* Nav */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">เมนู</p>
              <ul className="space-y-2">
                {[
                  { label: 'หน้าแรก', href: '#top' },
                  { label: 'ฟีเจอร์', href: '#features' },
                  { label: 'ระบบที่เกี่ยวข้อง', href: '#links' },
                  { label: 'ประกาศ / ข่าวสาร', href: '#announcements' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-white/60 hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
            {/* External */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">ระบบที่เกี่ยวข้อง</p>
              <ul className="space-y-2">
                <li>
                  <a href={RI_URL} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1.5">
                    <span>🔬</span> ระบบ RI
                  </a>
                </li>
                <li>
                  <a href={IRB_URL} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1.5">
                    <span>🏥</span> ระบบ IRB
                  </a>
                </li>
              </ul>
            </div>
            {/* Contact */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">ติดต่อเรา</p>
              <ul className="space-y-3">
                <li className="text-xs text-white/60 leading-relaxed">
                  สำนักงานคณบดี<br/>อาคารเรียนรวม 3 (S13) ชั้น 2
                </li>
                <li>
                  <a href="tel:024709500" className="text-xs text-white/60 hover:text-white transition-colors">
                    โทรศัพท์ 0 2470 9500
                  </a>
                </li>
                <li>
                  <a href="mailto:irb.fiet@kmutt.ac.th" className="text-xs transition-colors hover:opacity-80" style={{ color: '#42b5e1' }}>
                    irb.fiet@kmutt.ac.th
                  </a>
                </li>
              </ul>
              <div className="flex gap-2 mt-5">
                <a href="https://www.facebook.com/fiet.kmutt" target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                  style={{ background: '#1877f2' }}>
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.031 4.437 11.028 10.125 11.927v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796v8.437C19.563 23.101 24 18.104 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://www.youtube.com/@FIETkmutt" target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                  style={{ background: '#ff0000' }}>
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a href="https://line.me/R/ti/p/@fietkmutt" target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                  style={{ background: '#06c755' }}>
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-white/30 text-center sm:text-left">
              © {new Date().getFullYear()} Faculty of Industrial Education and Technology, KMUTT. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

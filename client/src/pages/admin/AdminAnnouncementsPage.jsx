import { useEffect, useMemo, useRef, useState } from 'react'
import { 
  Megaphone, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  X, 
  Search 
} from 'lucide-react'
import { announcementService } from '../../services/api'
import toast from 'react-hot-toast'

const MAX_IMAGE_SIZE = 20 * 1024 * 1024

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AnnouncementPreview({ form, preview }) {
  const hasContent = form.title.trim() || form.content.trim() || preview || form.link_url.trim()

  return (
    <aside className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">ตัวอย่างประกาศ</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">แสดงรูปแบบใกล้เคียงกับหน้า Homepage</p>
      </div>

      {!hasContent ? (
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto mb-4 flex items-center justify-center text-slate-400">
            <Megaphone size={28} strokeWidth={1.8} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">เริ่มกรอกข้อมูลเพื่อดูตัวอย่าง</p>
        </div>
      ) : (
        <div className="p-5">
          {preview ? (
            <div className="relative overflow-hidden border border-slate-100 dark:border-slate-800 mb-4 bg-slate-100 dark:bg-slate-800 shadow-inner">
              <img src={preview} alt="preview" className="w-full h-auto max-h-[600px] object-contain mx-auto" />
            </div>
          ) : (
            <div className="w-full aspect-[16/9] rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 mb-4 flex items-center justify-center text-slate-400">
              <ImageIcon size={32} strokeWidth={1.8} />
            </div>
          )}
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-2">ประกาศล่าสุด</p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {form.title.trim() || 'หัวข้อประกาศ'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 whitespace-pre-wrap leading-relaxed">
            {form.content.trim() || 'รายละเอียดประกาศจะแสดงที่นี่'}
          </p>
          {form.link_url.trim() && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
              <LinkIcon size={16} strokeWidth={2} />
              เปิดลิงก์ประกอบ
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

function AnnouncementForm({ onSaved }) {
  const [form, setForm] = useState({ title: '', content: '', link_url: '' })
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('รูปภาพต้องมีขนาดไม่เกิน 5 MB')
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview)
    setImage(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('กรุณากรอกหัวข้อและเนื้อหาประกาศ')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title.trim())
      fd.append('content', form.content.trim())
      fd.append('link_url', form.link_url.trim())
      if (image) fd.append('image', image)
      await announcementService.create(fd)
      toast.success('เผยแพร่ประกาศสำเร็จ')
      setForm({ title: '', content: '', link_url: '' })
      clearImage()
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">สร้างประกาศใหม่</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">ประกาศจะแสดงบนหน้า Homepage และแผงแจ้งเตือนของผู้ใช้</p>
          </div>
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            Published
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">หัวข้อประกาศ</label>
            <span className="text-[11px] text-slate-400">{form.title.length}/120</span>
          </div>
          <input
            type="text"
            maxLength={120}
            value={form.title}
            onChange={e => updateField('title', e.target.value)}
            placeholder="เช่น ประกาศเปิดรับเอกสารรับรองจริยธรรมรอบใหม่"
            className="input-field"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">เนื้อหาประกาศ</label>
            <span className="text-[11px] text-slate-400">{form.content.length} ตัวอักษร</span>
          </div>
          <textarea
            rows={7}
            value={form.content}
            onChange={e => updateField('content', e.target.value)}
            placeholder="ระบุรายละเอียด วันเวลา เงื่อนไข หรือข้อมูลที่ผู้ใช้ต้องทราบ..."
            className="input-field resize-none leading-relaxed"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">รูปภาพประกอบ <span className="text-slate-400 font-normal">(ไม่บังคับ)</span></label>
          <div className="mt-1 mb-3 space-y-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-primary-600 dark:text-primary-400">คำแนะนำ:</span> อัตราส่วน <span className="font-bold">16:9</span> (เช่น 1200 x 630 px) จะแสดงผลได้สวยงามที่สุด
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">รองรับไฟล์ JPG/PNG/WebP, ขนาดไม่เกิน 20 MB</p>
          </div>
          {preview ? (
            <div className="relative overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 shadow-inner group/img">
              <img src={preview} alt="preview" className="w-full h-auto max-h-80 object-contain mx-auto" />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-3 top-3 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-600 transition-all flex items-center justify-center shadow-lg active:scale-90"
                aria-label="ลบรูปภาพ"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-colors">
              <ImageIcon size={32} strokeWidth={1.7} className="text-slate-300 dark:text-slate-600 mb-2" />
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">คลิกเพื่อเลือกรูปภาพ</span>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
            </label>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">ลิงก์ประกอบ <span className="text-slate-400">(ไม่บังคับ)</span></label>
          <input
            type="url"
            value={form.link_url}
            onChange={e => updateField('link_url', e.target.value)}
            placeholder="https://..."
            className="input-field mt-1.5"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-400 dark:text-slate-500">ตรวจสอบตัวอย่างก่อนเผยแพร่เพื่อลดการแก้ไขภายหลัง</p>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 bg-primary-700 hover:bg-primary-800"
          >
            {loading ? 'กำลังบันทึก...' : 'เผยแพร่ประกาศ'}
          </button>
        </div>
      </form>

      <AnnouncementPreview form={form} preview={preview} />
    </section>
  )
}

function AnnouncementCard({ item, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setLoading(true)
    try {
      await announcementService.remove(item.announcement_id)
      toast.success('ลบประกาศแล้ว')
      onDelete(item.announcement_id)
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  return (
    <article className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary-200 dark:hover:border-primary-900/50 transition-all duration-500 text-left">
      <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="relative bg-slate-100 dark:bg-slate-800/40 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 h-56 md:h-auto overflow-hidden">
          {item.image_url ? (
            <>
              {/* Subtle background blur for modern feel */}
              <div className="absolute inset-0 opacity-10 blur-2xl scale-150">
                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
              </div>
              <img 
                src={item.image_url} 
                alt={item.title} 
                className="relative z-10 w-full h-full object-contain p-2" 
              />
            </>
          ) : (
            <div className="relative z-10 h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
              <Megaphone size={48} strokeWidth={1.7} />
            </div>
          )}
        </div>
        <div className="p-5 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300">เผยแพร่แล้ว</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(item.created_at)}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{item.title}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">โดย {item.created_by_name || 'ผู้ดูแลระบบ'}</p>
            </div>
            <button
              onClick={handleDelete}
              disabled={loading}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
                confirming
                  ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-red-600 hover:border-red-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 dark:hover:text-red-300 dark:hover:border-red-900'
              }`}
            >
              {loading ? '...' : confirming ? 'ยืนยันลบ?' : 'ลบ'}
            </button>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 mt-4 whitespace-pre-wrap leading-relaxed line-clamp-3">{item.content}</p>

          {item.link_url && (
            <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:underline break-all">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 015.657 5.657l-1.414 1.414a4 4 0 01-5.657-5.657M10.172 13.828a4 4 0 01-5.657-5.657l1.414-1.414a4 4 0 015.657 5.657" />
              </svg>
              {item.link_url}
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data } = await announcementService.getAll()
      setItems(data || [])
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(item =>
      `${item.title || ''} ${item.content || ''} ${item.created_by_name || ''}`.toLowerCase().includes(q)
    )
  }, [items, query])

  const handleDelete = (id) => setItems(prev => prev.filter(a => a.announcement_id !== id))

  return (
    <div className="space-y-6 max-w-7xl">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">จัดการประกาศ</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">สร้างประกาศพร้อมรูปภาพ ลิงก์ประกอบ และตรวจสอบรายการที่เผยแพร่แล้ว</p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-full sm:min-w-[320px] lg:min-w-[360px]">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">ประกาศทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">มีรูปภาพ</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{items.filter(item => item.image_url).length}</p>
          </div>
        </div>
      </header>

      <AnnouncementForm onSaved={fetchAll} />

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">ประกาศที่เผยแพร่อยู่</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">แสดง {filteredItems.length} จาก {items.length} รายการ</p>
          </div>
          <div className="relative w-full md:w-80">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ค้นหาประกาศ..."
              className="input-field pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">กำลังโหลด...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto mb-4 flex items-center justify-center text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{query ? 'ไม่พบประกาศที่ค้นหา' : 'ยังไม่มีประกาศ'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => (
              <AnnouncementCard key={item.announcement_id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

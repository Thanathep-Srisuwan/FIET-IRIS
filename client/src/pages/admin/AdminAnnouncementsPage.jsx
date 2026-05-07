import { useEffect, useRef, useState } from 'react'
import { announcementService } from '../../services/api'
import toast from 'react-hot-toast'

function AnnouncementForm({ onSaved }) {
  const [form, setForm]       = useState({ title: '', content: '', link_url: '' })
  const [image, setImage]     = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef          = useRef(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
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
      toast.error('กรุณากรอกหัวข้อและเนื้อหา')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title',    form.title)
      fd.append('content',  form.content)
      fd.append('link_url', form.link_url)
      if (image) fd.append('image', image)
      await announcementService.create(fd)
      toast.success('สร้างประกาศสำเร็จ')
      setForm({ title: '', content: '', link_url: '' })
      clearImage()
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">สร้างประกาศใหม่</h2>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">หัวข้อประกาศ</label>
        <input
          type="text"
          value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          placeholder="ระบุหัวข้อ..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': '#42b5e1' }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">เนื้อหาประกาศ</label>
        <textarea
          rows={4}
          value={form.content}
          onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
          placeholder="ระบุเนื้อหาประกาศ..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': '#42b5e1' }}
        />
      </div>

      {/* Image upload */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          รูปภาพประกอบ <span className="text-slate-400">(ไม่บังคับ)</span>
        </label>
        <p className="text-[11px] text-slate-400 mb-2">
          แนะนำ <strong>1200 × 630 พิกเซล</strong> (สัดส่วน 16:9) · JPG, PNG, WebP · ไม่เกิน 5 MB
        </p>
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="preview"
              className="w-full h-auto rounded-lg border border-slate-200"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 border border-slate-200 shadow-sm text-xs font-bold"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-[#42b5e1] hover:bg-blue-50 transition-colors">
            <svg className="w-8 h-8 text-slate-300 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span className="text-xs text-slate-400">คลิกเพื่อเลือกรูปภาพ</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">ลิ้งค์ประกอบ <span className="text-slate-400">(ไม่บังคับ)</span></label>
        <input
          type="url"
          value={form.link_url}
          onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))}
          placeholder="https://..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': '#42b5e1' }}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#42b5e1' }}
        >
          {loading ? 'กำลังบันทึก...' : 'เผยแพร่ประกาศ'}
        </button>
      </div>
    </form>
  )
}

function AnnouncementCard({ item, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading]       = useState(false)

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return }
    setLoading(true)
    try {
      await announcementService.remove(item.announcement_id)
      toast.success('ลบประกาศแล้ว')
      onDelete(item.announcement_id)
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally { setLoading(false); setConfirming(false) }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.title}
          className="w-full h-auto"
        />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              โดย {item.created_by_name} ·{' '}
              {new Date(item.created_at).toLocaleDateString('th-TH', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            style={confirming
              ? { backgroundColor: '#fef2f2', color: '#be123c', border: '1px solid #fecdd3' }
              : { backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }
            }
          >
            {loading ? '...' : confirming ? 'ยืนยันลบ?' : 'ลบ'}
          </button>
        </div>
        <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap leading-relaxed">{item.content}</p>
        {item.link_url && (
          <a
            href={item.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium hover:underline"
            style={{ color: '#42b5e1' }}
          >
            🔗 {item.link_url}
          </a>
        )}
      </div>
    </div>
  )
}

export default function AdminAnnouncementsPage() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data } = await announcementService.getAll()
      setItems(data || [])
    } catch { toast.error('โหลดข้อมูลไม่สำเร็จ') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const handleDelete = (id) => setItems(prev => prev.filter(a => a.announcement_id !== id))

  return (
    <div className="space-y-6 max-w-3xl">

      <div>
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#42b5e1' }}>Admin</p>
        <h1 className="text-2xl font-bold text-slate-800">จัดการประกาศ</h1>
      </div>

      <AnnouncementForm onSaved={fetchAll} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">ประกาศที่เผยแพร่อยู่</h2>
          <span className="text-xs text-slate-400">{items.length} รายการ</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-300 text-4xl mb-2">○</p>
            <p className="text-slate-400 text-sm">ยังไม่มีประกาศ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <AnnouncementCard key={item.announcement_id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

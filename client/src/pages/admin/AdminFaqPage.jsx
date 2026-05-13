import { useCallback, useEffect, useState } from 'react'
import {
  ChevronDown, ChevronUp, HelpCircle, Pencil, Plus, Save, Trash2, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { faqService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'

const EMPTY_FORM = { question: '', answer: '', category: '', sort_order: 0, is_active: true }

function FaqModal({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const isNew = !initial?.faq_id

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error('กรุณากรอกคำถามและคำตอบ')
      return
    }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {isNew ? 'เพิ่มคำถาม FAQ' : 'แก้ไขคำถาม FAQ'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">คำถาม *</label>
            <input
              name="question"
              value={form.question}
              onChange={handleChange}
              className="input-field w-full"
              placeholder="กรอกคำถาม..."
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">คำตอบ *</label>
            <textarea
              name="answer"
              value={form.answer}
              onChange={handleChange}
              rows={5}
              className="input-field w-full resize-none"
              placeholder="กรอกคำตอบ..."
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">หมวดหมู่</label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                className="input-field w-full"
                placeholder="เช่น การอัปโหลด, บัญชี..."
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">ลำดับ</label>
              <input
                type="number"
                name="sort_order"
                value={form.sort_order}
                onChange={handleChange}
                className="input-field w-full"
                min={0}
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="h-4 w-4 rounded"
              disabled={loading}
            />
            <label htmlFor="is_active" className="text-sm text-slate-700 dark:text-slate-300">เผยแพร่ (แสดงให้ผู้ใช้เห็น)</label>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex flex-1 items-center justify-center gap-2 py-2.5 disabled:opacity-60">
              {loading
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <Save size={15} />
              }
              {isNew ? 'เพิ่ม' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FaqRow({ item, onEdit, onDelete, onToggle }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <div className="flex items-start gap-3 px-5 py-3">
        <button onClick={() => setOpen(o => !o)} className="mt-0.5 shrink-0 text-slate-400 hover:text-slate-600">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.question}</p>
            {item.category && (
              <span className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {item.category}
              </span>
            )}
            {!item.is_active && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">
                ซ่อน
              </span>
            )}
          </div>
          {open && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {item.answer}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => onToggle(item)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              item.is_active
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {item.is_active ? 'เผยแพร่' : 'ซ่อน'}
          </button>
          <button onClick={() => onEdit(item)} className="rounded-lg bg-primary-50 p-1.5 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(item)} className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminFaqPage() {
  const { t } = useLanguage()
  const [faqs, setFaqs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [modal, setModal]         = useState(null) // null | 'new' | faqItem
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await faqService.getAll({ include_inactive: '1' })
      setFaqs(data.faqs || [])
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async (form) => {
    setSaving(true)
    try {
      if (form.faq_id) {
        await faqService.update(form.faq_id, form)
        toast.success('อัปเดต FAQ สำเร็จ')
      } else {
        await faqService.create(form)
        toast.success('เพิ่ม FAQ สำเร็จ')
      }
      setModal(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await faqService.remove(deleteTarget.faq_id)
      toast.success('ลบ FAQ สำเร็จ')
      setDeleteTarget(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (item) => {
    try {
      await faqService.update(item.faq_id, { ...item, is_active: !item.is_active })
      fetchData()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Modals */}
      {modal !== null && (
        <FaqModal
          initial={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          loading={saving}
        />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">ลบคำถาม FAQ</h3>
            <p className="mt-2 text-sm text-slate-500">
              คุณต้องการลบ <span className="font-semibold text-slate-700 dark:text-slate-200">"{deleteTarget.question}"</span> ใช่หรือไม่?
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={saving} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700">ยกเลิก</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {saving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'ลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">การจัดการ</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">FAQ / ศูนย์ช่วยเหลือ</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">จัดการคำถามที่พบบ่อย แสดงให้ผู้ใช้ทุก role เห็น</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="btn-primary flex items-center gap-2 px-4 py-2.5"
        >
          <Plus size={16} />
          เพิ่มคำถาม
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-primary-50 p-4 dark:bg-primary-900/20">
          <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">{faqs.length}</p>
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">ทั้งหมด</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{faqs.filter(f => f.is_active).length}</p>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">เผยแพร่แล้ว</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{faqs.filter(f => !f.is_active).length}</p>
          <p className="text-xs font-semibold text-slate-500">ซ่อนอยู่</p>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <HelpCircle size={18} className="text-primary-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">รายการคำถาม-คำตอบ</p>
        </div>

        {loading ? (
          <p className="p-10 text-center text-sm text-slate-400">{t('common.loading')}</p>
        ) : faqs.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <HelpCircle size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">ยังไม่มีคำถาม FAQ</p>
            <button onClick={() => setModal('new')} className="btn-primary mt-4 px-4 py-2">เพิ่มคำถามแรก</button>
          </div>
        ) : (
          faqs.map(item => (
            <FaqRow
              key={item.faq_id}
              item={item}
              onEdit={setModal}
              onDelete={setDeleteTarget}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>
    </div>
  )
}

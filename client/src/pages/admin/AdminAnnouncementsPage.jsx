import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Megaphone,
  Image as ImageIcon,
  Link as LinkIcon,
  X,
  Search,
  UploadCloud,
  FileImage,
  CheckCircle2,
  RefreshCw,
  Info
} from 'lucide-react'
import { announcementService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import toast from 'react-hot-toast'

const MAX_IMAGE_SIZE = 20 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function formatFileSize(bytes = 0) {
  if (!bytes) return '-'
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function getImageRatio(width, height) {
  if (!width || !height) return null
  const value = width / height
  if (Math.abs(value - 16 / 9) < 0.08) return '16:9'
  if (Math.abs(value - 4 / 3) < 0.08) return '4:3'
  if (Math.abs(value - 1) < 0.08) return '1:1'
  if (Math.abs(value - 9 / 16) < 0.08) return '9:16'
  return value > 1 ? `${value.toFixed(2)}:1` : `1:${(1 / value).toFixed(2)}`
}

function AnnouncementPreview({ form, preview }) {
  const { t } = useLanguage()
  const hasContent = form.title.trim() || form.content.trim() || preview || form.link_url.trim()

  return (
    <aside className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('adminAnnouncements.previewTitle')}</p>
      </div>

      {!hasContent ? (
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto mb-4 flex items-center justify-center text-slate-400">
            <Megaphone size={28} strokeWidth={1.8} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('adminAnnouncements.previewStart')}</p>
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
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-2">{t('adminAnnouncements.latestLabel')}</p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {form.title.trim() || t('adminAnnouncements.titleLabel')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 whitespace-pre-wrap leading-relaxed">
            {form.content.trim() || t('adminAnnouncements.contentLabel')}
          </p>
          {form.link_url.trim() && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
              <LinkIcon size={16} strokeWidth={2} />
              {t('adminAnnouncements.openLink')}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

function AnnouncementForm({ onSaved }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({ title: '', content: '', link_url: '' })
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [imageDimensions, setImageDimensions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const getImageFitMessage = (dimensions) => {
    if (!dimensions) return t('adminAnnouncements.fitDefault')
    const ratio = dimensions.width / dimensions.height
    if (Math.abs(ratio - 16 / 9) < 0.08) return t('adminAnnouncements.fit169')
    return t('adminAnnouncements.fitOther')
  }

  const setSelectedImage = (file) => {
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t('adminAnnouncements.imageTypeError'))
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(t('adminAnnouncements.imageSizeError'))
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    const nextPreview = URL.createObjectURL(file)
    setImage(file)
    setImageDimensions(null)
    setPreview(nextPreview)

    const probe = new Image()
    probe.onload = () => setImageDimensions({ width: probe.naturalWidth, height: probe.naturalHeight })
    probe.src = nextPreview
  }

  const handleImageChange = (e) => {
    setSelectedImage(e.target.files[0])
  }

  const handleImageDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    setSelectedImage(e.dataTransfer.files[0])
  }

  const openImagePicker = () => fileInputRef.current?.click()

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview)
    setImage(null)
    setImageDimensions(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      toast.error(t('adminAnnouncements.validateError'))
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title.trim())
      fd.append('content', form.content.trim())
      fd.append('link_url', form.link_url.trim())
      if (image) fd.append('image', image)
      const { data } = await announcementService.create(fd)
      toast.success(t('adminAnnouncements.publishSuccess'))
      setForm({ title: '', content: '', link_url: '' })
      clearImage()
      onSaved(data?.announcement)
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('adminAnnouncements.createTitle')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('adminAnnouncements.createDesc')}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">{t('adminAnnouncements.titleLabel')}</label>
            <span className="text-[11px] text-slate-400">{form.title.length}/120</span>
          </div>
          <input
            type="text"
            maxLength={120}
            value={form.title}
            onChange={e => updateField('title', e.target.value)}
            placeholder={t('adminAnnouncements.titleLabel')}
            className="input-field"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">{t('adminAnnouncements.contentLabel')}</label>
            <span className="text-[11px] text-slate-400">{t('adminAnnouncements.contentChars', { count: form.content.length })}</span>
          </div>
          <textarea
            rows={7}
            value={form.content}
            onChange={e => updateField('content', e.target.value)}
            placeholder={t('adminAnnouncements.contentLabel')}
            className="input-field resize-none leading-relaxed"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {t('adminAnnouncements.imageLabel')} <span className="text-slate-400 font-normal">{t('adminAnnouncements.imageOptional')}</span>
          </label>
          <div className="mt-1 mb-3 space-y-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-primary-600 dark:text-primary-400">{t('common.tip')}:</span> {t('adminAnnouncements.imageTip')}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{t('adminAnnouncements.imageInfo')}</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
          {preview ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="relative flex min-h-56 max-h-[520px] items-center justify-center bg-slate-100 dark:bg-slate-800">
                <div className="absolute inset-0 opacity-20 blur-2xl scale-110">
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                </div>
                <img src={preview} alt="preview" className="relative z-10 max-h-[520px] w-full object-contain" />
                <div className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                  <CheckCircle2 size={14} />
                  {getImageRatio(imageDimensions?.width, imageDimensions?.height) || 'Ready'}
                </div>
              </div>
              <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                    <FileImage size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{image?.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatFileSize(image?.size)} • {image?.type?.replace('image/', '').toUpperCase()}
                      {imageDimensions && ` • ${imageDimensions.width} x ${imageDimensions.height}px`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 lg:col-span-2">
                  <Info size={15} className="mt-0.5 shrink-0 text-primary-500" />
                  <span>{getImageFitMessage(imageDimensions)}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={openImagePicker}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-primary-300 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <RefreshCw size={14} />
                    {t('adminAnnouncements.changeImage')}
                  </button>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                    aria-label={t('adminAnnouncements.removeImage')}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openImagePicker}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleImageDrop}
              className={`group flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm dark:bg-primary-900/20 dark:text-primary-300'
                  : 'border-slate-200 bg-slate-50/70 text-slate-500 hover:border-primary-400 hover:bg-primary-50/60 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400 dark:hover:bg-primary-900/20'
              }`}
            >
              <UploadCloud size={32} strokeWidth={1.7} className="text-primary-500 dark:text-primary-300 mb-2" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-100">{t('adminAnnouncements.dragOrClick')}</span>
              <span className="mt-1 text-xs text-slate-400">{t('adminAnnouncements.recommended')}</span>
            </button>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {t('adminAnnouncements.linkLabel')} <span className="text-slate-400">{t('adminAnnouncements.linkOptional')}</span>
          </label>
          <input
            type="url"
            value={form.link_url}
            onChange={e => updateField('link_url', e.target.value)}
            placeholder="https://..."
            className="input-field mt-1.5"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-400 dark:text-slate-500">{t('adminAnnouncements.reviewTip')}</p>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 bg-primary-700 hover:bg-primary-800"
          >
            {loading ? t('adminAnnouncements.publishing') : t('adminAnnouncements.publish')}
          </button>
        </div>
      </form>

      <AnnouncementPreview form={form} preview={preview} />
    </section>
  )
}

function AnnouncementCard({ item, onDelete }) {
  const { t, locale } = useLanguage()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const formatDate = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setLoading(true)
    try {
      await announcementService.remove(item.announcement_id)
      toast.success(t('adminAnnouncements.deleteSuccess'))
      onDelete(item.announcement_id)
    } catch {
      toast.error(t('common.error'))
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
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300">{t('adminAnnouncements.published')}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(item.created_at)}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{item.title}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('adminAnnouncements.createdBy', { name: item.created_by_name || t('roles.admin') })}</p>
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
              {loading ? '...' : confirming ? t('adminAnnouncements.deleteConfirm') : t('common.delete')}
            </button>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 mt-4 whitespace-pre-wrap leading-relaxed line-clamp-3">{item.content}</p>

          {item.link_url && (
            <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:underline break-all">
              <LinkIcon size={14} className="flex-shrink-0" />
              {item.link_url}
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default function AdminAnnouncementsPage() {
  const { t } = useLanguage()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data } = await announcementService.getAll()
      setItems(data || [])
    } catch {
      toast.error(t('adminAnnouncements.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleSaved = (announcement) => {
    if (!announcement?.announcement_id) {
      fetchAll()
      return
    }
    setItems(prev => [announcement, ...prev])
  }

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
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">{t('roles.admin')}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('topbar.adminAnnouncements')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('adminAnnouncements.desc')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-full sm:min-w-[320px] lg:min-w-[360px]">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">{t('adminAnnouncements.totalLabel')}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-semibold text-slate-400">{t('adminAnnouncements.withImageLabel')}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{items.filter(item => item.image_url).length}</p>
          </div>
        </div>
      </header>

      <AnnouncementForm onSaved={handleSaved} />

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('adminAnnouncements.listTitle')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('adminAnnouncements.listCount', { shown: filteredItems.length, total: items.length })}</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('adminAnnouncements.searchPlaceholder')}
              className="input-field pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">{t('common.loading')}</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto mb-4 flex items-center justify-center text-slate-400">
              <Megaphone size={32} strokeWidth={1.8} />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{query ? t('adminAnnouncements.emptySearch') : t('adminAnnouncements.empty')}</p>
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

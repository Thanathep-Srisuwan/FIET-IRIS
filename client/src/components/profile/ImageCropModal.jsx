import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, RotateCcw, Check } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

async function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

async function getCroppedBlob(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
}

export default function ImageCropModal({ imageSrc, onConfirm, onCancel }) {
  const { t } = useLanguage()
  const [crop, setCrop]   = useState({ x: 0, y: 0 })
  const [zoom, setZoom]   = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [loading, setLoading] = useState(false)

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setLoading(true)
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' })
      onConfirm(file, URL.createObjectURL(blob))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <h2 className="text-base font-semibold text-white">{t('profile.cropTitle')}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Crop area */}
        <div className="relative h-80 w-full bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom controls */}
        <div className="border-t border-slate-700 px-5 py-4">
          <p className="mb-2 text-xs font-medium text-slate-400">{t('profile.cropZoom')}</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(1, z - 0.1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-700"
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-600 accent-primary-500"
            />
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(3, z + 0.1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-700"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-700"
              title={t('profile.cropReset')}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 border-t border-slate-700 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-600 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              : <Check size={16} />
            }
            {t('profile.cropConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

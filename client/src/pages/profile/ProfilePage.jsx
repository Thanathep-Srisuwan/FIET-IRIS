import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  BookOpen, Camera, GraduationCap, ImageUp, LockKeyhole,
  Mail, Phone, ShieldCheck, Trash2, User, UserCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { useLanguage } from '../../contexts/LanguageContext'
import { authService } from '../../services/api'

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const { t } = useLanguage()
  const location = useLocation()
  const fileInputRef   = useRef(null)
  const photoSectionRef = useRef(null)

  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [loading, setLoading]         = useState(false)
  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [profile, setProfile]         = useState(null) // full profile with advisor

  const profileImageUrl = user?.profile_image_url || ''

  // Fetch full profile (includes advisor info)
  useEffect(() => {
    authService.getProfile()
      .then(({ data }) => setProfile(data.user))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(''); return undefined }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  useEffect(() => {
    if (new URLSearchParams(location.search).get('focus') === 'photo') {
      photoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [location.search])

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.current_password || !form.new_password || !form.confirm_password)
      return toast.error(t('profile.fillAll'))
    if (form.new_password.length < 8)
      return toast.error(t('profile.minLength'))
    if (form.new_password !== form.confirm_password)
      return toast.error(t('profile.passwordMismatch'))
    setLoading(true)
    try {
      await authService.changePassword({ current_password: form.current_password, new_password: form.new_password })
      toast.success(t('profile.changeSuccess'))
      setForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.changeFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      return toast.error(t('profile.photoTypeError'))
    if (file.size > 5 * 1024 * 1024)
      return toast.error(t('profile.photoSizeError'))
    setPhotoFile(file)
  }

  const handlePhotoUpload = async () => {
    if (!photoFile) return
    const data = new FormData()
    data.append('image', photoFile)
    setPhotoLoading(true)
    try {
      const res = await authService.updateProfilePicture(data)
      updateUser(res.data.user)
      setPhotoFile(null)
      toast.success(t('profile.photoSaveSuccess'))
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.photoSaveFailed'))
    } finally {
      setPhotoLoading(false)
    }
  }

  const handlePhotoRemove = async () => {
    setPhotoLoading(true)
    try {
      const res = await authService.removeProfilePicture()
      updateUser(res.data.user)
      setPhotoFile(null)
      toast.success(t('profile.photoRemoveSuccess'))
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.photoSaveFailed'))
    } finally {
      setPhotoLoading(false)
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  const avatarContent = (photoPreview || profileImageUrl)
    ? <img src={photoPreview || profileImageUrl} alt="avatar" className="h-full w-full object-cover" />
    : initials

  const advisor = profile?.advisor

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      {/* Personal Info Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/20 text-2xl font-bold text-white shadow-lg backdrop-blur-sm">
              <div className="flex h-full w-full items-center justify-center">{avatarContent}</div>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold text-white">{user?.name}</p>
              <p className="mt-0.5 truncate text-sm text-primary-100">{user?.email}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <ShieldCheck size={12} />
                {t(`roles.${user?.role || 'user'}`)}
              </span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 px-6 py-4 dark:divide-slate-800">
          <p className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('profile.personalInfo')}
          </p>

          <InfoRow icon={<User size={16} />} label={t('profile.name')} value={user?.name} />
          <InfoRow icon={<Mail size={16} />} label={t('profile.email')} value={user?.email} />
          <InfoRow icon={<ShieldCheck size={16} />} label={t('profile.role')} value={t(`roles.${user?.role || 'user'}`)} />

          {profile?.student_id && (
            <InfoRow icon={<BookOpen size={16} />} label="รหัสนักศึกษา" value={profile.student_id} />
          )}
          {profile?.degree_level && (
            <InfoRow icon={<GraduationCap size={16} />} label="ระดับการศึกษา" value={
              profile.degree_level === 'bachelor' ? 'ปริญญาตรี'
              : profile.degree_level === 'master'   ? 'ปริญญาโท'
              : profile.degree_level === 'doctoral'  ? 'ปริญญาเอก'
              : profile.degree_level
            } />
          )}
          {profile?.program && (
            <InfoRow icon={<BookOpen size={16} />} label="สาขาวิชา" value={profile.program} />
          )}
          {profile?.phone && (
            <InfoRow icon={<Phone size={16} />} label="เบอร์โทรศัพท์" value={profile.phone} />
          )}
        </div>
      </div>

      {/* Advisor Card — แสดงเฉพาะ student */}
      {user?.role === 'student' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <UserCheck size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">อาจารย์ที่ปรึกษา</p>
              <p className="text-xs text-slate-400">ข้อมูลอาจารย์ที่ปรึกษาของคุณ</p>
            </div>
          </div>

          <div className="px-6 py-5">
            {!profile ? (
              <p className="text-sm text-slate-400">กำลังโหลด...</p>
            ) : advisor ? (
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary-600 text-lg font-bold text-white">
                  {advisor.profile_image_url
                    ? <img src={advisor.profile_image_url} alt={advisor.name} className="h-full w-full object-cover" />
                    : advisor.name?.[0]?.toUpperCase() || 'A'
                  }
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{advisor.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{advisor.email}</p>
                  <a
                    href={`mailto:${advisor.email}`}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300"
                  >
                    <Mail size={12} />
                    ส่งอีเมล
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <UserCheck size={18} className="text-slate-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มีอาจารย์ที่ปรึกษา กรุณาติดต่อผู้ดูแลระบบ</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Photo Card */}
      <div ref={photoSectionRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            <Camera size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('profile.photoTitle')}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('profile.photoDesc')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-primary-600 text-2xl font-bold text-white shadow-sm">
            <div className="flex h-full w-full items-center justify-center">{avatarContent}</div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('profile.changePhoto')}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('profile.photoHint')}</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoSelect} disabled={photoLoading} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={photoLoading} className="btn-secondary flex items-center gap-2 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60">
                <ImageUp size={16} />{t('profile.choosePhoto')}
              </button>
              {photoFile && (
                <button type="button" onClick={handlePhotoUpload} disabled={photoLoading} className="btn-primary flex items-center gap-2 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60">
                  {photoLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Camera size={16} />}
                  {t('profile.uploadPhoto')}
                </button>
              )}
              {(profileImageUrl || photoFile) && (
                <button type="button" onClick={photoFile ? () => setPhotoFile(null) : handlePhotoRemove} disabled={photoLoading} className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20">
                  <Trash2 size={16} />{photoFile ? t('common.cancel') : t('profile.removePhoto')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            <LockKeyhole size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('profile.changePassword')}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('profile.changePasswordDesc')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {['current_password', 'new_password', 'confirm_password'].map((field) => (
            <div key={field}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t(`profile.${field}`)}
              </label>
              <input
                type="password"
                name={field}
                value={form[field]}
                onChange={handleChange}
                className="input-field"
                placeholder={t(`profile.${field}Placeholder`)}
                disabled={loading}
                autoComplete={field === 'current_password' ? 'current-password' : 'new-password'}
              />
            </div>
          ))}
          <div className="pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 px-6 py-2.5 disabled:cursor-not-allowed disabled:opacity-60">
              {loading
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />{t('common.saving')}</>
                : t('profile.savePassword')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{value || '-'}</p>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Clock, FolderOpen, RotateCcw, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { docTypeService, myTrashService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'

const formatDate = (value, locale) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

function RestoreConfirmDialog({ doc, onConfirm, onCancel, loading, t }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <RotateCcw size={22} />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{t('studentTrashPage.restoreTitle')}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t('studentTrashPage.restoreConfirm', { title: doc?.title || '-' })}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : t('studentTrashPage.restore')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StudentTrashPage() {
  const { t, locale } = useLanguage()
  const [docs, setDocs] = useState([])
  const [docTypes, setDocTypes] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(false)
  const [search, setSearch] = useState('')
  const [docType, setDocType] = useState('')
  const [page, setPage] = useState(1)
  const [confirmDoc, setConfirmDoc] = useState(null)
  const limit = 15

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await myTrashService.getAll({ search, doc_type: docType, page, limit })
      setDocs(data.documents || [])
      setTotal(data.total || 0)
    } catch {
      toast.error(t('studentTrashPage.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [search, docType, page, t])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    docTypeService.getAll()
      .then(({ data }) => setDocTypes(data || []))
      .catch(() => {})
  }, [])

  const handleRestore = async () => {
    if (!confirmDoc) return
    setRestoring(true)
    try {
      await myTrashService.restore(confirmDoc.doc_id)
      toast.success(t('studentTrashPage.restoreSuccess'))
      setConfirmDoc(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || t('studentTrashPage.restoreFailed'))
    } finally {
      setRestoring(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {confirmDoc && (
        <RestoreConfirmDialog
          doc={confirmDoc}
          onConfirm={handleRestore}
          onCancel={() => setConfirmDoc(null)}
          loading={restoring}
          t={t}
        />
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400">{t('studentTrashPage.eyebrow')}</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{t('studentTrashPage.title')}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('studentTrashPage.desc')}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 dark:bg-red-950/30">
            <Trash2 size={18} className="text-red-500" />
            <span className="text-sm font-bold text-red-700 dark:text-red-300">{t('studentTrashPage.total', { count: total })}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('studentTrashPage.searchPlaceholder')}
            className="input-field w-full pl-9"
          />
        </div>
        <select
          value={docType}
          onChange={(e) => { setDocType(e.target.value); setPage(1) }}
          className="input-field w-full sm:w-48"
        >
          <option value="">{t('studentTrashPage.allTypes')}</option>
          {docTypes.map(type => (
            <option key={type.type_id || type.type_code} value={type.type_code}>
              {type.type_code}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950">
          {t('common.loading')}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-950">
          <FolderOpen size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{t('studentTrashPage.emptyTitle')}</p>
          <p className="mt-1 text-sm text-slate-400">{t('studentTrashPage.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div
              key={doc.doc_id}
              className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-950/30">
                <Trash2 size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{doc.title}</p>
                  <span className="rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                    {doc.doc_type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t('studentTrashPage.deletedAt', { date: formatDate(doc.trashed_at, locale) })}
                  {doc.trash_reason ? ` · ${doc.trash_reason}` : ''}
                </p>
                {doc.days_until_purge != null && (
                  <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${
                    doc.days_until_purge <= 7 ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {doc.days_until_purge <= 7
                      ? <AlertTriangle size={13} />
                      : <Clock size={13} />
                    }
                    {doc.days_until_purge <= 0
                      ? t('studentTrashPage.purgeSoon')
                      : t('studentTrashPage.purgeInDays', { days: doc.days_until_purge })
                    }
                  </div>
                )}
              </div>

              <button
                onClick={() => setConfirmDoc(doc)}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
              >
                <RotateCcw size={14} />
                {t('studentTrashPage.restore')}
              </button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-700"
          >
            {t('studentTrashPage.pagePrev')}
          </button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-700"
          >
            {t('studentTrashPage.pageNext')}
          </button>
        </div>
      )}
    </div>
  )
}

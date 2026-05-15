import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell, CheckCircle2, ClipboardList, FileText, Loader2,
  ShieldCheck, ThumbsDown, ThumbsUp, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { documentService, notificationService, staffService } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useLanguage } from '../../contexts/LanguageContext'

const formatDate = (value, locale) =>
  value ? new Date(value).toLocaleDateString(locale) : '-'

function RejectModal({ doc, onClose, onConfirm }) {
  const { t } = useLanguage()
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!note.trim()) { toast.error(t('staffApprovals.rejectNoteRequired')); return }
    setLoading(true)
    await onConfirm(doc.doc_id, note.trim())
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(13,45,62,0.5)' }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('documents.approvalRejectConfirmTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
              {doc?.title}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('documents.approvalRejectConfirmDesc')}
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t('staffApprovals.rejectNoteLabel')}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder={t('staffApprovals.rejectNotePlaceholder')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {t('staffApprovals.btnConfirmReject')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StaffDashboard() {
  const { user } = useAuthStore()
  const { locale, t } = useLanguage()
  const navigate = useNavigate()

  const [stats, setStats]       = useState(null)
  const [pending, setPending]   = useState([])
  const [notifs, setNotifs]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [rejectTarget, setRejectTarget]   = useState(null)

  useEffect(() => {
    Promise.all([
      staffService.getStats(),
      documentService.getAll({ scope: 'approver', limit: 8, sort_by: 'created_at', sort_dir: 'desc' }),
      notificationService.getUnread(),
    ]).then(([s, d, n]) => {
      setStats(s.data)
      setPending(d.data?.documents || [])
      setNotifs(n.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleApprove = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'approve' }))
    try {
      await documentService.approve(id, {})
      toast.success(t('documents.approvalApproveSuccess'))
      setPending(prev => prev.filter(d => d.doc_id !== id))
      setStats(prev => prev ? {
        ...prev,
        pending_count: Math.max(0, prev.pending_count - 1),
        approved_this_month: prev.approved_this_month + 1,
      } : prev)
    } catch {
      toast.error(t('staffApprovals.toastError'))
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }))
    }
  }

  const handleReject = async (id, note) => {
    setActionLoading(prev => ({ ...prev, [id]: 'reject' }))
    try {
      await documentService.reject(id, { note })
      toast.success(t('documents.approvalRejectSuccess'))
      setPending(prev => prev.filter(d => d.doc_id !== id))
      setStats(prev => prev ? {
        ...prev,
        pending_count: Math.max(0, prev.pending_count - 1),
        rejected_this_month: prev.rejected_this_month + 1,
      } : prev)
    } catch {
      toast.error(t('staffApprovals.toastError'))
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }))
    }
  }

  const hasPending = (stats?.pending_count ?? 0) > 0
  const noAssigned = !loading && (stats?.assigned_types_count ?? 0) === 0

  const statCards = [
    {
      key: 'pending',
      label: t('staffDashboard.statPending'),
      value: stats?.pending_count ?? 0,
      hint: t('staffDashboard.statPendingHint'),
      tone: hasPending ? 'amber' : 'emerald',
      onClick: () => navigate('/staff/approvals'),
    },
    {
      key: 'approved',
      label: t('staffDashboard.statApproved'),
      value: stats?.approved_this_month ?? 0,
      hint: null,
      tone: 'blue',
    },
    {
      key: 'rejected',
      label: t('staffDashboard.statRejected'),
      value: stats?.rejected_this_month ?? 0,
      hint: null,
      tone: 'red',
    },
    {
      key: 'types',
      label: t('staffDashboard.statTypes'),
      value: stats?.assigned_types_count ?? 0,
      hint: t('staffDashboard.statTypesHint'),
      tone: 'slate',
    },
  ]

  const tones = {
    emerald: { card: 'border-emerald-200 bg-white hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-slate-950', val: 'text-emerald-700 dark:text-emerald-400', lbl: 'text-emerald-600 dark:text-emerald-400', hint: 'text-emerald-500 dark:text-emerald-600' },
    amber:   { card: 'border-amber-200 bg-white hover:bg-amber-50 dark:border-amber-900/50 dark:bg-slate-950', val: 'text-amber-700 dark:text-amber-400', lbl: 'text-amber-600 dark:text-amber-400', hint: 'text-amber-500 dark:text-amber-600' },
    blue:    { card: 'border-primary-200 bg-white hover:bg-primary-50 dark:border-primary-900/50 dark:bg-slate-950', val: 'text-primary-700 dark:text-primary-400', lbl: 'text-primary-600 dark:text-primary-400', hint: 'text-primary-500 dark:text-primary-600' },
    red:     { card: 'border-red-200 bg-white hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-950', val: 'text-red-700 dark:text-red-400', lbl: 'text-red-600 dark:text-red-400', hint: 'text-red-500 dark:text-red-600' },
    slate:   { card: 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950', val: 'text-slate-700 dark:text-slate-300', lbl: 'text-slate-500 dark:text-slate-400', hint: 'text-slate-400 dark:text-slate-500' },
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">

      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
          {t('staffDashboard.eyebrow')}
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
          {t('staffDashboard.greeting', { name: user?.name || '' })}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {t('staffDashboard.intro')}
        </p>
      </section>

      {/* Status banner */}
      {!loading && (
        <section className={`rounded-2xl border p-5 ${
          noAssigned
            ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/30'
            : hasPending
              ? 'border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20'
              : 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              noAssigned
                ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                : hasPending
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
            }`}>
              {noAssigned ? <ShieldCheck size={22} /> : hasPending ? <ClipboardList size={22} /> : <CheckCircle2 size={22} />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {noAssigned
                  ? t('staffDashboard.noAssignedTypes')
                  : hasPending
                    ? t('staffDashboard.hasPendingTitle', { count: stats?.pending_count })
                    : t('staffDashboard.noPendingTitle')}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                {noAssigned
                  ? t('staffDashboard.noAssignedTypesDesc')
                  : hasPending
                    ? t('staffDashboard.hasPendingDesc')
                    : t('staffDashboard.noPendingDesc')}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(({ key, label, value, hint, tone, onClick }) => {
          const p = tones[tone] || tones.slate
          return (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${p.card} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <p className={`text-xs font-semibold ${p.lbl}`}>{label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${p.val}`}>
                {loading ? <span className="inline-block h-7 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> : value}
              </p>
              {hint && <p className={`mt-1 text-[10px] ${p.hint}`}>{hint}</p>}
            </button>
          )
        })}
      </section>

      {/* Two-column: pending queue + notifications */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_0.5fr]">

        {/* Pending queue */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('staffDashboard.pendingQueueTitle')}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">{t('staffDashboard.pendingQueueDesc')}</p>
            </div>
            <Link
              to="/staff/approvals"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {t('staffDashboard.viewAllApprovals')}
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> {t('common.loading')}
            </div>
          ) : pending.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('staffDashboard.noPendingTitle')}
              </p>
              <p className="mt-1 text-xs text-slate-400">{t('staffDashboard.noPendingDesc')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '480px' }}>
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {[
                      t('staffDashboard.colTitle'),
                      t('staffDashboard.colOwner'),
                      t('staffDashboard.colType'),
                      t('staffDashboard.colDate'),
                      t('staffDashboard.colAction'),
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {pending.map(doc => {
                    const isApproving = actionLoading[doc.doc_id] === 'approve'
                    const isRejecting = actionLoading[doc.doc_id] === 'reject'
                    const busy = isApproving || isRejecting
                    return (
                      <tr key={doc.doc_id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
                        <td className="px-4 py-3.5 max-w-[180px]">
                          <p className="truncate font-medium text-slate-700 dark:text-slate-200" title={doc.title}>
                            {doc.title}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 max-w-[120px]">
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {doc.owner_name || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                            {doc.doc_type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                          {formatDate(doc.created_at || doc.upload_date, locale)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleApprove(doc.doc_id)}
                              disabled={busy}
                              title={t('staffDashboard.btnApprove')}
                              className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                            >
                              {isApproving
                                ? <Loader2 size={12} className="animate-spin" />
                                : <ThumbsUp size={12} />
                              }
                              {t('staffDashboard.btnApprove')}
                            </button>
                            <button
                              onClick={() => setRejectTarget(doc)}
                              disabled={busy}
                              title={t('staffDashboard.btnReject')}
                              className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
                            >
                              {isRejecting
                                ? <Loader2 size={12} className="animate-spin" />
                                : <ThumbsDown size={12} />
                              }
                              {t('staffDashboard.btnReject')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('dashboard.notifications')}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">{t('staffDashboard.notificationsDesc')}</p>
            </div>
            <Bell size={16} className="text-slate-400" />
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : notifs.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-slate-900">
              {t('common.noNotifications')}
            </p>
          ) : (
            <div className="space-y-2">
              {notifs.slice(0, 6).map(item => (
                <Link
                  key={item.notif_id}
                  to="/staff/approvals"
                  className="block rounded-xl bg-primary-50 p-3 transition-colors hover:bg-primary-100 dark:bg-primary-950/20 dark:hover:bg-primary-950/30"
                >
                  <p className="truncate text-xs font-semibold text-primary-900 dark:text-primary-200">
                    {item.doc_title || item.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-primary-700 dark:text-primary-300">
                    {item.message}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {rejectTarget && (
        <RejectModal
          doc={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleReject}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle, Search } from 'lucide-react'
import { faqService } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'

function FaqItem({ item }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.question}</span>
        {open
          ? <ChevronUp size={16} className="mt-0.5 shrink-0 text-slate-400" />
          : <ChevronDown size={16} className="mt-0.5 shrink-0 text-slate-400" />
        }
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.answer}</p>
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const { t } = useLanguage()
  const [grouped, setGrouped] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    faqService.getAll()
      .then(({ data }) => setGrouped(data.grouped || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = grouped.map(g => ({
    ...g,
    items: g.items.filter(item =>
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(g => g.items.length > 0)

  const totalCount = grouped.reduce((s, g) => s + g.items.length, 0)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <HelpCircle size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('helpPage.title')}</h1>
            <p className="mt-0.5 text-sm text-primary-100">{t('helpPage.desc')}</p>
          </div>
        </div>

        <div className="relative mt-5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white" strokeWidth={2.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('helpPage.searchPlaceholder')}
            className="w-full rounded-xl border border-white/30 bg-white/15 py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/70 transition-colors focus:border-white/50 focus:bg-white/20 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          {t('common.loading')}
        </div>
      ) : totalCount === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <HelpCircle size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">{t('helpPage.emptyTitle')}</p>
          <p className="mt-1 text-sm text-slate-400">{t('helpPage.emptyDesc')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-400">{t('helpPage.noResults', { search })}</p>
        </div>
      ) : (
        filtered.map(group => (
          <div key={group.category} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {group.category}
              </p>
            </div>
            {group.items.map(item => <FaqItem key={item.faq_id} item={item} />)}
          </div>
        ))
      )}
    </div>
  )
}

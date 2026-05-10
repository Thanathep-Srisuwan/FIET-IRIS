export default function StatCard({ label, value, icon, color = 'blue', sub }) {
  const colors = {
    blue:   'bg-fiet-blue/10 text-fiet-blue',
    orange: 'bg-fiet-orange/10 text-fiet-orange',
    red:    'bg-red-100 text-red-500',
    green:  'bg-emerald-100 text-emerald-600',
    slate:  'bg-slate-100 text-slate-500',
  }
  return (
    <div className="stat-card group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-110 duration-300 ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{value ?? '—'}</p>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1 font-medium">{sub}</p>}
      </div>
    </div>
  )
}

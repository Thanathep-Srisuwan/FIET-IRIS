export default function StatCard({ label, value, icon, color = 'blue', sub }) {
  const colors = {
    blue:   'bg-fiet-blue/10 text-fiet-blue',
    orange: 'bg-fiet-orange/10 text-fiet-orange',
    red:    'bg-red-100 text-red-500',
    green:  'bg-emerald-100 text-emerald-600',
    slate:  'bg-slate-100 text-slate-500',
  }
  return (
    <div className="stat-card">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

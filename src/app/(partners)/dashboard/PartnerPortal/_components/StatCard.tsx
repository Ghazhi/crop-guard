export function StatCard({ icon, label, value, sub, accent }: {
  icon:    React.ReactNode
  label:   string
  value:   string | number
  sub?:    string
  accent?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
           style={{ background: accent ?? 'var(--brand-mint)' }}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-2xl font-bold leading-tight" style={{ color: 'var(--brand-forest)' }}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

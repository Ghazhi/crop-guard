export function ChartCard({ title, children, className }: {
  title:      string
  children:   React.ReactNode
  className?: string
}) {
  return (
    <div className={['bg-white rounded-xl border border-gray-200 p-5 space-y-4', className].join(' ')}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
      {children}
    </div>
  )
}

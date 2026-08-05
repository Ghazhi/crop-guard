import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * StatCard — standard metric card used across all dashboards.
 *
 * Visual spec (matches design system):
 *  - White card, rounded-2xl, subtle shadow
 *  - Large rounded-[14px] icon square on the left
 *  - Bold value, label line, optional sub-label
 *  - Optional chevron-right for clickable cards
 */
export interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  /** Tailwind bg + text classes for the icon square, e.g. "bg-emerald-700 text-white" */
  color: string;
  /** Smaller text beneath the label */
  sub?: string;
  /** If provided, card becomes interactive with hover + chevron */
  onClick?: () => void;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, color, sub, onClick, className }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all group',
        className,
      )}
    >
      <div className={cn('w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-gray-900 leading-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-gray-500 mt-0.5 leading-snug">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {onClick && (
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
      )}
    </div>
  );
}

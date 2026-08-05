import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Layers, List } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  onLoadAll?: () => void;
  onResetPaging?: () => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, totalItems, pageSize, onLoadAll, onResetPaging, className }: PaginationProps) {
  const showPaging = totalPages > 1;
  const canToggle = onLoadAll && onResetPaging && totalItems != null && pageSize != null && totalItems > (pageSize);
  const allLoaded = totalPages <= 1 && canToggle;

  if (!showPaging && !canToggle) return null;

  const start = totalItems != null && pageSize != null ? (page - 1) * pageSize + 1 : null;
  const end = totalItems != null && pageSize != null ? Math.min(page * pageSize, totalItems) : null;

  return (
    <div className={cn('flex items-center justify-between gap-2 px-2 py-2 text-xs text-gray-500', className)}>
      <div className="flex items-center gap-1">
        {showPaging && (
          <>
            <button
              onClick={() => onPageChange(1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="First page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-medium text-gray-600">
              Page {page} <span className="text-gray-300">of</span> {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Last page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {canToggle && (
          <button
            onClick={allLoaded ? onResetPaging : onLoadAll}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors',
              showPaging && 'ml-2',
              allLoaded
                ? 'bg-cropguard-forest/5 text-cropguard-forest hover:bg-cropguard-forest/10'
                : 'bg-cropguard-forest/5 text-cropguard-forest hover:bg-cropguard-forest/10'
            )}
            title={allLoaded ? 'Return to paginated view' : 'Load all records on a single page'}
          >
            {allLoaded ? <List className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
            {allLoaded ? 'Show Paged' : 'Load All'}
          </button>
        )}
      </div>
      {start != null && end != null && totalItems != null && (
        <span className="text-gray-400">
          Showing {start}–{end} of {totalItems}
        </span>
      )}
    </div>
  );
}

export function usePagination<T>(items: T[], pageSize: number) {
  return {
    paginate: (page: number, all: T[]) => all.slice((page - 1) * pageSize, page * pageSize),
    totalPages: (all: T[]) => Math.max(1, Math.ceil(all.length / pageSize)),
  };
}

'use client'

import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function getPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  const lo = Math.max(2, current - 1)
  const hi = Math.min(total - 1, current + 1)
  for (let p = lo; p <= hi; p++) pages.push(p)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

export interface PaginationBarProps {
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
  onPageChange: (p: number) => void
  onPageSizeChange: (ps: number) => void
  className?: string
}

export function PaginationBar({
  page, pageSize, total,
  pageSizeOptions = [10, 25, 50, 100, 0],
  onPageChange, onPageSizeChange,
  className,
}: PaginationBarProps) {
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize

  if (total === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500', className)}>
      {/* Left: rows per page + count */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Per page</span>
        <select
          value={pageSize}
          onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1) }}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium outline-none focus:border-(--brand-green) cursor-pointer"
          style={{ color: 'var(--brand-forest)' }}
        >
          {pageSizeOptions.map(n => (
            <option key={n} value={n}>{n === 0 ? 'All' : n}</option>
          ))}
        </select>
        <span className="text-gray-400">
          {pageSize === 0
            ? `All ${total}`
            : `${start + 1}–${Math.min(start + pageSize, total)} of ${total}`}
        </span>
      </div>

      {/* Right: page buttons (hidden when showing all or single page) */}
      {pageSize !== 0 && totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(1)} disabled={page === 1}
            className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
            className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-0.5 mx-1">
            {getPageRange(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`e${i}`} className="w-7 text-center text-gray-400 select-none">…</span>
              ) : (
                <button key={p} onClick={() => onPageChange(p)}
                  className={cn('h-7 min-w-7 rounded-md px-1.5 font-medium transition-colors text-xs',
                    p === page ? 'text-white shadow-sm' : 'hover:bg-gray-100 text-gray-600')}
                  style={p === page ? { backgroundColor: 'var(--brand-forest)' } : {}}>
                  {p}
                </button>
              )
            )}
          </div>
          <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
            className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages}
            className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

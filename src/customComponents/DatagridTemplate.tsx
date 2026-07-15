'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-react'

export interface DatagridColumn<T> {
  /** Field in the row data this column reads by default (also used as the React key unless `id` is set) */
  key: keyof T
  /** Column header label */
  label: string
  /** Optional custom cell renderer */
  render?: (value: T[keyof T], row: T) => React.ReactNode
  /** Column width (e.g. '120px', '1fr') */
  width?: string
  /** Overrides the React key when two columns share the same `key` (e.g. both derive from the same field via `render`) */
  id?: string
}

export interface DatagridTemplateProps<T> {
  /** Column definitions */
  columns: DatagridColumn<T>[]
  /** Row data */
  data: T[]
  /** Unique key field for each row */
  rowKey: keyof T
  /** Rows per page options — include 0 to represent "All" */
  pageSizeOptions?: number[]
  /** Initial rows per page */
  defaultPageSize?: number
  /** 'paginate' shows numbered pages; 'load-more' appends rows on demand */
  mode?: 'paginate' | 'load-more'
  /** How many extra rows to append each "Load more" click (defaults to defaultPageSize) */
  loadMoreStep?: number
  /** Show when data is empty */
  emptyLabel?: string
  /** Whether data is loading */
  isLoading?: boolean
  /** Optional row click handler */
  onRowClick?: (row: T) => void
  className?: string
}

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100]

// Returns page numbers + '…' sentinels for the pagination strip
function pageRange(current: number, total: number): (number | '…')[] {
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

export function DatagridTemplate<T>({
  columns,
  data,
  rowKey,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  defaultPageSize = 10,
  mode = 'paginate',
  loadMoreStep,
  emptyLabel = 'No records found',
  isLoading = false,
  onRowClick,
  className,
}: DatagridTemplateProps<T>) {
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [shown,    setShown]    = useState(defaultPageSize) // load-more mode

  const step = loadMoreStep ?? defaultPageSize

  // ── Derived rows ────────────────────────────────────────────────────────────
  const rows = mode === 'load-more'
    ? data.slice(0, shown)
    : pageSize === 0
      ? data
      : data.slice((page - 1) * pageSize, page * pageSize)

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(data.length / pageSize))
  const start      = (page - 1) * pageSize
  const remaining  = data.length - shown

  function handlePageSize(e: React.ChangeEvent<HTMLSelectElement>) {
    setPageSize(Number(e.target.value))
    setPage(1)
  }

  // ── Table ───────────────────────────────────────────────────────────────────
  const tableBody = isLoading ? (
    Array.from({ length: Math.min(pageSize || 5, 5) }).map((_, i) => (
      <tr key={i} className="border-b border-gray-50 animate-pulse">
        {columns.map(col => (
          <td key={col.id ?? String(col.key)} className="px-4 py-3">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
          </td>
        ))}
      </tr>
    ))
  ) : rows.length === 0 ? (
    <tr>
      <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-400">
        {emptyLabel}
      </td>
    </tr>
  ) : (
    rows.map((row, i) => (
      <tr
        key={String(row[rowKey])}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        className={cn(
          'group border-b border-gray-100 transition-colors hover:bg-gray-200',
          i % 2 === 0 ? 'bg-white' : 'bg-gray-50',
          onRowClick && 'cursor-pointer',
        )}
      >
        {columns.map(col => (
          <td key={col.id ?? String(col.key)} className="px-4 py-3 text-sm text-gray-700">
            {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}
          </td>
        ))}
      </tr>
    ))
  )

  return (
    <div className={cn('flex flex-col gap-0', className)}>

      {/* ── Paginate footer ──────────────────────────────────────────────────── */}
      {mode === 'paginate' && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs text-gray-500">

          {/* Left: rows per page */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-400 whitespace-nowrap">Per page</span>
            <select
              value={pageSize}
              onChange={handlePageSize}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium outline-none focus:border-(--brand-green) cursor-pointer"
              style={{ color: 'var(--brand-forest)' }}
            >
              {pageSizeOptions.map(n => (
                <option key={n} value={n}>{n === 0 ? 'All' : n}</option>
              ))}
            </select>
            <span className="text-gray-400 whitespace-nowrap">
              {data.length === 0
                ? '0 records'
                : pageSize === 0
                  ? `All ${data.length} records`
                  : `${start + 1}–${Math.min(start + pageSize, data.length)} of ${data.length}`}
            </span>
          </div>

          {/* Right: page controls (hidden when showing all) */}
          {pageSize !== 0 && totalPages > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              {/* First */}
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                title="First page"
                className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              {/* Prev */}
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                title="Previous page"
                className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Numbered pages */}
              <div className="flex items-center gap-0.5 mx-1">
                {pageRange(page, totalPages).map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="w-7 text-center text-gray-400 select-none">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'h-7 min-w-7 rounded-md px-1.5 font-medium transition-colors text-xs',
                        p === page
                          ? 'text-white shadow-sm'
                          : 'hover:bg-gray-100 text-gray-600',
                      )}
                      style={p === page ? { backgroundColor: 'var(--brand-forest)' } : {}}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              {/* Next */}
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                title="Next page"
                className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              {/* Last */}
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                title="Last page"
                className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table — scrolls horizontally on narrow screens */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm [-webkit-overflow-scrolling:touch] scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              {columns.map(col => (
                <th
                  key={col.id ?? String(col.key)}
                  style={{ width: col.width } as React.CSSProperties}
                  className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{tableBody}</tbody>
        </table>
      </div>

      {/* ── Load-more footer ─────────────────────────────────────────────────── */}
      {mode === 'load-more' && !isLoading && data.length > 0 && (
        <div className="mt-3 flex flex-col items-center gap-2">
          {remaining > 0 && (
            <button
              onClick={() => setShown(s => s + step)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold transition-colors hover:bg-gray-50 active:scale-95"
              style={{ color: 'var(--brand-forest)' }}
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Load more ({remaining} remaining)
            </button>
          )}
          <p className="text-[11px] text-gray-400">
            Showing {rows.length} of {data.length} records
          </p>
        </div>
      )}
    </div>
  )
}

/*
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'

// Paginated (default)
<DatagridTemplate
  columns={columns}
  data={rows}
  rowKey="id"
  defaultPageSize={25}
  pageSizeOptions={[10, 25, 50, 100, 0]}   // 0 = "All"
  mode="paginate"
/>

// Load-more
<DatagridTemplate
  columns={columns}
  data={rows}
  rowKey="id"
  defaultPageSize={20}
  loadMoreStep={20}
  mode="load-more"
/>
*/

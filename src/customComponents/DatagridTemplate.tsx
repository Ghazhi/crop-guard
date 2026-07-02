import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface DatagridColumn<T> {
  /** Unique key matching a field in the row data */
  key: keyof T
  /** Column header label */
  label: string
  /** Optional custom cell renderer */
  render?: (value: T[keyof T], row: T) => React.ReactNode
  /** Column width (e.g. '120px', '1fr') */
  width?: string
}

export interface DatagridTemplateProps<T> {
  /** Column definitions */
  columns: DatagridColumn<T>[]
  /** Row data */
  data: T[]
  /** Unique key field for each row */
  rowKey: keyof T
  /** Rows per page options */
  pageSizeOptions?: number[]
  /** Initial rows per page */
  defaultPageSize?: number
  /** Show when data is empty */
  emptyLabel?: string
  /** Whether data is loading */
  isLoading?: boolean
  /** Optional row click handler */
  onRowClick?: (row: T) => void
  className?: string
}

const DEFAULT_PAGE_SIZES = [10, 25, 50]

export function DatagridTemplate<T>({
  columns,
  data,
  rowKey,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  defaultPageSize = 10,
  emptyLabel = 'No records found',
  isLoading = false,
  onRowClick,
  className,
}: DatagridTemplateProps<T>) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const start = (page - 1) * pageSize
  const rows = data.slice(start, start + pageSize)

  function handlePageSize(e: React.ChangeEvent<HTMLSelectElement>) {
    setPageSize(Number(e.target.value))
    setPage(1)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100" style={{ backgroundColor: 'var(--brand-mint)' }}>
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width, color: 'var(--brand-forest)' } as React.CSSProperties}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 animate-pulse">
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-gray-400"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={String(row[rowKey])}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-gray-50 transition-colors hover:bg-gray-50',
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-4 py-3 text-gray-700">
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={handlePageSize}
            className="rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-(--brand-green)"
          >
            {pageSizeOptions.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span>
            {data.length === 0 ? '0' : `${start + 1}–${Math.min(start + pageSize, data.length)}`} of {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded p-1 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded p-1 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/*
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'

interface Farmer {
  id: string
  name: string
  crop: string
  risk: string
  status: string
}

const columns: DatagridColumn<Farmer>[] = [
  { key: 'name',   label: 'Farmer Name', width: '200px' },
  { key: 'crop',   label: 'Crop' },
  { key: 'risk',   label: 'Risk Level', render: (val) => <BadgeTemplate label={String(val)} variant="warning" /> },
  { key: 'status', label: 'Status' },
]

<DatagridTemplate
  columns={columns}
  data={farmers}
  rowKey="id"
  defaultPageSize={25}
  pageSizeOptions={[10, 25, 50]}
  isLoading={loading}
  emptyLabel="No farmers found"
/>
*/

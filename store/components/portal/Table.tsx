'use client'

import React from 'react'
import { MinusMini } from '@medusajs/icons'

/* ─── Column Definition ─── */
export interface TableColumn {
  key: string
  label: React.ReactNode
  width?: string            // e.g. "25%"
  align?: 'left' | 'center' | 'right'
  // Existing shared table accepts heterogeneous page-specific row models.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: any, index: number) => React.ReactNode
}

/* ─── Pagination ─── */
export interface TablePaginationProps {
  count: number
  pageSize: number
  pageIndex: number
  pageCount: number
  onPageChange?: (pageIndex: number) => void
}

/* ─── Table Props ─── */
interface DataTableProps {
  columns: TableColumn[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[]
  pagination?: TablePaginationProps
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowClick?: (row: any, index: number) => void
  variant?: 'default' | 'figma' | 'documents'
}

export default function DataTable({ columns, data, pagination, className = '', onRowClick, variant = 'default' }: DataTableProps) {
  const isFigma = variant === 'figma'
  const isDocuments = variant === 'documents'
  const alignClass = (align: TableColumn['align']) =>
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'

  return (
    <div className={`${isFigma ? 'overflow-hidden rounded-lg border border-[#e0e0e0] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]' : isDocuments ? '' : 'border border-neutral-200 rounded-lg'} ${className}`}>
      <div className={isDocuments ? 'overflow-hidden rounded-lg border border-[#e0e0e0]' : ''}>
        <table className="w-full border-collapse">
        {/* Header */}
        <thead>
          <tr className={isFigma || isDocuments ? 'h-12 bg-[#eeeeee]' : 'bg-neutral-50'}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`${alignClass(col.align)} ${
                  isFigma || isDocuments
                    ? `px-6 text-[13px] leading-[1.1] text-[#1c1c1c] ${
                        isDocuments ? 'font-normal' : 'font-medium'
                      }`
                    : 'border-b border-neutral-200 px-3 py-3.5 text-[11px] font-semibold uppercase tracking-tight text-neutral-400'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick?.(row, rowIndex)}
              className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-neutral-100' : 'hover:bg-neutral-100/60'} ${
                rowIndex % 2 === 0
                  ? 'bg-white'
                  : isFigma
                    ? 'bg-[rgba(28,28,28,0.04)]'
                    : isDocuments
                      ? 'bg-[rgba(28,28,28,0.02)]'
                      : 'bg-neutral-50/60'
              } ${!isFigma && !isDocuments && rowIndex < data.length - 1 ? 'border-b border-neutral-100' : ''} ${
                isFigma ? 'h-12' : isDocuments ? 'h-20' : ''
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{ width: col.width }}
                  className={`${alignClass(col.align)} ${
                    isFigma || isDocuments
                      ? 'px-6 text-[13px] leading-[1.1] text-[#424242]'
                      : 'px-3 py-3.5 text-xs'
                  }`}
                >
                  {col.render ? col.render(row[col.key], row, rowIndex) : (
                    <span className="text-neutral-700">
                      {String(row[col.key] ?? '')}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className={`flex items-center justify-between bg-white ${
          isFigma || isDocuments ? 'px-4 py-4' : 'border-t border-neutral-200 px-6 py-3.5'
        }`}>
          <span className={isFigma || isDocuments ? 'flex items-center gap-1 text-[13px] leading-[1.1] text-[#757575]' : 'text-[11px] text-neutral-400 font-medium'}>
            {pagination.pageIndex * pagination.pageSize + 1}
            {isDocuments ? (
              <MinusMini className="size-3.75" />
            ) : (
              <span>—</span>
            )}
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.count)} of{' '}
            {pagination.count} results
          </span>
          {isDocuments ? (
            <div className="flex items-center gap-2">
              <span className="flex h-7 items-center rounded-md px-2 text-[13px] leading-[1.1] text-[#757575]">
                {pagination.pageIndex + 1} of {pagination.pageCount} pages
              </span>
              <button
                type="button"
                disabled={pagination.pageIndex === 0}
                className="flex h-7 items-center rounded-md px-2 text-[13px] leading-[1.1] text-[#757575] disabled:text-[#a5a5a5]"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={pagination.pageIndex + 1 >= pagination.pageCount}
                className="flex h-7 items-center rounded-md px-2 text-[13px] leading-[1.1] text-[#757575] disabled:text-[#a5a5a5]"
              >
                Next
              </button>
            </div>
          ) : pagination.onPageChange ? (
            <div className="flex items-center gap-2">
              <span className={isFigma ? 'text-[13px] leading-[1.1] text-[#757575]' : 'text-[11px] text-neutral-400 font-medium'}>
                {pagination.pageIndex + 1} of {pagination.pageCount} pages
              </span>
              <button
                type="button"
                onClick={() => pagination.onPageChange?.(pagination.pageIndex - 1)}
                disabled={pagination.pageIndex === 0}
                className="flex h-7 items-center rounded-md px-2 text-[13px] leading-[1.1] text-[#757575] hover:bg-neutral-100 disabled:text-[#a5a5a5] disabled:hover:bg-transparent"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => pagination.onPageChange?.(pagination.pageIndex + 1)}
                disabled={pagination.pageIndex + 1 >= pagination.pageCount}
                className="flex h-7 items-center rounded-md px-2 text-[13px] leading-[1.1] text-[#757575] hover:bg-neutral-100 disabled:text-[#a5a5a5] disabled:hover:bg-transparent"
              >
                Next
              </button>
            </div>
          ) : (
            <span className={isFigma ? 'text-[13px] leading-[1.1] text-[#757575]' : 'text-[11px] text-neutral-400 font-medium'}>
              {pagination.pageIndex + 1} of {pagination.pageCount} pages
            </span>
          )}
        </div>
      )}
    </div>
  )
}

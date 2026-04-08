import React, { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
  type CellContext,
} from '@tanstack/react-table'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  width?: string
  sortable?: boolean
}

interface Action<T> {
  label: string
  onClick: (item: T) => void
  variant?: 'default' | 'danger'
  hidden?: (item: T) => boolean
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  pagination?: PaginationInfo
  onPageChange?: (page: number) => void
  actions?: Action<T>[]
  isLoading?: boolean
  searchable?: boolean
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  pagination,
  onPageChange,
  actions,
  isLoading,
  searchable,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columnDefs = useMemo<ColumnDef<T, unknown>[]>(() => {
    const dataCols: ColumnDef<T, unknown>[] = columns.map((col) => ({
      id: col.key,
      header: col.header,
      accessorFn: (row: T) => row[col.key],
      enableSorting: col.sortable ?? !col.render,
      cell: col.render
        ? (info: CellContext<T, unknown>) => col.render!(info.row.original)
        : (info: CellContext<T, unknown>) => String(info.getValue() ?? ''),
    }))

    if (actions && actions.length > 0) {
      dataCols.push({
        id: '__actions',
        header: 'Azioni',
        enableSorting: false,
        cell: (info: CellContext<T, unknown>) => {
          const item = info.row.original
          const visible = actions.filter((a) => !a.hidden?.(item))
          if (visible.length === 0) return null
          return (
            <div className="flex items-center justify-end gap-2">
              {visible.map((action) => (
                <button
                  key={action.label}
                  onClick={() => action.onClick(item)}
                  className={[
                    'min-h-9 border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors',
                    action.variant === 'danger'
                      ? 'border-[#F1D3D3] text-[#B42318] hover:bg-[#FFF5F5]'
                      : 'border-[#E5E0D8] text-[#031634] hover:border-[#C9A96E] hover:text-[#C9A96E]',
                  ].join(' ')}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )
        },
      } as ColumnDef<T, unknown>)
    }

    return dataCols
  }, [columns, actions])

  const table = useReactTable<T>({
    data,
    columns: columnDefs,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: !!pagination,
    enableSortingRemoval: true,
  })

  const totalCols = columns.length + (actions && actions.length > 0 ? 1 : 0)

  return (
    <div className="overflow-hidden border border-[#E5E0D8] bg-white shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
      {/* Ricerca globale opzionale — disabilitata se la paginazione è server-side */}
      {searchable && !pagination && (
        <div className="border-b border-[#E5E0D8] px-4 py-3">
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cerca…"
            className="admin-input w-64"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[#E5E0D8] bg-[#F8F7F4]">
                {headerGroup.headers.map((header) => {
                  const col = columns.find((c) => c.key === header.id)
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  const isActions = header.id === '__actions'

                  return (
                    <th
                      key={header.id}
                      style={{ width: col?.width }}
                      tabIndex={canSort ? 0 : undefined}
                      role={canSort ? 'button' : undefined}
                      onKeyDown={canSort ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          header.column.getToggleSortingHandler()?.(e as unknown as MouseEvent)
                        }
                      } : undefined}
                      className={[
                        'px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#6B7280]',
                        isActions ? 'text-right' : 'text-left',
                        canSort ? 'cursor-pointer select-none hover:text-[#1A2B4A]' : '',
                      ].join(' ')}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-[10px] opacity-50">
                            {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '⇅'}
                          </span>
                        )}
                      </span>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={totalCols} className="py-12 text-center text-[#6B7280]">
                  <div className="flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A2B4A] border-t-transparent" />
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="py-12 text-center text-[#6B7280]">
                  Nessun risultato
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={String(row.original[keyField])}
                  className="border-b border-[#E5E0D8] last:border-0 transition-colors hover:bg-[#FCFBF8]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={[
                        'px-4 py-3 text-[#1A1A1A]',
                        cell.column.id === '__actions' ? 'text-right' : '',
                      ].join(' ')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginazione server-side */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#E5E0D8] bg-[#F8F7F4] px-4 py-3">
          <span className="text-xs text-[#6B7280]">
            {pagination.total} risultati — pagina {pagination.page} di {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="min-h-9 border border-[#E5E0D8] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E] disabled:opacity-40"
            >
              ← Prec
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="min-h-9 border border-[#E5E0D8] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E] disabled:opacity-40"
            >
              Succ →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

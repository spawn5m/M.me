interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  width?: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface Action<T> {
  label: string
  onClick: (item: T) => void
  variant?: 'default' | 'danger'
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  pagination?: PaginationInfo
  onPageChange?: (page: number) => void
  actions?: Action<T>[]
  isLoading?: boolean
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  pagination,
  onPageChange,
  actions,
  isLoading
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E0D8] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E0D8] bg-[#F8F7F4]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="text-right px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">
                  Azioni
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center py-12 text-[#6B7280]"
                >
                  <div className="flex justify-center">
                    <div className="w-6 h-6 border-2 border-[#1A2B4A] border-t-transparent rounded-full animate-spin" />
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center py-12 text-[#6B7280]"
                >
                  Nessun risultato
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={String(item[keyField])}
                  className="border-b border-[#E5E0D8] last:border-0 hover:bg-[#F8F7F4] transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-[#1A1A1A]">
                      {col.render ? col.render(item) : String(item[col.key] ?? '')}
                    </td>
                  ))}
                  {actions && actions.length > 0 && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {actions.map((action) => (
                          <button
                            key={action.label}
                            onClick={() => action.onClick(item)}
                            className={[
                              'text-xs px-3 py-1.5 rounded transition-colors',
                              action.variant === 'danger'
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-[#1A2B4A] hover:bg-[#E5E0D8]'
                            ].join(' ')}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E0D8] bg-[#F8F7F4]">
          <span className="text-xs text-[#6B7280]">
            {pagination.total} risultati — pagina {pagination.page} di {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-xs rounded border border-[#E5E0D8] text-[#1A2B4A] disabled:opacity-40 hover:bg-white transition-colors"
            >
              ← Prec
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 text-xs rounded border border-[#E5E0D8] text-[#1A2B4A] disabled:opacity-40 hover:bg-white transition-colors"
            >
              Succ →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

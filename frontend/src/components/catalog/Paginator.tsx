interface PaginatorProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Paginator({
  currentPage,
  totalPages,
  onPageChange,
}: PaginatorProps) {
  if (totalPages <= 1) return null

  // Build page numbers array with ellipsis logic
  function getPages(): (number | '...')[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | '...')[] = [1]
    if (currentPage > 3) pages.push('...')
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  const pages = getPages()

  const btnBase =
    'w-9 h-9 flex items-center justify-center text-sm font-medium transition-colors duration-150'
  const btnActive = `${btnBase} bg-[#031634] text-white`
  const btnOutlined = `${btnBase} border border-[#E5E0D8] text-[#031634] hover:border-[#C9A96E] hover:text-[#C9A96E]`
  const btnNav = `${btnBase} border border-[#E5E0D8] text-[#031634] hover:border-[#C9A96E] hover:text-[#C9A96E] disabled:opacity-40 disabled:cursor-not-allowed`

  return (
    <nav
      aria-label="Paginazione"
      className="flex items-center justify-center gap-1 py-8"
    >
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={btnNav}
        aria-label="Pagina precedente"
      >
        ‹
      </button>

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="w-9 h-9 flex items-center justify-center text-[#44474e] text-sm"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={page === currentPage ? btnActive : btnOutlined}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={btnNav}
        aria-label="Pagina successiva"
      >
        ›
      </button>
    </nav>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientApi } from '../../lib/api/client'

interface CatalogItem {
  id: string
  code: string
  description: string
  price: number | null
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function MarmistaClientCatalogPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CatalogItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
  }

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = { page: String(page), pageSize: '50' }
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
    clientApi.catalog.marmista(params)
      .then(res => {
        setItems(res.data)
        setPagination(res.pagination)
        setWarning(res.warning ?? null)
        setError(null)
      })
      .catch(() => setError('Impossibile caricare il catalogo.'))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch])

  return (
    <div className="space-y-4">
      <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#1A2B4A]">
        Catalogo Marmista
      </h1>

      {warning && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-[6px] text-amber-800 text-sm">
          Nessun listino assegnato — i prezzi non sono disponibili.
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-[6px] text-red-700 text-sm">
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="Cerca per codice o descrizione..."
        value={search}
        onChange={e => handleSearchChange(e.target.value)}
        className="w-full max-w-sm border border-[#E5E0D8] rounded-[6px] px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#6B7280] focus:outline-none focus:border-[#1A2B4A]"
      />

      <div className="bg-white border border-[#E5E0D8] rounded-[8px] shadow-[0_2px_8px_rgba(26,43,74,0.08)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F7F4] border-b border-[#E5E0D8]">
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] uppercase tracking-wider text-xs">
                Codice
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] uppercase tracking-wider text-xs">
                Descrizione
              </th>
              <th className="text-right px-4 py-3 font-medium text-[#6B7280] uppercase tracking-wider text-xs">
                Prezzo
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-10 text-[#6B7280]">
                  Caricamento...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-10 text-[#6B7280]">
                  Nessun articolo trovato.
                </td>
              </tr>
            ) : (
              items.map((item, i) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/client/catalog/marmista/${item.id}`)}
                  className={`cursor-pointer hover:bg-[#F8F7F4] transition-colors ${
                    i !== items.length - 1 ? 'border-b border-[#E5E0D8]' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-['JetBrains_Mono'] text-[#1A2B4A] font-medium">
                    {item.code}
                  </td>
                  <td className="px-4 py-3 text-[#1A1A1A]">{item.description}</td>
                  <td className="px-4 py-3 text-right font-['JetBrains_Mono'] text-[#1A1A1A]">
                    {item.price != null
                      ? `€ ${item.price.toFixed(2)}`
                      : <span className="text-[#6B7280]">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center gap-3 justify-end text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 border border-[#E5E0D8] rounded-[6px] text-[#1A2B4A] disabled:opacity-40 hover:bg-[#F8F7F4] transition-colors"
          >
            ← Precedente
          </button>
          <span className="text-[#6B7280]">
            Pagina {page} di {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 border border-[#E5E0D8] rounded-[6px] text-[#1A2B4A] disabled:opacity-40 hover:bg-[#F8F7F4] transition-colors"
          >
            Successiva →
          </button>
        </div>
      )}
    </div>
  )
}

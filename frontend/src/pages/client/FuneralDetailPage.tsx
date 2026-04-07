import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { clientApi } from '../../lib/api/client'

interface FuneralDetail {
  id: string
  code: string
  description: string
  price: number | null
  measures?: unknown[]
  categories?: Array<{ code: string }>
  subcategories?: Array<{ code: string }>
}

export default function FuneralDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<FuneralDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    clientApi.catalog.funeralDetail(id)
      .then(setItem)
      .catch(() => setError('Articolo non trovato.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="text-[#6B7280] py-10 text-center">Caricamento...</div>
  }

  if (error || !item) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-[6px] text-red-700 text-sm">
        {error ?? 'Articolo non trovato.'}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          to="/client/catalog/funeral"
          className="text-sm text-[#6B7280] hover:text-[#1A2B4A] transition-colors"
        >
          ← Torna al catalogo
        </Link>
      </div>

      <div className="bg-white border border-[#E5E0D8] rounded-[8px] p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)] space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-1">Codice</p>
          <p className="font-['JetBrains_Mono'] text-lg font-semibold text-[#1A2B4A]">{item.code}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-1">Descrizione</p>
          <p className="font-['Playfair_Display'] text-xl text-[#1A1A1A]">{item.description}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-1">Prezzo</p>
          <p className="font-['JetBrains_Mono'] text-2xl font-bold text-[#1A2B4A]">
            {item.price != null ? `€ ${item.price.toFixed(2)}` : <span className="text-[#6B7280] text-base font-normal">Non disponibile</span>}
          </p>
        </div>

        {item.categories && item.categories.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-2">Categorie</p>
            <div className="flex flex-wrap gap-2">
              {item.categories.map(c => (
                <span key={c.code} className="px-2 py-1 bg-[#F8F7F4] border border-[#E5E0D8] rounded-[6px] text-xs text-[#1A2B4A]">
                  {c.code}
                </span>
              ))}
            </div>
          </div>
        )}

        {item.subcategories && item.subcategories.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-2">Sottocategorie</p>
            <div className="flex flex-wrap gap-2">
              {item.subcategories.map(s => (
                <span key={s.code} className="px-2 py-1 bg-[#F8F7F4] border border-[#E5E0D8] rounded-[6px] text-xs text-[#1A2B4A]">
                  {s.code}
                </span>
              ))}
            </div>
          </div>
        )}

        {item.measures && item.measures.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-2">Misure disponibili</p>
            <p className="text-sm text-[#1A1A1A]">{item.measures.length} misure disponibili</p>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { clientApi } from '../../lib/api/client'
import PdfViewer from '../../components/client/PdfViewer'

const CATALOG_PDF_URL = '/uploads/pdf/CATALOGO CEABIS 2024.pdf'

interface Accessory {
  id: string
  code: string
  description: string
  paginaPdf?: number | null
}

interface MarmistaDetail {
  id: string
  code: string
  description: string
  price: number | null
  accessories?: Accessory[]
}

export default function MarmistaClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<MarmistaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    clientApi.catalog.marmistaDetail(id)
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
      <Link
        to="/client/catalog/marmista"
        className="text-sm text-[#6B7280] hover:text-[#1A2B4A] transition-colors"
      >
        ← Torna al catalogo
      </Link>

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
            {item.price != null
              ? `€ ${item.price.toFixed(2)}`
              : <span className="text-[#6B7280] text-base font-normal">Non disponibile</span>}
          </p>
        </div>
      </div>

      {item.accessories && item.accessories.length > 0 && (
        <div className="bg-white border border-[#E5E0D8] rounded-[8px] p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-3">
            Accessori collegati
          </p>
          <div className="space-y-2">
            {item.accessories.map(acc => (
              <div
                key={acc.id}
                className="py-2 border-b border-[#E5E0D8] last:border-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-['JetBrains_Mono'] text-sm text-[#1A2B4A] font-medium mr-3">
                      {acc.code}
                    </span>
                    <span className="text-sm text-[#1A1A1A]">{acc.description}</span>
                  </div>
                  {acc.paginaPdf != null && (
                    <span className="text-xs text-[#C9A96E] font-medium whitespace-nowrap ml-4">
                      Catalogo pag. {acc.paginaPdf}
                    </span>
                  )}
                </div>
                {acc.paginaPdf != null && (
                  <div className="mt-4">
                    <PdfViewer url={CATALOG_PDF_URL} initialPage={acc.paginaPdf} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { clientApi } from '../../lib/api/client'

interface MeData {
  funeralPriceList: { id: string; name: string } | null
  marmistaPriceList: { id: string; name: string } | null
  manager: { name: string; email: string } | null
}

export default function ClientDashboard() {
  const [data, setData] = useState<MeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    clientApi.me()
      .then(setData)
      .catch(() => setError('Impossibile caricare i dati del profilo.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-[#6B7280]">
        Caricamento...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-[6px] text-red-700 text-sm">
        {error}
      </div>
    )
  }

  const hasFuneral = data?.funeralPriceList != null
  const hasMarmista = data?.marmistaPriceList != null

  return (
    <div className="space-y-6">
      <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#1A2B4A]">
        Dashboard
      </h1>

      {/* Listini assegnati */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Listino Funebre */}
        <div className="bg-white border border-[#E5E0D8] rounded-[8px] p-5 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-1">
            Listino Funebre
          </p>
          {hasFuneral ? (
            <>
              <p className="font-['Playfair_Display'] text-lg font-semibold text-[#1A2B4A] mb-3">
                {data!.funeralPriceList!.name}
              </p>
              <Link
                to="/client/catalog/funeral"
                className="inline-block text-sm font-medium text-[#1A2B4A] border border-[#1A2B4A] rounded-[6px] px-4 py-1.5 hover:bg-[#1A2B4A] hover:text-white transition-colors"
              >
                Sfoglia catalogo
              </Link>
            </>
          ) : (
            <p className="text-sm text-[#6B7280]">Nessun listino assegnato</p>
          )}
        </div>

        {/* Listino Marmista */}
        <div className="bg-white border border-[#E5E0D8] rounded-[8px] p-5 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-1">
            Listino Marmista
          </p>
          {hasMarmista ? (
            <>
              <p className="font-['Playfair_Display'] text-lg font-semibold text-[#1A2B4A] mb-3">
                {data!.marmistaPriceList!.name}
              </p>
              <Link
                to="/client/catalog/marmista"
                className="inline-block text-sm font-medium text-[#1A2B4A] border border-[#1A2B4A] rounded-[6px] px-4 py-1.5 hover:bg-[#1A2B4A] hover:text-white transition-colors"
              >
                Sfoglia catalogo
              </Link>
            </>
          ) : (
            <p className="text-sm text-[#6B7280]">Nessun listino assegnato</p>
          )}
        </div>
      </div>

      {/* Referente */}
      {data?.manager && (
        <div className="bg-white border border-[#E5E0D8] rounded-[8px] p-5 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B7280] mb-2">
            Il tuo referente
          </p>
          <p className="text-[#1A1A1A] font-medium">{data.manager.name}</p>
          <a
            href={`mailto:${data.manager.email}`}
            className="text-sm text-[#C9A96E] hover:underline"
          >
            {data.manager.email}
          </a>
        </div>
      )}
    </div>
  )
}

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMarmista } from '../hooks/useMarmista'
import { useAuth } from '../hooks/useAuth'
import AccessoriesView from '../components/catalog/AccessoriesView'
import OffertaMeseCard from '../components/catalog/OffertaMeseCard'

export default function MarmistiPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isMarmista = user?.role === 'marmista'
  const { items, loading } = useMarmista()

  const catalogItems = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        code: item.code,
        description: item.description,
        notes: item.notes,
        categories: item.categories,
        pdfPage: item.pdfPage,
        price: item.publicPrice,
      })),
    [items]
  )

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Page header */}
      <div className="pt-24 pb-10 px-6 md:px-12 lg:px-20 border-b border-[#E5E0D8]">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#C9A96E] mb-3">
          {t('nav.marmistas')}
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-[#031634] leading-tight">
          {t('catalog.marmista')}
        </h1>
        <p className="mt-3 text-[#6B7280] text-base max-w-2xl">
          Semilavorati in marmo e granito di prima scelta. Consegne puntuali in tutta la Sardegna.
          Prezzi pubblici indicativi — per preventivi personalizzati contattaci.
        </p>
      </div>

      {/* Catalog — split PDF view */}
      <section className="px-6 md:px-12 lg:px-20 py-10">
        <AccessoriesView
          items={catalogItems}
          loading={loading}
          showPrice={true}
          catalogPdfUrl="/uploads/pdf/VEZZANI%20CATALOGO%202026.pdf"
        />
      </section>

      {/* Offerta del mese — visibile solo ai marmisti autenticati */}
      {isMarmista && catalogItems[0] && (
        <section className="bg-[#F4F3F0] border-t border-[#C9A96E] px-6 md:px-12 lg:px-20 py-10">
          <OffertaMeseCard item={catalogItems[0]} />
        </section>
      )}
    </div>
  )
}

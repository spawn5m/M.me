import { useTranslation } from 'react-i18next'
import type { CatalogViewItem } from './AccessoriesView'

interface OffertaMeseCardProps {
  item: CatalogViewItem & { imageUrl?: string }
}

export default function OffertaMeseCard({ item }: OffertaMeseCardProps) {
  const { t } = useTranslation()

  return (
    <div className="w-1/2 mx-auto bg-white border border-[#E5E0D8]">
      {/* Header card */}
      <div className="px-6 py-5 border-b border-[#E5E0D8]">
        <h1 className="font-serif text-3xl text-[#031634] mb-3">
          {t('catalog.offerOfMonth')}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] font-bold text-[#C9A96E] tracking-widest uppercase bg-[#C9A96E]/10 px-2.5 py-1">
            {item.code}
          </span>
          {item.notes && (
            <p className="text-sm text-[#6B7280] italic">{item.notes}</p>
          )}
        </div>
      </div>

      {/* Corpo — due colonne */}
      <div className="grid grid-cols-2">

        {/* 1/2 — Immagine */}
        <div className="bg-[#F4F3F0] flex items-center justify-center min-h-[280px]">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.description}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[#6B7280]">
              <svg
                className="w-12 h-12 opacity-30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="0" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-xs tracking-widest uppercase">
                {t('catalog.imageNotAvailable')}
              </span>
            </div>
          )}
        </div>

        {/* 2/2 — Dati prodotto + CTA */}
        <div className="px-8 py-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-serif text-2xl text-[#031634] leading-snug">
              {item.description}
            </h3>

            {item.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.categories.map((cat) => (
                  <span
                    key={cat}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#031634] bg-[#F4F3F0] px-2.5 py-1"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {item.price !== undefined && (
              <div className="pt-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B7280] mb-1">
                  {t('catalog.publicPrice')}
                </p>
                <p className="font-mono text-3xl font-bold text-[#031634]">
                  € {item.price.toFixed(2)}
                </p>
              </div>
            )}

            {item.pdfPage !== undefined && (
              <p className="text-xs text-[#6B7280]">
                {t('catalog.pdfPage')} <span className="font-mono font-bold text-[#031634]">{item.pdfPage}</span>
              </p>
            )}
          </div>

          <div className="pt-6">
            <button className="w-full border border-[#031634] text-[#031634] text-sm font-medium uppercase tracking-[0.12em] py-3 px-6 hover:bg-[#031634] hover:text-white transition-colors duration-200 cursor-pointer">
              {t('catalog.contactAgent')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

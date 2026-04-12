import { useTranslation } from 'react-i18next'

interface ProductCardProps {
  description: string
  notes?: string
  imageUrl?: string
  badge?: string
  showPrice?: boolean
  price?: number | null
  purchasePrice?: number | null
  onClick: () => void
}

export default function ProductCard({
  description,
  notes,
  imageUrl,
  badge,
  showPrice,
  price,
  purchasePrice,
  onClick,
}: ProductCardProps) {
  const { t } = useTranslation()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="relative bg-white p-6 cursor-pointer ring-1 ring-transparent hover:ring-[#C9A96E] hover:shadow-[0_4px_24px_rgba(201,169,110,0.12)] transition-all duration-200"
    >
      {/* Badge */}
      {badge && (
        <div className="absolute top-4 left-4 z-10 bg-[#031634] text-white px-3 py-1 text-xs font-bold uppercase tracking-widest font-inter">
          {badge}
        </div>
      )}

      {/* Immagine */}
      <div className="aspect-[4/3] bg-[#F4F3F0] mb-4 overflow-hidden p-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={description}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full bg-[#F4F3F0]" />
        )}
      </div>

      {/* Titolo */}
      <h3 className="font-semibold text-lg text-[#031634] hover:text-[#C9A96E] transition-colors duration-150 leading-snug mb-1">
        {description}
      </h3>

      {/* Note */}
      {notes && (
        <p className="text-sm italic text-[#44474e] line-clamp-1">{notes}</p>
      )}

      {showPrice && price !== undefined && (
        <div className="mt-4 text-right">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6B7280]">
            {t('catalog.priceListPrice')}
          </p>
          {purchasePrice != null && (
            <p className="mt-0.5 font-mono text-[11px] font-semibold text-red-600">
              acq. € {purchasePrice.toFixed(2)}
            </p>
          )}
          <p className="mt-0.5 font-mono text-xl font-bold text-[#C9A96E]">
            {price != null ? (
              `€ ${price.toFixed(2)}`
            ) : (
              <span className="font-sans text-sm font-medium text-[#6B7280]">
                {t('catalog.priceUnavailable')}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

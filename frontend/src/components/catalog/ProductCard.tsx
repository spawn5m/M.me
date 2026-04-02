interface ProductCardProps {
  code: string
  description: string
  notes?: string
  imageUrl?: string
  badge?: string
  showPrice?: boolean
  price?: number
  onClick: () => void
}

export default function ProductCard({
  code,
  description,
  notes,
  imageUrl,
  badge,
  showPrice,
  price,
  onClick,
}: ProductCardProps) {
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
      <div className="aspect-[4/3] bg-[#EDE9E3] mb-4 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={description}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#EDE9E3]" />
        )}
      </div>

      {/* Codice */}
      <p className="font-mono text-xs text-[#44474e] mb-2 tracking-wide">
        {code}
      </p>

      {/* Titolo */}
      <h3 className="font-semibold text-lg text-[#031634] hover:text-[#C9A96E] transition-colors duration-150 leading-snug mb-1">
        {description}
      </h3>

      {/* Note */}
      {notes && (
        <p className="text-sm italic text-[#44474e] line-clamp-1">{notes}</p>
      )}

      {/* Prezzo */}
      {showPrice && price !== undefined && (
        <p className="font-mono text-xl font-bold text-[#C9A96E] mt-3">
          € {price.toFixed(2)}
        </p>
      )}
    </div>
  )
}

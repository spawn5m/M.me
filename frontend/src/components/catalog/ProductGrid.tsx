import { useTranslation } from 'react-i18next'
import ProductCard from './ProductCard'

interface GridItem {
  id: string
  code: string
  description: string
  notes?: string
  imageUrl?: string
  badge?: string
  price?: number | null
  purchasePrice?: number | null
}

interface ProductGridProps {
  items: GridItem[]
  showPrice?: boolean
  onItemClick: (id: string) => void
  loading?: boolean
  columns?: 3 | 4
}

function SkeletonCard() {
  return (
    <div className="bg-white p-6 animate-pulse">
      <div className="aspect-[4/3] bg-[#EDE9E3] mb-4" />
      <div className="h-3 bg-[#EDE9E3] rounded mb-2 w-1/3" />
      <div className="h-5 bg-[#EDE9E3] rounded mb-2 w-3/4" />
      <div className="h-4 bg-[#EDE9E3] rounded w-1/2" />
    </div>
  )
}

export default function ProductGrid({
  items,
  showPrice,
  onItemClick,
  loading,
  columns = 3,
}: ProductGridProps) {
  const { t } = useTranslation()
  const gridCols = columns === 4
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'

  if (loading) {
    return (
      <div className={`grid ${gridCols} gap-10`}>
        {Array.from({ length: columns === 4 ? 8 : 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-[#44474e] text-base">
        {t('catalog.noResults')}
      </div>
    )
  }

  return (
    <div className={`grid ${gridCols} gap-10`}>
      {items.map((item) => (
        <ProductCard
          key={item.id}
          description={item.description}
          notes={item.notes}
          imageUrl={item.imageUrl}
          badge={item.badge}
          showPrice={showPrice}
          price={item.price}
          purchasePrice={item.purchasePrice}
          onClick={() => onItemClick(item.id)}
        />
      ))}
    </div>
  )
}

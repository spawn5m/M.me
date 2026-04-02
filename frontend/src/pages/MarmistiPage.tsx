import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMarmista } from '../hooks/useMarmista'
import FilterBar from '../components/catalog/FilterBar'
import ProductGrid from '../components/catalog/ProductGrid'
import ProductModal from '../components/catalog/ProductModal'
import type { MarmistaItem } from '../lib/types'

interface Filters {
  category: string
  subcategory: string
  search: string
}

export default function MarmistiPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<Filters>({ category: '', subcategory: '', search: '' })
  const [selectedItem, setSelectedItem] = useState<MarmistaItem | null>(null)

  const { items, loading } = useMarmista({
    category: filters.category,
    search: filters.search,
  })

  const categories = useMemo(
    () => [...new Set(items.flatMap((i) => i.categories))],
    [items]
  )

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = !filters.category || item.categories.includes(filters.category)
      const matchSearch =
        !filters.search ||
        item.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.code.toLowerCase().includes(filters.search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [items, filters])

  function handleFilter(f: Filters) {
    setFilters(f)
  }

  function handleItemClick(id: string) {
    const item = items.find((i) => i.id === id) ?? null
    setSelectedItem(item)
  }

  function handleCloseModal() {
    setSelectedItem(null)
  }

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

      {/* Catalog */}
      <section className="px-6 md:px-12 lg:px-20 py-10">
        <FilterBar
          categories={categories}
          onFilter={handleFilter}
          totalCount={filteredItems.length}
        />

        <div className="mt-6">
          <ProductGrid
            items={filteredItems.map((item) => ({
              ...item,
              price: item.publicPrice,
            }))}
            showPrice={true}
            onItemClick={handleItemClick}
            loading={loading}
          />
        </div>
      </section>

      {/* ProductModal */}
      {selectedItem && (
        <ProductModal
          item={selectedItem}
          type="marmista"
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

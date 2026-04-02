import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCoffins } from '../hooks/useCoffins'
import { useAccessories } from '../hooks/useAccessories'
import FilterBar from '../components/catalog/FilterBar'
import ProductGrid from '../components/catalog/ProductGrid'
import ProductModal from '../components/catalog/ProductModal'
import AccessoriesView from '../components/catalog/AccessoriesView'
type ActiveTab = 'coffins' | 'accessories'
type ModalType = 'coffin' | 'accessory'

interface Filters {
  category: string
  subcategory: string
  search: string
}

export default function ImpreseFunebrePage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ActiveTab>('coffins')
  const [filters, setFilters] = useState<Filters>({ category: '', subcategory: '', search: '' })
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [selectedType, setSelectedType] = useState<ModalType>('coffin')

  const { items: coffins, loading: loadingCoffins } = useCoffins({
    category: filters.category,
    search: filters.search,
  })
  const { items: accessories, loading: loadingAccessories } = useAccessories({
    category: filters.category,
    search: filters.search,
  })
const coffinCategories = useMemo(
    () => [...new Set(coffins.flatMap((c) => c.categories))],
    [coffins]
  )
  const coffinSubcategories = useMemo(
    () => [...new Set(coffins.flatMap((c) => c.subcategories))],
    [coffins]
  )
  const accessoryCategories = useMemo(
    () => [...new Set(accessories.flatMap((a) => a.categories))],
    [accessories]
  )

  const activeCategories = activeTab === 'coffins' ? coffinCategories : accessoryCategories
  const activeSubcategories = activeTab === 'coffins' ? coffinSubcategories : []

  function handleTabChange(tab: ActiveTab) {
    setActiveTab(tab)
    setFilters({ category: '', subcategory: '', search: '' })
  }

  function handleFilter(f: Filters) {
    setFilters(f)
  }

  function handleCoffinClick(id: string) {
    const idx = filteredCoffins.findIndex((c) => c.id === id)
    if (idx !== -1) { setSelectedIndex(idx); setSelectedType('coffin') }
  }

  function handleAccessoryClick(id: string) {
    const idx = filteredAccessories.findIndex((a) => a.id === id)
    if (idx !== -1) { setSelectedIndex(idx); setSelectedType('accessory') }
  }

  function handleCloseModal() {
    setSelectedIndex(null)
  }

  const filteredCoffins = useMemo(() => {
    return coffins.filter((c) => {
      const matchCat = !filters.category || c.categories.includes(filters.category)
      const matchSub = !filters.subcategory || c.subcategories.includes(filters.subcategory)
      const matchSearch =
        !filters.search ||
        c.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        c.code.toLowerCase().includes(filters.search.toLowerCase())
      return matchCat && matchSub && matchSearch
    })
  }, [coffins, filters])

  const filteredAccessories = useMemo(() => {
    return accessories.filter((a) => {
      const matchCat = !filters.category || a.categories.includes(filters.category)
      const matchSearch =
        !filters.search ||
        a.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        a.code.toLowerCase().includes(filters.search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [accessories, filters])

  const activeItems = activeTab === 'coffins' ? filteredCoffins : filteredAccessories
  const activeLoading = activeTab === 'coffins' ? loadingCoffins : loadingAccessories
  const activeOnClick = activeTab === 'coffins' ? handleCoffinClick : handleAccessoryClick
  const modalItems = selectedType === 'coffin' ? filteredCoffins : filteredAccessories

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Page header */}
      <div className="pt-24 pb-10 px-6 md:px-12 lg:px-20 border-b border-[#E5E0D8]">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#C9A96E] mb-3">
          {t('nav.funeralHomes')}
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-[#031634] leading-tight">
          {t('catalog.funeralHomesTitle')}
        </h1>
        <p className="mt-3 text-[#6B7280] text-base max-w-2xl">
          {t('catalog.funeralHomesSubtitle')}
        </p>
      </div>

      {/* Sezione 1 — Cofani & Accessori */}
      <section className="px-6 md:px-12 lg:px-20 py-10">
        {/* Tab switcher */}
        <div className="flex gap-0 border border-[#E5E0D8] w-fit mb-8">
          <button
            onClick={() => handleTabChange('coffins')}
            className={`px-6 py-3 text-sm font-medium uppercase tracking-[0.1em] transition-colors duration-150 ${
              activeTab === 'coffins'
                ? 'bg-[#031634] text-white'
                : 'bg-white text-[#031634] hover:bg-[#FAF9F6]'
            }`}
          >
            {t('catalog.coffins')}
          </button>
          <button
            onClick={() => handleTabChange('accessories')}
            className={`px-6 py-3 text-sm font-medium uppercase tracking-[0.1em] transition-colors duration-150 ${
              activeTab === 'accessories'
                ? 'bg-[#031634] text-white'
                : 'bg-white text-[#031634] hover:bg-[#FAF9F6]'
            }`}
          >
            {t('catalog.accessories')}
          </button>
        </div>

        {/* Tab accessori — split PDF view */}
        {activeTab === 'accessories' ? (
          <AccessoriesView
            items={filteredAccessories}
            loading={loadingAccessories}
          />
        ) : (
          <>
            <FilterBar
              categories={activeCategories}
              subcategories={activeSubcategories}
              onFilter={handleFilter}
              totalCount={activeItems.length}
            />
            <div className="mt-6">
              <ProductGrid
                items={activeItems}
                showPrice={false}
                onItemClick={activeOnClick}
                loading={activeLoading}
                columns={4}
              />
            </div>
          </>
        )}
      </section>

{/* ProductModal */}
      {selectedIndex !== null && (
        <ProductModal
          items={modalItems}
          currentIndex={selectedIndex}
          type={selectedType}
          onNavigate={setSelectedIndex}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCoffins } from '../hooks/useCoffins'
import { useAccessories } from '../hooks/useAccessories'
import FilterBar from '../components/catalog/FilterBar'
import ProductGrid from '../components/catalog/ProductGrid'
import ProductModal from '../components/catalog/ProductModal'
import AccessoriesView from '../components/catalog/AccessoriesView'
import type { CoffinPriceOption } from '../lib/types'
type ActiveTab = 'coffins' | 'accessories'
type ModalType = 'coffin' | 'accessory'

interface Filters {
  category: string
  subcategory: string
  search: string
}

function mergePriceLists(current: CoffinPriceOption[], next: CoffinPriceOption[]) {
  const merged = new Map(current.map((option) => [option.priceListId, option]))

  for (const option of next) {
    merged.set(option.priceListId, option)
  }

  return Array.from(merged.values()).sort((a, b) => a.priceListName.localeCompare(b.priceListName, 'it'))
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

  const pagePriceLists = useMemo(() => {
    const seen = new Set<string>()
    const options: CoffinPriceOption[] = []

    for (const coffin of coffins) {
      for (const option of coffin.priceOptions ?? []) {
        if (seen.has(option.priceListId)) continue
        seen.add(option.priceListId)
        options.push(option)
      }
    }

    return options.sort((a, b) => a.priceListName.localeCompare(b.priceListName, 'it'))
  }, [coffins])

  const [knownPriceLists, setKnownPriceLists] = useState<CoffinPriceOption[]>([])

  useEffect(() => {
    if (pagePriceLists.length === 0) return
    setKnownPriceLists((current) => mergePriceLists(current, pagePriceLists))
  }, [pagePriceLists])

  const availablePriceLists = knownPriceLists.length > 0 ? knownPriceLists : pagePriceLists

  const [selectedPriceListId, setSelectedPriceListId] = useState('')

  useEffect(() => {
    if (availablePriceLists.length === 0) {
      setSelectedPriceListId('')
      return
    }

    setSelectedPriceListId((current) => {
      if (availablePriceLists.some((option) => option.priceListId === current)) {
        return current
      }

      return availablePriceLists[0].priceListId
    })
  }, [availablePriceLists])

  const visibleCoffins = useMemo(() => {
    if (availablePriceLists.length === 0) {
      return filteredCoffins
    }

    return filteredCoffins.map((coffin) => ({
      ...coffin,
      price:
        coffin.priceOptions?.find((option) => option.priceListId === selectedPriceListId)?.price ?? null,
    }))
  }, [availablePriceLists.length, filteredCoffins, selectedPriceListId])

  const selectedPriceListLabel = useMemo(() => {
    const selectedPriceList = availablePriceLists.find((option) => option.priceListId === selectedPriceListId)
    if (!selectedPriceList) return null

    const typeLabel = selectedPriceList.priceListType === 'purchase'
      ? t('catalog.priceListTypePurchase')
      : t('catalog.priceListTypeSale')

    return `${selectedPriceList.priceListName} - ${typeLabel}`
  }, [availablePriceLists, selectedPriceListId, t])

  const activeItems = activeTab === 'coffins' ? visibleCoffins : filteredAccessories
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
            {availablePriceLists.length > 0 && (
              <div className="mt-6 flex flex-col gap-2 md:max-w-sm">
                <label
                  htmlFor="funeral-price-list"
                  className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6B7280]"
                >
                  {t('catalog.activePriceList')}
                </label>
                <select
                  id="funeral-price-list"
                  value={selectedPriceListId}
                  onChange={(event) => setSelectedPriceListId(event.target.value)}
                  className="min-h-11 rounded-[6px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#1A2B4A] focus:border-[#C9A96E] focus:outline-none"
                >
                  {availablePriceLists.map((option) => (
                    <option key={option.priceListId} value={option.priceListId}>
                      {option.priceListName} - {option.priceListType === 'purchase'
                        ? t('catalog.priceListTypePurchase')
                        : t('catalog.priceListTypeSale')}
                    </option>
                  ))}
                </select>
                {selectedPriceListLabel && (
                  <p className="text-sm text-[#6B7280]">{selectedPriceListLabel}</p>
                )}
              </div>
            )}
            <div className="mt-6">
              <ProductGrid
                items={activeItems}
                showPrice
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

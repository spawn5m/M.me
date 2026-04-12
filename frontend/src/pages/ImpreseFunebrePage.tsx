import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCoffins } from '../hooks/useCoffins'
import { useAccessories } from '../hooks/useAccessories'
import FilterBar from '../components/catalog/FilterBar'
import ProductGrid from '../components/catalog/ProductGrid'
import ProductModal from '../components/catalog/ProductModal'
import AccessoriesView from '../components/catalog/AccessoriesView'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import type { CoffinPriceOption } from '../lib/types'

type ActiveTab = 'coffins' | 'accessories'
type ModalType = 'coffin' | 'accessory'
type PurchaseStep = 'idle' | 'confirm' | 'active'

interface PurchasePriceList { id: string; name: string }
interface AccessoryPriceList { id: string; name: string; priceListType: 'sale' | 'purchase' }

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
  const { hasPermission } = useAuth()
  const canSeePurchase = hasPermission('pricelists.purchase.read')

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

  function handleFilter(f: Filters) { setFilters(f) }

  function handleCoffinClick(id: string) {
    const idx = filteredCoffins.findIndex((c) => c.id === id)
    if (idx !== -1) { setSelectedIndex(idx); setSelectedType('coffin') }
  }

  function handleAccessoryClick(id: string) {
    const idx = filteredAccessories.findIndex((a) => a.id === id)
    if (idx !== -1) { setSelectedIndex(idx); setSelectedType('accessory') }
  }

  function handleCloseModal() { setSelectedIndex(null) }

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

  // ── Sale price list dropdown ──────────────────────────────────────────────

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
    if (availablePriceLists.length === 0) { setSelectedPriceListId(''); return }
    setSelectedPriceListId((current) => {
      if (availablePriceLists.some((o) => o.priceListId === current)) return current
      return availablePriceLists[0].priceListId
    })
  }, [availablePriceLists])

  const selectedPriceListLabel = useMemo(() => {
    const pl = availablePriceLists.find((o) => o.priceListId === selectedPriceListId)
    if (!pl) return null
    const typeLabel = pl.priceListType === 'purchase'
      ? t('catalog.priceListTypePurchase')
      : t('catalog.priceListTypeSale')
    return `${pl.priceListName} - ${typeLabel}`
  }, [availablePriceLists, selectedPriceListId, t])

  // ── Purchase price unlock ─────────────────────────────────────────────────

  const [purchaseStep, setPurchaseStep] = useState<PurchaseStep>('idle')
  const [purchaseLists, setPurchaseLists] = useState<PurchasePriceList[]>([])
  const [selectedPurchaseListId, setSelectedPurchaseListId] = useState('')
  const [purchasePrices, setPurchasePrices] = useState<Record<string, number>>({})
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  const handlePurchaseConfirm = async () => {
    setPurchaseLoading(true)
    setPurchaseError(null)
    try {
      const res = await api.get<{ data: PurchasePriceList[] }>('/admin/pricelists/purchase-funeral')
      const lists = res.data.data
      if (lists.length === 0) {
        setPurchaseError('Nessun listino acquisto cofani disponibile.')
        setPurchaseStep('idle')
        return
      }
      setPurchaseLists(lists)
      setSelectedPurchaseListId(lists[0].id)
      setPurchaseStep('active')
    } catch {
      setPurchaseError('Impossibile caricare i listini acquisto.')
      setPurchaseStep('idle')
    } finally {
      setPurchaseLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedPurchaseListId) { setPurchasePrices({}); return }
    api.get<{ prices: Record<string, number> }>(
      `/admin/pricelists/purchase-prices?priceListId=${encodeURIComponent(selectedPurchaseListId)}`
    )
      .then(res => setPurchasePrices(res.data.prices))
      .catch(() => setPurchasePrices({}))
  }, [selectedPurchaseListId])

  const handlePurchaseDeactivate = () => {
    setPurchaseStep('idle')
    setPurchaseError(null)
    setPurchaseLists([])
    setSelectedPurchaseListId('')
    setPurchasePrices({})
  }

  // ── Accessories sale pricelist ────────────────────────────────────────────

  const pageAccessoryPriceLists = useMemo(() => {
    const seen = new Set<string>()
    const options: AccessoryPriceList[] = []
    for (const acc of accessories) {
      for (const option of acc.priceOptions ?? []) {
        if (seen.has(option.priceListId)) continue
        seen.add(option.priceListId)
        options.push({ id: option.priceListId, name: option.priceListName, priceListType: option.priceListType })
      }
    }
    return options.sort((a, b) => a.name.localeCompare(b.name, 'it'))
  }, [accessories])

  const [selectedAccessoryPriceListId, setSelectedAccessoryPriceListId] = useState('')

  useEffect(() => {
    if (pageAccessoryPriceLists.length === 0) { setSelectedAccessoryPriceListId(''); return }
    setSelectedAccessoryPriceListId((current) => {
      if (pageAccessoryPriceLists.some((o) => o.id === current)) return current
      return pageAccessoryPriceLists[0].id
    })
  }, [pageAccessoryPriceLists])

  // ── Accessories purchase unlock ───────────────────────────────────────────

  const [accPurchaseStep, setAccPurchaseStep] = useState<PurchaseStep>('idle')
  const [accPurchaseLists, setAccPurchaseLists] = useState<PurchasePriceList[]>([])
  const [selectedAccPurchaseListId, setSelectedAccPurchaseListId] = useState('')
  const [accPurchasePrices, setAccPurchasePrices] = useState<Record<string, number>>({})
  const [accPurchaseLoading, setAccPurchaseLoading] = useState(false)
  const [accPurchaseError, setAccPurchaseError] = useState<string | null>(null)

  const handleAccPurchaseConfirm = async () => {
    setAccPurchaseLoading(true)
    setAccPurchaseError(null)
    try {
      const res = await api.get<{ data: PurchasePriceList[] }>('/admin/pricelists/purchase-accessories')
      const lists = res.data.data
      if (lists.length === 0) {
        setAccPurchaseError('Nessun listino acquisto accessori disponibile.')
        setAccPurchaseStep('idle')
        return
      }
      setAccPurchaseLists(lists)
      setSelectedAccPurchaseListId(lists[0].id)
      setAccPurchaseStep('active')
    } catch {
      setAccPurchaseError('Impossibile caricare i listini acquisto.')
      setAccPurchaseStep('idle')
    } finally {
      setAccPurchaseLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedAccPurchaseListId) { setAccPurchasePrices({}); return }
    api.get<{ prices: Record<string, number> }>(
      `/admin/pricelists/purchase-prices-accessories?priceListId=${encodeURIComponent(selectedAccPurchaseListId)}`
    )
      .then(res => setAccPurchasePrices(res.data.prices))
      .catch(() => setAccPurchasePrices({}))
  }, [selectedAccPurchaseListId])

  const handleAccPurchaseDeactivate = () => {
    setAccPurchaseStep('idle')
    setAccPurchaseError(null)
    setAccPurchaseLists([])
    setSelectedAccPurchaseListId('')
    setAccPurchasePrices({})
  }

  // ── Visible coffins (sale + optional purchase overlay) ────────────────────

  const visibleCoffins = useMemo(() => {
    const base = availablePriceLists.length === 0
      ? filteredCoffins
      : filteredCoffins.map((coffin) => ({
          ...coffin,
          price: coffin.priceOptions?.find((o) => o.priceListId === selectedPriceListId)?.price ?? null,
        }))

    if (purchaseStep !== 'active' || Object.keys(purchasePrices).length === 0) return base

    return base.map((coffin) => ({
      ...coffin,
      purchasePrice: purchasePrices[coffin.id] ?? null,
    }))
  }, [availablePriceLists.length, filteredCoffins, selectedPriceListId, purchaseStep, purchasePrices])

  // ── Visible accessories (sale + optional purchase overlay) ───────────────

  const visibleAccessories = useMemo(() => {
    const base = pageAccessoryPriceLists.length === 0
      ? filteredAccessories
      : filteredAccessories.map((acc) => ({
          ...acc,
          price: acc.priceOptions?.find((o) => o.priceListId === selectedAccessoryPriceListId)?.price ?? null,
        }))

    if (accPurchaseStep !== 'active' || Object.keys(accPurchasePrices).length === 0) return base

    return base.map((acc) => ({
      ...acc,
      purchasePrice: accPurchasePrices[acc.id] ?? null,
    }))
  }, [pageAccessoryPriceLists.length, filteredAccessories, selectedAccessoryPriceListId, accPurchaseStep, accPurchasePrices])

  const activeItems = activeTab === 'coffins' ? visibleCoffins : visibleAccessories
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

      {/* Catalog section */}
      <section className="px-6 md:px-12 lg:px-20 py-10">

        {/* Tab bar */}
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

        {/* Tab accessori */}
        {activeTab === 'accessories' ? (
          <>
            {/* Riga listino vendita + pulsante acquisti accessori */}
            {(pageAccessoryPriceLists.length > 0 || canSeePurchase) && (
              <div className="mb-6 flex items-end justify-between gap-6 flex-wrap">
                {pageAccessoryPriceLists.length > 0 && (
                  <div className="flex flex-col gap-2 md:max-w-sm">
                    <label
                      htmlFor="accessory-price-list"
                      className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6B7280]"
                    >
                      {t('catalog.activePriceList')}
                    </label>
                    <select
                      id="accessory-price-list"
                      value={selectedAccessoryPriceListId}
                      onChange={(e) => setSelectedAccessoryPriceListId(e.target.value)}
                      className="min-h-11 rounded-[6px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#1A2B4A] focus:border-[#C9A96E] focus:outline-none"
                    >
                      {pageAccessoryPriceLists.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} - {option.priceListType === 'purchase'
                            ? t('catalog.priceListTypePurchase')
                            : t('catalog.priceListTypeSale')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {canSeePurchase && (
                  <div className="flex flex-col items-end gap-1">
                    {accPurchaseStep === 'idle' && (
                      <button
                        onClick={() => setAccPurchaseStep('confirm')}
                        className="px-4 py-2.5 border border-[#031634] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#031634] hover:bg-[#031634] hover:text-white transition-colors duration-150"
                      >
                        Attiva listino acquisti
                      </button>
                    )}

                    {accPurchaseStep === 'confirm' && (
                      <div className="flex items-center gap-3 border border-[#E5E0D8] bg-[#FAF9F6] px-4 py-2.5">
                        <span className="text-xs text-[#031634]">Attivare i prezzi di acquisto?</span>
                        <button
                          onClick={() => void handleAccPurchaseConfirm()}
                          disabled={accPurchaseLoading}
                          className="px-3 py-1 bg-[#031634] text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-50 hover:bg-[#1A2B4A] transition-colors"
                        >
                          {accPurchaseLoading ? '…' : 'Sì'}
                        </button>
                        <button
                          onClick={() => setAccPurchaseStep('idle')}
                          className="px-3 py-1 border border-[#E5E0D8] text-xs text-[#6B7280] hover:text-[#031634] transition-colors"
                        >
                          No
                        </button>
                      </div>
                    )}

                    {accPurchaseStep === 'active' && (
                      <div className="flex items-center gap-3 border border-red-200 bg-red-50 px-4 py-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-700">
                          Acquisti attivi
                        </span>
                        {accPurchaseLists.length > 1 && (
                          <select
                            value={selectedAccPurchaseListId}
                            onChange={e => setSelectedAccPurchaseListId(e.target.value)}
                            className="border border-red-200 bg-white px-2 py-1 text-xs text-[#1A1A1A] focus:outline-none"
                          >
                            {accPurchaseLists.map(pl => (
                              <option key={pl.id} value={pl.id}>{pl.name}</option>
                            ))}
                          </select>
                        )}
                        {accPurchaseLists.length === 1 && (
                          <span className="text-xs text-red-700">{accPurchaseLists[0].name}</span>
                        )}
                        <button
                          onClick={handleAccPurchaseDeactivate}
                          className="text-xs text-red-400 hover:text-red-700 transition-colors"
                        >
                          Disattiva
                        </button>
                      </div>
                    )}

                    {accPurchaseError && (
                      <p className="text-xs text-red-600">{accPurchaseError}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            <AccessoriesView
              items={visibleAccessories}
              loading={loadingAccessories}
              showPrice={pageAccessoryPriceLists.length > 0 || accPurchaseStep === 'active'}
            />
          </>
        ) : (
          <>
            <FilterBar
              categories={activeCategories}
              subcategories={activeSubcategories}
              onFilter={handleFilter}
              totalCount={activeItems.length}
            />

            {/* Riga listino vendita + pulsante acquisti */}
            <div className="mt-6 flex items-end justify-between gap-6 flex-wrap">
              {availablePriceLists.length > 0 && (
                <div className="flex flex-col gap-2 md:max-w-sm">
                  <label
                    htmlFor="funeral-price-list"
                    className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6B7280]"
                  >
                    {t('catalog.activePriceList')}
                  </label>
                  <select
                    id="funeral-price-list"
                    value={selectedPriceListId}
                    onChange={(e) => setSelectedPriceListId(e.target.value)}
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

              {/* Pulsante acquisti — solo per utenti con permesso */}
              {canSeePurchase && (
                <div className="flex flex-col items-end gap-1">
                  {purchaseStep === 'idle' && (
                    <button
                      onClick={() => setPurchaseStep('confirm')}
                      className="px-4 py-2.5 border border-[#031634] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#031634] hover:bg-[#031634] hover:text-white transition-colors duration-150"
                    >
                      Attiva listino acquisti
                    </button>
                  )}

                  {purchaseStep === 'confirm' && (
                    <div className="flex items-center gap-3 border border-[#E5E0D8] bg-[#FAF9F6] px-4 py-2.5">
                      <span className="text-xs text-[#031634]">Attivare i prezzi di acquisto?</span>
                      <button
                        onClick={() => void handlePurchaseConfirm()}
                        disabled={purchaseLoading}
                        className="px-3 py-1 bg-[#031634] text-white text-xs font-semibold uppercase tracking-wider disabled:opacity-50 hover:bg-[#1A2B4A] transition-colors"
                      >
                        {purchaseLoading ? '…' : 'Sì'}
                      </button>
                      <button
                        onClick={() => setPurchaseStep('idle')}
                        className="px-3 py-1 border border-[#E5E0D8] text-xs text-[#6B7280] hover:text-[#031634] transition-colors"
                      >
                        No
                      </button>
                    </div>
                  )}

                  {purchaseStep === 'active' && (
                    <div className="flex items-center gap-3 border border-red-200 bg-red-50 px-4 py-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-700">
                        Acquisti attivi
                      </span>
                      {purchaseLists.length > 1 && (
                        <select
                          value={selectedPurchaseListId}
                          onChange={e => setSelectedPurchaseListId(e.target.value)}
                          className="border border-red-200 bg-white px-2 py-1 text-xs text-[#1A1A1A] focus:outline-none"
                        >
                          {purchaseLists.map(pl => (
                            <option key={pl.id} value={pl.id}>{pl.name}</option>
                          ))}
                        </select>
                      )}
                      {purchaseLists.length === 1 && (
                        <span className="text-xs text-red-700">{purchaseLists[0].name}</span>
                      )}
                      <button
                        onClick={handlePurchaseDeactivate}
                        className="text-xs text-red-400 hover:text-red-700 transition-colors"
                      >
                        Disattiva
                      </button>
                    </div>
                  )}

                  {purchaseError && (
                    <p className="text-xs text-red-600">{purchaseError}</p>
                  )}
                </div>
              )}
            </div>

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

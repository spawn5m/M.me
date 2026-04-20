import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMarmista } from '../hooks/useMarmista'
import { useAuth } from '../context/AuthContext'
import AccessoriesView from '../components/catalog/AccessoriesView'
import OffertaMeseCard from '../components/catalog/OffertaMeseCard'
import api from '../lib/api'
import type { CoffinPriceOption } from '../lib/types'

type PurchaseStep = 'idle' | 'confirm' | 'active'
interface PurchasePriceList { id: string; name: string }
interface MarmistaPriceList { id: string; name: string; priceListType: 'sale' | 'purchase' }

export default function MarmistiPage() {
  const { t } = useTranslation()
  const { user, hasPermission } = useAuth()
  const isMarmista = user?.roles?.includes('marmista') ?? false
  const canSeePurchase = hasPermission('pricelists.purchase.read')

  const [filterSearch, setFilterSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const categoryCodeMap = useMemo(() => new Map<string, string>(), [])

  useEffect(() => {
    api.get<{ data: Array<{ code: string; label: string }> }>('/public/marmista-categories')
      .then(res => {
        res.data.data.forEach(c => categoryCodeMap.set(c.label, c.code))
        setAvailableCategories(res.data.data.map(c => c.label))
      })
      .catch(() => {})
  }, [categoryCodeMap])

  const handleFilterChange = useCallback(({ search, category }: { search: string; category: string }) => {
    setFilterSearch(search)
    setFilterCategory(category ? (categoryCodeMap.get(category) ?? category) : '')
  }, [categoryCodeMap])

  const hasActiveFilters = filterSearch !== '' || filterCategory !== ''
  const { items, loading } = useMarmista({ search: filterSearch, category: filterCategory, limit: 100, enabled: hasActiveFilters })

  // ── Listini vendita disponibili ───────────────────────────────────────────

  const pagePriceLists = useMemo(() => {
    const seen = new Set<string>()
    const options: MarmistaPriceList[] = []
    for (const item of items) {
      for (const option of item.priceOptions ?? []) {
        if (seen.has(option.priceListId)) continue
        seen.add(option.priceListId)
        options.push({ id: option.priceListId, name: option.priceListName, priceListType: option.priceListType })
      }
    }
    return options.sort((a, b) => a.name.localeCompare(b.name, 'it'))
  }, [items])

  const [selectedPriceListId, setSelectedPriceListId] = useState('')

  useEffect(() => {
    if (pagePriceLists.length === 0) { setSelectedPriceListId(''); return }
    setSelectedPriceListId((current) => {
      if (pagePriceLists.some((o) => o.id === current)) return current
      return pagePriceLists[0].id
    })
  }, [pagePriceLists])

  // ── Listino acquisto ──────────────────────────────────────────────────────

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
      const res = await api.get<{ data: PurchasePriceList[] }>('/admin/pricelists/purchase-marmista')
      const lists = res.data.data
      if (lists.length === 0) {
        setPurchaseError('Nessun listino acquisto marmista disponibile.')
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
      `/admin/pricelists/purchase-prices-marmista?priceListId=${encodeURIComponent(selectedPurchaseListId)}`
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

  // ── Articoli visibili ─────────────────────────────────────────────────────

  const catalogItems = useMemo(
    () =>
      items.map((item) => {
        const salePrice = pagePriceLists.length > 0
          ? (item.priceOptions?.find((o) => o.priceListId === selectedPriceListId) as CoffinPriceOption | undefined)?.price ?? null
          : item.price ?? null

        return {
          id: item.id,
          code: item.code,
          description: item.description,
          notes: item.notes,
          categories: item.categories,
          pdfPage: item.pdfPage,
          publicPrice: item.publicPrice ?? null,
          color: item.color ?? false,
          price: salePrice,
          purchasePrice: purchaseStep === 'active' ? (purchasePrices[item.id] ?? null) : null,
        }
      }),
    [items, pagePriceLists.length, selectedPriceListId, purchaseStep, purchasePrices]
  )

  const showPrice = pagePriceLists.length > 0 || isMarmista || purchaseStep === 'active'

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

      {/* Catalog section */}
      <section className="px-6 md:px-12 lg:px-20 py-10">

        {/* Barra listini vendita + acquisto */}
        {(pagePriceLists.length > 0 || canSeePurchase) && (
          <div className="mb-6 flex items-end justify-between gap-6 flex-wrap">
            {pagePriceLists.length > 0 && (
              <div className="flex flex-col gap-2 md:max-w-sm">
                <label
                  htmlFor="marmista-price-list"
                  className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6B7280]"
                >
                  {t('catalog.activePriceList')}
                </label>
                <select
                  id="marmista-price-list"
                  value={selectedPriceListId}
                  onChange={(e) => setSelectedPriceListId(e.target.value)}
                  className="min-h-11 rounded-[6px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#1A2B4A] focus:border-[#C9A96E] focus:outline-none"
                >
                  {pagePriceLists.map((option) => (
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
        )}

        <AccessoriesView
          items={catalogItems}
          loading={loading}
          catalogType="marmista"
          showPrice={showPrice}
          catalogPdfUrl="/uploads/pdf/VEZZANI%20CATALOGO%202026.pdf"
          availableCategories={availableCategories}
          onFilterChange={handleFilterChange}
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

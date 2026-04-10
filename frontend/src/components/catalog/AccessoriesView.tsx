import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { catalogPublicApi } from '../../lib/api/catalog'
import type { CatalogLayoutPublic } from '../../../../backend/src/types/shared'
import { catalogPageToPdfFile, pdfFileToDisplayLabel } from '../../../../backend/src/lib/catalogPageMap'

export interface CatalogViewItem {
  id: string
  code: string
  description: string
  notes?: string
  categories: string[]
  pdfPage?: number
  publicPrice?: number | null   // sempre visibile (prezzo pubblico)
  price?: number | null         // prezzo listino (condizionale)
  purchasePrice?: number | null
}

interface AccessoriesViewProps {
  items: CatalogViewItem[]
  loading: boolean
  showPrice?: boolean
  catalogType?: 'accessories' | 'marmista'
  catalogPdfUrl?: string
}

export default function AccessoriesView({
  items,
  loading,
  showPrice = false,
  catalogType = 'accessories',
  catalogPdfUrl = '/uploads/pdf/CATALOGO%20CEABIS%202024.pdf',
}: AccessoriesViewProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [catalogLayoutData, setCatalogLayoutData] = useState<CatalogLayoutPublic | null>(null)

  useEffect(() => {
    catalogPublicApi.layout(catalogType)
      .then((data) => setCatalogLayoutData(data))
      .catch(() => setCatalogLayoutData(null))
  }, [catalogType])

  const categories = useMemo(
    () => [...new Set(items.flatMap((a) => a.categories))],
    [items]
  )

  const filtered = useMemo(() => {
    return items.filter((a) => {
      const matchSearch =
        !search ||
        a.description.toLowerCase().includes(search.toLowerCase()) ||
        a.code.toLowerCase().includes(search.toLowerCase())
      const matchCat = !category || a.categories.includes(category)
      return matchSearch && matchCat
    })
  }, [items, search, category])

  const activeItem = useMemo(() => {
    if (selectedId) {
      const found = filtered.find((a) => a.id === selectedId)
      if (found) return found
    }
    return filtered[0] ?? null
  }, [selectedId, filtered])

  const pdfSrc = (() => {
    if (!activeItem?.pdfPage) return catalogPdfUrl
    if (catalogLayoutData?.slug && catalogLayoutData.totalPdfPages) {
      const layout = {
        offset: catalogLayoutData.layout.offset,
        firstPageType: catalogLayoutData.layout.firstPageType,
        bodyPageType: catalogLayoutData.layout.bodyPageType,
        lastPageType: catalogLayoutData.layout.lastPageType,
        totalPdfPages: catalogLayoutData.totalPdfPages,
      }
      const fileIdx = catalogPageToPdfFile(activeItem.pdfPage, layout)
      return `/uploads/pdf/pages/${catalogLayoutData.slug}/${fileIdx}.pdf`
    }
    return `${catalogPdfUrl}#page=${activeItem.pdfPage}`
  })()

  const pdfPageLabel = (() => {
    if (!activeItem?.pdfPage) return null
    if (catalogLayoutData?.slug && catalogLayoutData.totalPdfPages) {
      const layout = {
        offset: catalogLayoutData.layout.offset,
        firstPageType: catalogLayoutData.layout.firstPageType,
        bodyPageType: catalogLayoutData.layout.bodyPageType,
        lastPageType: catalogLayoutData.layout.lastPageType,
        totalPdfPages: catalogLayoutData.totalPdfPages,
      }
      const fileIdx = catalogPageToPdfFile(activeItem.pdfPage, layout)
      return pdfFileToDisplayLabel(fileIdx, layout)
    }
    return `p. ${activeItem.pdfPage}`
  })()

  function handleSearchChange(value: string) {
    setSearch(value)
    setSelectedId(null)
  }

  function handleCategoryChange(value: string) {
    setCategory(value)
    setSelectedId(null)
  }

  function handleReset() {
    setSearch('')
    setCategory('')
    setSelectedId(null)
  }

  const hasFilters = search !== '' || category !== ''

  return (
    <div className="flex gap-4 h-[calc(100vh-240px)] min-h-[480px]">

      {/* ── 1/6 — Filtri + Lista ──────────────────────────────── */}
      <div className="w-1/6 flex flex-col border-r border-[#E5E0D8] overflow-hidden">

        {/* Filtri */}
        <div className="px-4 py-4 bg-[#FAF9F6] border-b border-[#E5E0D8] shrink-0 space-y-2.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#031634]">
            {t('catalog.searchFilters')}
          </p>

          {/* Ricerca descrizione */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#44474e] w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('catalog.searchByDescription')}
              className="w-full bg-white pl-10 pr-4 py-2 text-sm text-[#031634] outline-none focus:ring-2 focus:ring-[#C9A96E] rounded"
            />
          </div>

          {/* Categoria */}
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            aria-label={t('catalog.category')}
            className="w-full bg-white px-3 py-2 text-sm text-[#031634] outline-none focus:ring-2 focus:ring-[#C9A96E] rounded cursor-pointer"
          >
            <option value="">{t('catalog.allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Clear + contatore */}
          <div className="flex items-center justify-between">
            {hasFilters ? (
              <button
                onClick={handleReset}
                className="text-xs font-medium text-[#C9A96E] hover:underline transition-colors"
              >
                {t('catalog.clearFilters')}
              </button>
            ) : (
              <span />
            )}
            <span className="font-mono text-[10px] text-[#44474e]">
              {filtered.length} {t('catalog.itemsFound')}
            </span>
          </div>
        </div>

        {/* Intestazione colonne */}
        {(() => {
          const isMarmista = catalogType === 'marmista'
          const cols = isMarmista
            ? showPrice ? 'grid-cols-[1fr_auto_auto_auto]' : 'grid-cols-[1fr_auto_auto]'
            : showPrice ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-[1fr_auto]'
          return (
            <div className={`grid gap-2 px-4 py-2 bg-[#F4F3F0] text-[9px] font-bold uppercase tracking-[0.12em] text-[#6B7280] shrink-0 ${cols}`}>
              <span>{t('catalog.description')}</span>
              {isMarmista && <span className="text-right">Pub.</span>}
              {showPrice && <span className="text-right">{t('catalog.price')}</span>}
              <span>{t('catalog.category')}</span>
            </div>
          )
        })()}

        {/* Lista articoli */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-10 text-sm text-[#6B7280] text-center">
              {t('catalog.loading')}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-sm text-[#6B7280] text-center">
              {t('catalog.noResults')}
            </div>
          ) : (
            filtered.map((item) => {
              const isActive = item.id === activeItem?.id
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[#E5E0D8] transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#F4F3F0] border-l-2 border-l-[#C9A96E]'
                      : 'hover:bg-[#F4F3F0] border-l-2 border-l-transparent'
                  }`}
                >
                  <span className="font-mono text-[10px] text-[#C9A96E] tracking-widest block mb-0.5">
                    {item.code}
                  </span>
                  {(() => {
                    const isMarmista = catalogType === 'marmista'
                    const cols = isMarmista
                      ? showPrice ? 'grid-cols-[1fr_auto_auto_auto]' : 'grid-cols-[1fr_auto_auto]'
                      : showPrice ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-[1fr_auto]'
                    return (
                      <div className={`grid gap-2 items-start ${cols}`}>
                        <span className="text-sm text-[#031634] leading-snug line-clamp-2 text-left">
                          {item.description}
                        </span>
                        {/* Prezzo pubblico — sempre visibile per marmista */}
                        {isMarmista && (
                          <span className="font-mono text-sm text-[#031634] shrink-0 text-right">
                            {item.publicPrice != null ? `€ ${item.publicPrice.toFixed(2)}` : '—'}
                          </span>
                        )}
                        {/* Prezzo listino — solo quando showPrice */}
                        {!isMarmista && showPrice && (
                          <div className="flex flex-col items-end shrink-0">
                            {item.purchasePrice != null && (
                              <span className="font-mono text-[10px] font-semibold text-red-600">
                                € {item.purchasePrice.toFixed(2)}
                              </span>
                            )}
                            <span className="font-mono text-sm text-[#031634]">
                              {item.price != null ? `€ ${item.price.toFixed(2)}` : '—'}
                            </span>
                          </div>
                        )}
                        {isMarmista && showPrice && (
                          <span className="font-mono text-sm text-[#1A2B4A] font-semibold shrink-0 text-right">
                            {item.price != null ? `€ ${item.price.toFixed(2)}` : '—'}
                          </span>
                        )}
                        <span className="text-[10px] text-[#6B7280] shrink-0 mt-0.5 text-right line-clamp-1">
                          {item.categories[0] ?? '—'}
                        </span>
                      </div>
                    )
                  })()}
                  {item.notes && (
                    <p className="text-[11px] text-[#6B7280] italic line-clamp-1 mt-0.5">
                      {item.notes}
                    </p>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── 5/6 — Visualizzatore PDF ─────────────────────────── */}
      <div className="w-5/6 flex flex-col bg-[#E9E8E5] overflow-hidden">

        {/* Barra info pagina */}
        <div className="px-4 py-2 bg-[#FAF9F6] border-b border-[#E5E0D8] shrink-0 flex items-center gap-3 min-h-[36px]">
          {activeItem ? (
            <>
              <span className="font-mono text-[11px] font-bold text-[#C9A96E] tracking-widest">
                {activeItem.code}
              </span>
              <span className="text-[11px] text-[#031634] truncate flex-1">
                {activeItem.description}
              </span>
              {pdfPageLabel !== null && (
                <span className="font-mono text-[10px] text-[#6B7280] shrink-0">
                  {pdfPageLabel}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] text-[#6B7280]">{t('catalog.selectItemToView')}</span>
          )}
        </div>

        {/* PDF iframe — key forza reload al cambio pagina */}
        <iframe
          key={pdfSrc}
          src={pdfSrc}
          className="flex-1 w-full border-0"
          title={t('catalog.accessoryCatalog')}
        />
      </div>
    </div>
  )
}

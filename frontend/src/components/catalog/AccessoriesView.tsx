import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
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
  color?: boolean
}

interface AccessoriesViewProps {
  items: CatalogViewItem[]
  loading: boolean
  showPrice?: boolean
  catalogType?: 'accessories' | 'marmista'
  catalogPdfUrl?: string
  availableCategories?: string[]
  onFilterChange?: (filters: { search: string; category: string }) => void
}

export default function AccessoriesView({
  items,
  loading,
  showPrice = false,
  catalogType = 'accessories',
  catalogPdfUrl = '/uploads/pdf/CATALOGO%20CEABIS%202024.pdf',
  availableCategories: availableCategoriesProp,
  onFilterChange,
}: AccessoriesViewProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [catalogLayoutData, setCatalogLayoutData] = useState<CatalogLayoutPublic | null>(null)
  const [currentFileIdx, setCurrentFileIdx] = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isServerSide = !!onFilterChange

  useEffect(() => {
    catalogPublicApi.layout(catalogType)
      .then((data) => setCatalogLayoutData(data))
      .catch(() => setCatalogLayoutData(null))
  }, [catalogType])

  const categories = useMemo(
    () => availableCategoriesProp ?? [...new Set(items.flatMap((a) => a.categories))],
    [availableCategoriesProp, items]
  )

  const filtered = useMemo(() => {
    if (isServerSide) return items
    return items.filter((a) => {
      const matchSearch =
        !search ||
        a.description.toLowerCase().includes(search.toLowerCase()) ||
        a.code.toLowerCase().includes(search.toLowerCase())
      const matchCat = !category || a.categories.includes(category)
      return matchSearch && matchCat
    })
  }, [items, search, category, isServerSide])

  const hasFilters = search !== '' || category !== ''

  const activeItem = useMemo(() => {
    if (!hasFilters) return null
    if (selectedId) {
      const found = filtered.find((a) => a.id === selectedId)
      if (found) return found
    }
    return filtered[0] ?? null
  }, [selectedId, filtered, hasFilters])

  const totalPdfFiles = catalogLayoutData?.totalPdfPages ?? null

  const pdfLayout = useMemo(() => {
    if (!catalogLayoutData?.slug || !catalogLayoutData.totalPdfPages) return null
    return {
      offset: catalogLayoutData.layout.offset,
      firstPageType: catalogLayoutData.layout.firstPageType,
      bodyPageType: catalogLayoutData.layout.bodyPageType,
      lastPageType: catalogLayoutData.layout.lastPageType,
      totalPdfPages: catalogLayoutData.totalPdfPages,
    }
  }, [catalogLayoutData])

  // Sync file index when active item or layout changes
  useEffect(() => {
    if (!activeItem?.pdfPage) return
    setCurrentFileIdx(
      pdfLayout ? catalogPageToPdfFile(activeItem.pdfPage, pdfLayout) : activeItem.pdfPage
    )
  }, [activeItem, pdfLayout])

  const pdfSrc = pdfLayout && catalogLayoutData?.slug
    ? `/uploads/pdf/pages/${catalogLayoutData.slug}/${currentFileIdx}.pdf#zoom=page-width`
    : `${catalogPdfUrl}#page=${currentFileIdx}&zoom=page-width`

  const pdfPageLabel = pdfLayout
    ? pdfFileToDisplayLabel(currentFileIdx, pdfLayout)
    : `p. ${currentFileIdx}`

  const goToFile = useCallback((delta: number) => {
    setCurrentFileIdx(prev => {
      const next = prev + delta
      if (next < 1) return 1
      if (totalPdfFiles && next > totalPdfFiles) return totalPdfFiles
      return next
    })
  }, [totalPdfFiles])

  function handleSearchChange(value: string) {
    setSearch(value)
    setSelectedId(null)
    if (onFilterChange) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onFilterChange({ search: value, category }), 350)
    }
  }

  function handleCategoryChange(value: string) {
    setCategory(value)
    setSelectedId(null)
    if (onFilterChange) onFilterChange({ search, category: value })
  }

  function handleReset() {
    setSearch('')
    setCategory('')
    setSelectedId(null)
    if (onFilterChange) onFilterChange({ search: '', category: '' })
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)] min-h-[600px]">

      {/* ── 2/6 — Filtri + Lista ──────────────────────────────── */}
      <div className="w-2/6 flex flex-col border-r border-[#E5E0D8] overflow-hidden">

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
          {hasFilters && (
            <div className="flex items-center justify-between">
              <button
                onClick={handleReset}
                className="text-xs font-medium text-[#C9A96E] hover:underline transition-colors"
              >
                {t('catalog.clearFilters')}
              </button>
              <span className="font-mono text-[10px] text-[#44474e]">
                {filtered.length} {t('catalog.itemsFound')}
              </span>
            </div>
          )}
        </div>

        {/* Intestazione colonne — visibile solo con filtri attivi */}
        {hasFilters && (() => {
          const isMarmista = catalogType === 'marmista'
          const cols = isMarmista
            ? showPrice ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-[1fr_auto]'
            : showPrice ? 'grid-cols-[1fr_auto]' : 'grid-cols-[1fr]'
          return (
            <div className={`grid gap-2 px-4 py-2 bg-[#F4F3F0] text-[9px] font-bold uppercase tracking-[0.12em] text-[#6B7280] shrink-0 ${cols}`}>
              <span>{t('catalog.description')}</span>
              {isMarmista && <span className="text-right">Pub.</span>}
              {showPrice && <span className="text-right">{t('catalog.price')}</span>}
            </div>
          )
        })()}

        {/* Lista articoli */}
        <div className="flex-1 overflow-y-auto">
          {!hasFilters ? (
            <div className="px-4 py-10 text-sm text-[#6B7280] text-center">
              {t('catalog.searchToDiscover')}
            </div>
          ) : loading ? (
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
                  className={`w-full text-left px-4 py-4 border-b border-[#E5E0D8] transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#F4F3F0] border-l-2 border-l-[#C9A96E]'
                      : 'hover:bg-[#F4F3F0] border-l-2 border-l-transparent'
                  }`}
                >
                  {/* Codice + prezzi sulla stessa riga */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="flex items-center gap-1 shrink-0 pt-0.5">
                      <span className="font-mono text-[10px] text-[#C9A96E] tracking-widest">{item.code}</span>
                      {item.color && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-label="Disponibile a colori" title="Disponibile a colori">
                          <circle cx="6" cy="6" r="4" fill="#E74C3C"/>
                          <circle cx="18" cy="6" r="4" fill="#3498DB"/>
                          <circle cx="6" cy="18" r="4" fill="#2ECC71"/>
                          <circle cx="18" cy="18" r="4" fill="#F39C12"/>
                        </svg>
                      )}
                    </span>
                    {/* Colonna prezzi */}
                    {(() => {
                      const isMarmista = catalogType === 'marmista'
                      return (
                        <div className="flex flex-col items-end shrink-0 gap-0.5">
                          {isMarmista && (
                            <span className="font-mono text-[11px] text-[#6B7280]">
                              {item.publicPrice != null ? `€ ${item.publicPrice.toFixed(2)}` : '—'}
                            </span>
                          )}
                          {showPrice && (
                            <>
                              {item.purchasePrice != null && (
                                <span className="font-mono text-[10px] font-semibold text-red-600">
                                  € {item.purchasePrice.toFixed(2)}
                                </span>
                              )}
                              <span className="font-mono text-[11px] font-semibold text-[#031634]">
                                {item.price != null ? `€ ${item.price.toFixed(2)}` : '—'}
                              </span>
                            </>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  {/* Descrizione */}
                  <p className="text-sm text-[#031634] leading-snug line-clamp-3 text-left">
                    {item.description}
                  </p>
                  {/* Categoria + note */}
                  <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                    {item.categories[0] && (
                      <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-[#6B7280] bg-[#F4F3F0] px-1.5 py-0.5 rounded-sm">
                        {item.categories[0]}
                      </span>
                    )}
                    {item.notes && (
                      <span className="text-[10px] text-[#6B7280] italic line-clamp-1">
                        {item.notes}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── 4/6 — Visualizzatore PDF ─────────────────────────── */}
      <div className="w-4/6 flex flex-col bg-[#E9E8E5] overflow-hidden">

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
              <span className="font-mono text-[10px] text-[#6B7280] shrink-0">
                {pdfPageLabel}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-[#6B7280]">{t('catalog.selectItemToView')}</span>
          )}
        </div>

        {/* PDF iframe */}
        <iframe
          key={pdfSrc}
          src={pdfSrc}
          className="flex-1 w-full border-0"
          title={t('catalog.accessoryCatalog')}
        />

        {/* Navigazione pagine PDF */}
        <div className="shrink-0 flex items-center justify-center gap-4 px-4 py-2.5 bg-[#FAF9F6] border-t border-[#E5E0D8]">
          <button
            onClick={() => goToFile(-1)}
            disabled={currentFileIdx <= 1}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E0D8] text-[11px] font-medium text-[#1A2B4A] uppercase tracking-[0.1em] hover:bg-[#F4F3F0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Precedente
          </button>

          <span className="font-mono text-[11px] text-[#6B7280] min-w-[6rem] text-center">
            {pdfPageLabel}
          </span>

          <button
            onClick={() => goToFile(1)}
            disabled={totalPdfFiles !== null && currentFileIdx >= totalPdfFiles}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E0D8] text-[11px] font-medium text-[#1A2B4A] uppercase tracking-[0.1em] hover:bg-[#F4F3F0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Successivo
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

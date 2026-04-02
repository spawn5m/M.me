import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { CoffinItem, AccessoryItem } from '../../lib/types'

type ModalType = 'coffin' | 'accessory'

interface ProductModalProps {
  items: (CoffinItem | AccessoryItem)[]
  currentIndex: number
  type: ModalType
  onNavigate: (index: number) => void
  onClose: () => void
}

function isCoffin(
  item: CoffinItem | AccessoryItem,
  type: ModalType
): item is CoffinItem {
  return type === 'coffin'
}

export default function ProductModal({
  items,
  currentIndex,
  type,
  onNavigate,
  onClose,
}: ProductModalProps) {
  const { t } = useTranslation()
  const item = items[currentIndex] ?? null
  if (!item) return null

  const coffinItem = isCoffin(item, type) ? item : null
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < items.length - 1

  // Navigazione da tastiera
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentIndex, hasPrev, hasNext])

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-[#FAF9F6] flex flex-col"
        style={{ width: '66vw', minWidth: 640, height: '85vh' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-xl leading-none border border-[#E5E0D8] text-[#031634] hover:bg-[#031634] hover:text-white hover:border-[#031634] transition-colors duration-150"
        >
          ×
        </button>

        {/* ── Immagine 2/3 altezza ─────────────────────── */}
        <div className="flex-[2] min-h-0 bg-[#EDE9E3] overflow-hidden m-3">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.description}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#EDE9E3]" />
          )}
        </div>

        {/* ── Dati 1/3 altezza ─────────────────────────── */}
        <div className="flex-[1] min-h-0 flex flex-col border-t border-[#E5E0D8]">

          {/* Riga 1: Codice | Titolo + Note */}
          <div className="grid grid-cols-2 border-b border-[#E5E0D8] flex-shrink-0">
            <div className="flex flex-col justify-center gap-1 px-5 py-3">
              <span className="font-mono text-xl font-bold text-[#C9A96E] tracking-widest uppercase leading-none">
                {item.code}
              </span>
            </div>
            <div className="flex flex-col justify-center gap-1 px-5 py-3">
              <p className="font-serif text-xl text-[#031634] leading-snug line-clamp-1">
                {item.description}
              </p>
              {item.notes && (
                <p className="text-sm italic text-[#6B7280] line-clamp-1">{item.notes}</p>
              )}
            </div>
          </div>

          {/* Riga 2: Caratteristiche + Misure in 4 colonne piatte */}
          <div className="flex-1 min-h-0 grid grid-cols-4 gap-x-6 px-5 py-3 border-b border-[#E5E0D8]">

            {/* Caratteristiche — 2 coppie per riga */}
            {coffinItem && (
              <div className="col-span-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#031634] mb-1.5">
                  {t('catalog.characteristics')}
                </p>
                <dl className="grid grid-cols-4 gap-x-3 gap-y-1 text-sm">
                  {coffinItem.essences.length > 0 && (
                    <><dt className="text-[#6B7280]">{t('catalog.fieldEssence')}</dt><dd className="text-[#031634] font-medium truncate">{coffinItem.essences.join(', ')}</dd></>
                  )}
                  {coffinItem.figures.length > 0 && (
                    <><dt className="text-[#6B7280]">{t('catalog.fieldFigure')}</dt><dd className="text-[#031634] font-medium truncate">{coffinItem.figures.join(', ')}</dd></>
                  )}
                  {coffinItem.colors.length > 0 && (
                    <><dt className="text-[#6B7280]">{t('catalog.fieldColor')}</dt><dd className="text-[#031634] font-medium truncate">{coffinItem.colors.join(', ')}</dd></>
                  )}
                  {coffinItem.finishes.length > 0 && (
                    <><dt className="text-[#6B7280]">{t('catalog.fieldFinish')}</dt><dd className="text-[#031634] font-medium truncate">{coffinItem.finishes.join(', ')}</dd></>
                  )}
                </dl>
              </div>
            )}

            {/* Misure interne — 2 coppie per riga */}
            {coffinItem?.internalMeasures && (
              <div className="col-span-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#031634] mb-1.5">
                  {t('catalog.internalMeasures')}
                </p>
                <dl className="grid grid-cols-4 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-[#6B7280]">{t('catalog.fieldHead')}</dt><dd className="font-mono text-[#031634]">{coffinItem.internalMeasures.headWidth}</dd>
                  <dt className="text-[#6B7280]">{t('catalog.fieldFeet')}</dt><dd className="font-mono text-[#031634]">{coffinItem.internalMeasures.feetWidth}</dd>
                  <dt className="text-[#6B7280]">{t('catalog.fieldShoulder')}</dt><dd className="font-mono text-[#031634]">{coffinItem.internalMeasures.shoulderWidth}</dd>
                  <dt className="text-[#6B7280]">{t('catalog.fieldHeight')}</dt><dd className="font-mono text-[#031634]">{coffinItem.internalMeasures.height}</dd>
                  <dt className="text-[#6B7280]">{t('catalog.fieldWidth')}</dt><dd className="font-mono text-[#031634]">{coffinItem.internalMeasures.width}</dd>
                  <dt className="text-[#6B7280]">{t('catalog.fieldDepth')}</dt><dd className="font-mono text-[#031634]">{coffinItem.internalMeasures.depth}</dd>
                </dl>
              </div>
            )}
          </div>

          {/* Navigazione */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-[#FAF9F6] flex-shrink-0">
            <button
              onClick={() => hasPrev && onNavigate(currentIndex - 1)}
              disabled={!hasPrev}
              className="text-xs font-medium uppercase tracking-widest px-5 py-2 border border-[#E5E0D8] text-[#031634] hover:bg-[#031634] hover:text-white hover:border-[#031634] transition-colors duration-150 disabled:opacity-25 disabled:cursor-default"
            >
              ← {t('catalog.prevProduct')}
            </button>
            <span className="text-xs text-[#6B7280] font-mono">
              {currentIndex + 1} / {items.length}
            </span>
            <button
              onClick={() => hasNext && onNavigate(currentIndex + 1)}
              disabled={!hasNext}
              className="text-xs font-medium uppercase tracking-widest px-5 py-2 border border-[#E5E0D8] text-[#031634] hover:bg-[#031634] hover:text-white hover:border-[#031634] transition-colors duration-150 disabled:opacity-25 disabled:cursor-default"
            >
              {t('catalog.nextProduct')} →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

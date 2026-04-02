import { useTranslation } from 'react-i18next'
import type { CoffinItem, AccessoryItem, MarmistaItem, CeabisItem } from '../../lib/types'

type ModalType = 'coffin' | 'accessory' | 'marmista' | 'ceabis'

interface ProductModalProps {
  item: CoffinItem | AccessoryItem | MarmistaItem | CeabisItem | null
  type: ModalType
  onClose: () => void
}

// Type guards
function isCoffin(
  item: CoffinItem | AccessoryItem | MarmistaItem | CeabisItem,
  type: ModalType
): item is CoffinItem {
  return type === 'coffin'
}

function hasPdfPage(
  item: CoffinItem | AccessoryItem | MarmistaItem | CeabisItem
): item is AccessoryItem | MarmistaItem | CeabisItem {
  return 'pdfPage' in item
}

const TYPE_LABELS: Record<ModalType, string> = {
  coffin: 'Cofano',
  accessory: 'Accessorio',
  marmista: 'Marmista',
  ceabis: 'Ceabis',
}

export default function ProductModal({ item, type, onClose }: ProductModalProps) {
  const { t } = useTranslation()
  if (!item) return null

  const coffinItem = isCoffin(item, type) ? item : null

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      data-testid="modal-overlay"
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        className="relative bg-white w-full max-w-4xl mx-auto p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#44474e] tracking-wide">
              {item.code}
            </span>
            <span className="bg-[#031634] text-white text-xs font-bold uppercase tracking-widest px-3 py-1">
              {TYPE_LABELS[type]}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="text-[#44474e] hover:text-[#031634] transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Immagine — 60% */}
          <div className="md:w-[60%]">
            <div className="aspect-[4/3] bg-[#EDE9E3]">
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
          </div>

          {/* Info — 40% */}
          <div className="md:w-[40%] flex flex-col gap-4">
            {/* Titolo */}
            <h2 className="font-serif text-3xl text-[#031634] leading-tight">
              {item.description}
            </h2>

            {/* Note */}
            {item.notes && (
              <p className="text-sm italic text-[#44474e]">{item.notes}</p>
            )}

            {/* Caratteristiche — solo cofani */}
            {coffinItem && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#031634] mb-2">
                  {t('catalog.characteristics')}
                </h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {coffinItem.essences.length > 0 && (
                    <>
                      <dt className="text-[#44474e]">Essenza</dt>
                      <dd className="text-[#031634] font-medium">
                        {coffinItem.essences.join(', ')}
                      </dd>
                    </>
                  )}
                  {coffinItem.figures.length > 0 && (
                    <>
                      <dt className="text-[#44474e]">Figura</dt>
                      <dd className="text-[#031634] font-medium">
                        {coffinItem.figures.join(', ')}
                      </dd>
                    </>
                  )}
                  {coffinItem.colors.length > 0 && (
                    <>
                      <dt className="text-[#44474e]">Colorazione</dt>
                      <dd className="text-[#031634] font-medium">
                        {coffinItem.colors.join(', ')}
                      </dd>
                    </>
                  )}
                  {coffinItem.finishes.length > 0 && (
                    <>
                      <dt className="text-[#44474e]">Finitura</dt>
                      <dd className="text-[#031634] font-medium">
                        {coffinItem.finishes.join(', ')}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {/* Misure Interne — solo cofani con internalMeasures */}
            {coffinItem?.internalMeasures && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#031634] mb-2">
                  {t('catalog.internalMeasures')}
                </h3>
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    <tr>
                      <td className="text-[#44474e] py-1 pr-3 font-medium">Testa</td>
                      <td className="text-[#44474e] py-1 pr-3 font-medium">Piedi</td>
                      <td className="text-[#44474e] py-1 font-medium">Spalla</td>
                    </tr>
                    <tr>
                      <td className="font-mono text-[#031634] py-1 pr-3">
                        {coffinItem.internalMeasures.headWidth}
                      </td>
                      <td className="font-mono text-[#031634] py-1 pr-3">
                        {coffinItem.internalMeasures.feetWidth}
                      </td>
                      <td className="font-mono text-[#031634] py-1">
                        {coffinItem.internalMeasures.shoulderWidth}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-[#44474e] py-1 pr-3 font-medium">Altezza</td>
                      <td className="text-[#44474e] py-1 pr-3 font-medium">Larghezza</td>
                      <td className="text-[#44474e] py-1 font-medium">Profondità</td>
                    </tr>
                    <tr>
                      <td className="font-mono text-[#031634] py-1 pr-3">
                        {coffinItem.internalMeasures.height}
                      </td>
                      <td className="font-mono text-[#031634] py-1 pr-3">
                        {coffinItem.internalMeasures.width}
                      </td>
                      <td className="font-mono text-[#031634] py-1">
                        {coffinItem.internalMeasures.depth}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-[#44474e] mt-1 italic">{t('catalog.measureUnit')}</p>
              </div>
            )}

            {/* Pagina PDF — accessori, marmisti, ceabis */}
            {hasPdfPage(item) && item.pdfPage !== undefined && (
              <div className="mt-auto pt-2">
                <p className="text-sm text-[#44474e]">
                  {t('catalog.pdfPage')}:{' '}
                  <span className="font-mono font-bold text-[#031634]">
                    {item.pdfPage}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#E5E0D8]">
          <button
            disabled
            className="text-sm font-medium text-[#44474e] border border-[#E5E0D8] px-4 py-2 disabled:opacity-40 cursor-default"
          >
            ← {t('catalog.prevProduct')}
          </button>
          <button
            disabled
            className="text-sm font-medium text-[#44474e] border border-[#E5E0D8] px-4 py-2 disabled:opacity-40 cursor-default"
          >
            {t('catalog.nextProduct')} →
          </button>
        </div>
      </div>
    </div>
  )
}

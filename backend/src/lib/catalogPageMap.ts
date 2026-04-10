export interface CatalogLayout {
  offset: number
  firstPageType: 'single' | 'double'
  bodyPageType: 'single' | 'double'
  lastPageType: 'single' | 'double'
  totalPdfPages: number
}

/**
 * Data la pagina del catalogo fisico (1-based, dalla prima pagina numerata),
 * restituisce l'indice del file PDF splittato (1-based).
 */
export function catalogPageToPdfFile(catalogPage: number, layout: CatalogLayout): number {
  const { offset, firstPageType, bodyPageType } = layout
  const base = offset + 1
  const stride = bodyPageType === 'single' ? 1 : 2

  if (firstPageType === 'single') {
    if (catalogPage === 1) return base
    return base + Math.ceil((catalogPage - 1) / stride)
  } else {
    if (catalogPage <= 2) return base
    return base + Math.ceil((catalogPage - 2) / stride)
  }
}

/**
 * Dato l'indice di un file PDF splittato (1-based), restituisce l'etichetta
 * leggibile delle pagine catalogo coperte (es. "pp. 4–5", "p. 1").
 */
export function pdfFileToDisplayLabel(pdfFileIndex: number, layout: CatalogLayout): string {
  const { offset, firstPageType, bodyPageType, lastPageType, totalPdfPages } = layout
  const base = offset + 1

  if (pdfFileIndex < base) return `File ${pdfFileIndex}`

  const relativeIndex = pdfFileIndex - base

  if (relativeIndex === 0) {
    return firstPageType === 'single' ? 'p. 1' : 'pp. 1–2'
  }

  const firstPagesCount = firstPageType === 'single' ? 1 : 2
  const bodyStride = bodyPageType === 'single' ? 1 : 2
  const bodyFileOffset = relativeIndex - 1
  const catalogPageStart = firstPagesCount + bodyFileOffset * bodyStride + 1

  const isLast = pdfFileIndex === totalPdfPages

  if (isLast && lastPageType === 'single') {
    return `p. ${catalogPageStart}`
  }

  if (bodyPageType === 'single') {
    return `p. ${catalogPageStart}`
  }

  return `pp. ${catalogPageStart}–${catalogPageStart + 1}`
}

import { describe, it, expect } from 'vitest'
import { catalogPageToPdfFile, pdfFileToDisplayLabel } from '../catalogPageMap'
import type { CatalogLayout } from '../catalogPageMap'

// Layout helper
const lay = (overrides: Partial<CatalogLayout> = {}): CatalogLayout => ({
  offset: 0,
  firstPageType: 'single',
  bodyPageType: 'double',
  lastPageType: 'single',
  totalPdfPages: 111,
  ...overrides,
})

describe('catalogPageToPdfFile', () => {
  it('tutto singolo — pag.N → file N', () => {
    const layout = lay({ bodyPageType: 'single', totalPdfPages: 220 })
    expect(catalogPageToPdfFile(1, layout)).toBe(1)
    expect(catalogPageToPdfFile(42, layout)).toBe(42)
    expect(catalogPageToPdfFile(220, layout)).toBe(220)
  })

  it('tutto doppio — pag.1,2 → file 1, pag.3,4 → file 2', () => {
    const layout = lay({ firstPageType: 'double', bodyPageType: 'double', totalPdfPages: 110 })
    expect(catalogPageToPdfFile(1, layout)).toBe(1)
    expect(catalogPageToPdfFile(2, layout)).toBe(1)
    expect(catalogPageToPdfFile(3, layout)).toBe(2)
    expect(catalogPageToPdfFile(4, layout)).toBe(2)
    expect(catalogPageToPdfFile(5, layout)).toBe(3)
  })

  it('first=single body=double — copertina singola, resto spread', () => {
    const layout = lay()
    expect(catalogPageToPdfFile(1, layout)).toBe(1)   // copertina
    expect(catalogPageToPdfFile(2, layout)).toBe(2)   // spread 2-3
    expect(catalogPageToPdfFile(3, layout)).toBe(2)   // spread 2-3
    expect(catalogPageToPdfFile(4, layout)).toBe(3)   // spread 4-5
    expect(catalogPageToPdfFile(5, layout)).toBe(3)
    expect(catalogPageToPdfFile(220, layout)).toBe(111)
  })

  it('offset=2 — i primi 2 file PDF non sono numerati', () => {
    const layout = lay({ offset: 2, totalPdfPages: 113 })
    expect(catalogPageToPdfFile(1, layout)).toBe(3)   // base = 2+1 = 3
    expect(catalogPageToPdfFile(2, layout)).toBe(4)   // spread 2-3
    expect(catalogPageToPdfFile(3, layout)).toBe(4)
    expect(catalogPageToPdfFile(4, layout)).toBe(5)
  })

  it('first=double body=single — cover doppia, pagine singole', () => {
    const layout = lay({ firstPageType: 'double', bodyPageType: 'single', totalPdfPages: 219 })
    expect(catalogPageToPdfFile(1, layout)).toBe(1)
    expect(catalogPageToPdfFile(2, layout)).toBe(1)
    expect(catalogPageToPdfFile(3, layout)).toBe(2)
    expect(catalogPageToPdfFile(4, layout)).toBe(3)
    expect(catalogPageToPdfFile(100, layout)).toBe(99)
  })
})

describe('pdfFileToDisplayLabel', () => {
  it('first=single — file 1 è "p. 1"', () => {
    expect(pdfFileToDisplayLabel(1, lay())).toBe('p. 1')
  })

  it('body=double — file 2 è "pp. 2–3"', () => {
    expect(pdfFileToDisplayLabel(2, lay())).toBe('pp. 2–3')
    expect(pdfFileToDisplayLabel(3, lay())).toBe('pp. 4–5')
    expect(pdfFileToDisplayLabel(110, lay())).toBe('pp. 218–219')
  })

  it('last=single — ultimo file è pagina singola', () => {
    expect(pdfFileToDisplayLabel(111, lay())).toBe('p. 220')
  })

  it('first=double — file 1 è "pp. 1–2"', () => {
    const layout = lay({ firstPageType: 'double', totalPdfPages: 110 })
    expect(pdfFileToDisplayLabel(1, layout)).toBe('pp. 1–2')
    expect(pdfFileToDisplayLabel(2, layout)).toBe('pp. 3–4')
  })

  it('body=single — ogni file è pagina singola', () => {
    const layout = lay({ bodyPageType: 'single', totalPdfPages: 220 })
    expect(pdfFileToDisplayLabel(1, layout)).toBe('p. 1')
    expect(pdfFileToDisplayLabel(42, layout)).toBe('p. 42')
  })

  it('offset=2 — file prima del base restituisce "File N"', () => {
    const layout = lay({ offset: 2, totalPdfPages: 113 })
    expect(pdfFileToDisplayLabel(1, layout)).toBe('File 1')
    expect(pdfFileToDisplayLabel(2, layout)).toBe('File 2')
    expect(pdfFileToDisplayLabel(3, layout)).toBe('p. 1')  // base=3
  })
})

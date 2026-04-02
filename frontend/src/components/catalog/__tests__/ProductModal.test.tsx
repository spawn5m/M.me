import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProductModal from '../ProductModal'
import type { CoffinItem, AccessoryItem } from '../../../lib/types'

const coffinWithMeasures: CoffinItem = {
  id: '1',
  code: 'C-001',
  description: 'Bara in Legno Massello',
  notes: 'Qualità premium',
  categories: ['Cofani'],
  subcategories: ['Lusso'],
  essences: ['Mogano'],
  figures: ['Standard'],
  colors: ['Noce'],
  finishes: ['Lucido'],
  internalMeasures: {
    headWidth: 48,
    feetWidth: 40,
    shoulderWidth: 52,
    height: 15,
    width: 52,
    depth: 45,
  },
}

const coffinWithoutMeasures: CoffinItem = {
  id: '2',
  code: 'C-002',
  description: 'Bara Semplice',
  categories: ['Cofani'],
  subcategories: [],
  essences: ['Pino'],
  figures: ['Standard'],
  colors: ['Naturale'],
  finishes: ['Opaco'],
}

const accessoryWithPdf: AccessoryItem = {
  id: '3',
  code: 'A-001',
  description: 'Crocifisso',
  categories: ['Accessori'],
  pdfPage: 42,
}

describe('ProductModal', () => {
  // Test 1: mostra tabella misure interne se type='coffin' e internalMeasures presente
  it('mostra tabella misure interne per cofano con internalMeasures', () => {
    render(
      <ProductModal
        item={coffinWithMeasures}
        type="coffin"
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/misure interne/i)).toBeInTheDocument()
    // Valori della tabella
    expect(screen.getByText('48')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    // 52 appears twice (shoulderWidth and width both = 52)
    expect(screen.getAllByText('52').length).toBeGreaterThanOrEqual(1)
  })

  // Test 2: NON mostra tabella misure se type='accessory'
  it('non mostra tabella misure interne per accessori', () => {
    render(
      <ProductModal
        item={accessoryWithPdf}
        type="accessory"
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByText(/misure interne/i)).not.toBeInTheDocument()
  })

  // Test 3: click overlay chiama onClose
  it('click sull\'overlay chiama onClose', () => {
    const onClose = vi.fn()
    render(
      <ProductModal
        item={coffinWithoutMeasures}
        type="coffin"
        onClose={onClose}
      />
    )
    const overlay = screen.getByTestId('modal-overlay')
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledOnce()
  })

  // Test 4: mostra pagina PDF se type='accessory' e pdfPage presente
  it('mostra pagina PDF per accessori con pdfPage', () => {
    render(
      <ProductModal
        item={accessoryWithPdf}
        type="accessory"
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/pagina catalogo pdf/i)).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})

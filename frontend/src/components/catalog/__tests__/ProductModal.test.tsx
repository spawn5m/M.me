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
  measure: {
    id: 'm1',
    code: 'STD',
    label: 'Standard',
    head: 48,
    feet: 40,
    shoulder: 52,
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
  it('mostra tabella misure interne per cofano con measure', () => {
    render(
      <ProductModal
        items={[coffinWithMeasures]}
        currentIndex={0}
        type="coffin"
        onNavigate={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/misure interne/i)).toBeInTheDocument()
    expect(screen.getByText('48')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getAllByText('52').length).toBeGreaterThanOrEqual(1)
  })

  it('non mostra tabella misure interne per accessori', () => {
    render(
      <ProductModal
        items={[accessoryWithPdf]}
        currentIndex={0}
        type="accessory"
        onNavigate={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByText(/misure interne/i)).not.toBeInTheDocument()
  })

  it("click sull'overlay chiama onClose", () => {
    const onClose = vi.fn()
    render(
      <ProductModal
        items={[coffinWithoutMeasures]}
        currentIndex={0}
        type="coffin"
        onNavigate={vi.fn()}
        onClose={onClose}
      />
    )
    const overlay = screen.getByTestId('modal-overlay')
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('mostra pagina PDF per accessori con pdfPage', () => {
    render(
      <ProductModal
        items={[accessoryWithPdf]}
        currentIndex={0}
        type="accessory"
        onNavigate={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText(/pagina catalogo pdf/i)).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FilterBar from '../FilterBar'

const defaultProps = {
  categories: ['Cofani', 'Accessori', 'Marmisti'],
  onFilter: vi.fn(),
}

describe('FilterBar', () => {
  // Test 1: cambio categoria chiama onFilter con { category: 'Cofani', subcategory: '', search: '' }
  it('cambio categoria chiama onFilter con category aggiornata', () => {
    const onFilter = vi.fn()
    render(<FilterBar {...defaultProps} onFilter={onFilter} />)

    const select = screen.getByRole('combobox', { name: /categoria/i })
    fireEvent.change(select, { target: { value: 'Cofani' } })

    expect(onFilter).toHaveBeenCalledWith({
      category: 'Cofani',
      subcategory: '',
      search: '',
    })
  })

  // Test 2: input ricerca chiama onFilter con search aggiornato
  it('input ricerca chiama onFilter con search aggiornato', () => {
    const onFilter = vi.fn()
    render(<FilterBar {...defaultProps} onFilter={onFilter} />)

    const input = screen.getByPlaceholderText(/cerca prodotto/i)
    fireEvent.change(input, { target: { value: 'bara' } })

    expect(onFilter).toHaveBeenCalledWith({
      category: '',
      subcategory: '',
      search: 'bara',
    })
  })

  // Test 3: click "Pulisci filtri" resetta a valori vuoti
  it('click "Pulisci filtri" resetta i filtri a valori vuoti', () => {
    const onFilter = vi.fn()
    render(
      <FilterBar
        {...defaultProps}
        onFilter={onFilter}
        categories={['Cofani', 'Accessori']}
      />
    )

    // Prima seleziona una categoria
    const select = screen.getByRole('combobox', { name: /categoria/i })
    fireEvent.change(select, { target: { value: 'Cofani' } })

    // Poi premi "Pulisci filtri"
    const resetBtn = screen.getByRole('button', { name: /pulisci filtri/i })
    fireEvent.click(resetBtn)

    expect(onFilter).toHaveBeenLastCalledWith({
      category: '',
      subcategory: '',
      search: '',
    })
  })
})

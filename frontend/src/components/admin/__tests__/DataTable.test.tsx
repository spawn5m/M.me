import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DataTable from '../DataTable'

const columns = [
  { key: 'name', header: 'Nome' },
  { key: 'email', header: 'Email' },
]

const data = [
  { id: '1', name: 'Alice', email: 'alice@test.it' },
  { id: '2', name: 'Bob', email: 'bob@test.it' },
]

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} keyField="id" />)
    expect(screen.getByText('Nome')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders data rows', () => {
    render(<DataTable columns={columns} data={data} keyField="id" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('bob@test.it')).toBeInTheDocument()
  })

  it('shows loading spinner when isLoading', () => {
    render(<DataTable columns={columns} data={[]} keyField="id" isLoading />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} keyField="id" />)
    expect(screen.getByText('Nessun risultato')).toBeInTheDocument()
  })

  it('renders action buttons', () => {
    const onClick = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        actions={[{ label: 'Modifica', onClick }]}
      />
    )
    const buttons = screen.getAllByText('Modifica')
    expect(buttons).toHaveLength(2)
    fireEvent.click(buttons[0])
    expect(onClick).toHaveBeenCalledWith(data[0])
  })

  it('hides action button when hidden returns true', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        actions={[
          { label: 'Visibile', onClick: vi.fn() },
          { label: 'Nascosto', onClick: vi.fn(), hidden: () => true },
        ]}
      />
    )
    expect(screen.getAllByText('Visibile')).toHaveLength(2)
    expect(screen.queryByText('Nascosto')).toBeNull()
  })

  it('sorts rows descending on second header click', () => {
    render(<DataTable columns={columns} data={data} keyField="id" />)
    const nameHeader = screen.getByText('Nome').closest('th')!
    // primo click → asc
    fireEvent.click(nameHeader)
    // secondo click → desc
    fireEvent.click(nameHeader)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Bob')
    expect(rows[1]).toHaveTextContent('Alice')
  })

  it('shows search input when searchable and no pagination', () => {
    render(<DataTable columns={columns} data={data} keyField="id" searchable />)
    expect(screen.getByPlaceholderText('Cerca…')).toBeInTheDocument()
  })

  it('does not show search input when searchable with pagination', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        searchable
        pagination={{ page: 1, pageSize: 2, total: 10, totalPages: 5 }}
        onPageChange={vi.fn()}
      />
    )
    expect(screen.queryByPlaceholderText('Cerca…')).toBeNull()
  })

  it('filters rows via global search', () => {
    render(<DataTable columns={columns} data={data} keyField="id" searchable />)
    const input = screen.getByPlaceholderText('Cerca…')
    fireEvent.change(input, { target: { value: 'alice' } })
    expect(screen.getByText('alice@test.it')).toBeInTheDocument()
    expect(screen.queryByText('bob@test.it')).toBeNull()
  })

  it('renders server-side pagination controls', () => {
    const onPageChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        pagination={{ page: 1, pageSize: 2, total: 10, totalPages: 5 }}
        onPageChange={onPageChange}
      />
    )
    expect(screen.getByText(/pagina 1 di 5/)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Succ/))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})

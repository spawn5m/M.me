import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable from '../DataTable'

type Row = { id: string; name: string; value: string }

const columns = [
  { key: 'name', header: 'Nome' },
  { key: 'value', header: 'Valore' }
]

const data: Row[] = [
  { id: '1', name: 'Alice', value: 'abc' },
  { id: '2', name: 'Bob', value: 'def' }
]

describe('DataTable', () => {
  it('renderizza le intestazioni delle colonne', () => {
    render(<DataTable columns={columns} data={data} keyField="id" />)
    expect(screen.getByText('Nome')).toBeTruthy()
    expect(screen.getByText('Valore')).toBeTruthy()
  })

  it('renderizza i dati nelle righe', () => {
    render(<DataTable columns={columns} data={data} keyField="id" />)
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('Bob')).toBeTruthy()
  })

  it('mostra paginazione quando totalPages > 1', () => {
    const pagination = { page: 1, pageSize: 2, total: 10, totalPages: 5 }
    render(<DataTable columns={columns} data={data} keyField="id" pagination={pagination} />)
    expect(screen.getByText(/10 risultati/)).toBeTruthy()
  })

  it('chiama onPageChange quando si clicca Succ', async () => {
    const onPageChange = vi.fn()
    const pagination = { page: 1, pageSize: 2, total: 10, totalPages: 5 }
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        pagination={pagination}
        onPageChange={onPageChange}
      />
    )
    await userEvent.click(screen.getByText('Succ →'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('mostra "Nessun risultato" per array vuoto', () => {
    render(<DataTable columns={columns} data={[]} keyField="id" />)
    expect(screen.getByText('Nessun risultato')).toBeTruthy()
  })
})

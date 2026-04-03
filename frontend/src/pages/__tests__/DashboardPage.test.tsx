import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../admin/DashboardPage'

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

import api from '../../lib/api'
const mockApi = vi.mocked(api)

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mostra le 4 card con i valori restituiti dall\'API', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { users: 5, coffins: 120, accessories: 88, marmista: 32 }
    })

    render(<MemoryRouter><DashboardPage /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText('5')).toBeTruthy()
      expect(screen.getByText('120')).toBeTruthy()
      expect(screen.getByText('88')).toBeTruthy()
      expect(screen.getByText('32')).toBeTruthy()
    })
  })

  it('mostra errore se l\'API fallisce', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('500'))
    render(<MemoryRouter><DashboardPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Impossibile caricare le statistiche')).toBeTruthy()
    })
  })
})

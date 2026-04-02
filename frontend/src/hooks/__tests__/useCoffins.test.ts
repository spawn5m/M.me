import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCoffins } from '../useCoffins'
import api from '../../lib/api'
import { mockCoffins } from '../../lib/mock-data'

vi.mock('../../lib/api')
const mockGet = vi.mocked(api.get)

describe('useCoffins', () => {
  beforeEach(() => vi.clearAllMocks())

  it('restituisce mock data se API ritorna array vuoto', async () => {
    mockGet.mockResolvedValue({
      data: { data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } },
    })
    const { result } = renderHook(() => useCoffins())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual(mockCoffins)
  })

  it('restituisce dati reali se API risponde con dati', async () => {
    const fakeData = [
      {
        id: 'real-1',
        code: 'REAL-001',
        description: 'Reale',
        categories: [],
        subcategories: [],
        essences: [],
        figures: [],
        colors: [],
        finishes: [],
      },
    ]
    mockGet.mockResolvedValue({
      data: { data: fakeData, pagination: { page: 1, limit: 12, total: 1, totalPages: 1 } },
    })
    const { result } = renderHook(() => useCoffins())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual(fakeData)
  })

  it('usa mock data se API fallisce', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useCoffins())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual(mockCoffins)
    expect(result.current.error).toBeNull()
  })
})

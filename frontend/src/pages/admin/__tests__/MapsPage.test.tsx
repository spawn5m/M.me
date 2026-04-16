import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import MapsPage from '../MapsPage'

vi.mock('../../../lib/api/maps', () => ({
  fetchAdminMaps: vi.fn(),
  updateAdminMaps: vi.fn(),
}))

import { fetchAdminMaps, updateAdminMaps } from '../../../lib/api/maps'

const mockFetchAdminMaps = vi.mocked(fetchAdminMaps)
const mockUpdateAdminMaps = vi.mocked(updateAdminMaps)

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  } as AxiosResponse<T>
}

const SAMPLE = {
  offices: {
    villamar: { lat: 39.6189, lng: 9.0003 },
    sassari: { lat: 40.7259, lng: 8.5558 },
  },
}

describe('MapsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchAdminMaps.mockResolvedValue(axiosResponse(SAMPLE))
    mockUpdateAdminMaps.mockResolvedValue(axiosResponse({ ok: true }))
  })

  it('mostra villamar e sassari con i campi coordinate', async () => {
    render(<MapsPage />)

    expect(await screen.findByText('Mappe')).toBeInTheDocument()
    expect(screen.getByText('Villamar')).toBeInTheDocument()
    expect(screen.getByText('Sassari')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Latitudine')).toHaveLength(2)
    expect(screen.getAllByLabelText('Longitudine')).toHaveLength(2)
  })

  it('salva le coordinate aggiornate', async () => {
    const user = userEvent.setup()
    render(<MapsPage />)

    await screen.findByText('Mappe')

    const latInputs = screen.getAllByLabelText('Latitudine')
    await user.clear(latInputs[0])
    await user.type(latInputs[0], '39.7')

    await user.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    await waitFor(() => {
      expect(mockUpdateAdminMaps).toHaveBeenCalled()
    })

    expect(mockUpdateAdminMaps.mock.calls[0]?.[0].offices.villamar.lat).toBe(39.7)
  })
})

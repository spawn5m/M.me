import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import MaintenancePage from '../MaintenancePage'

vi.mock('../../../lib/api/maintenance', () => ({
  fetchAdminMaintenance: vi.fn(),
  updateAdminMaintenance: vi.fn(),
}))

vi.mock('i18next', () => ({
  default: { reloadResources: vi.fn() },
}))

import { fetchAdminMaintenance, updateAdminMaintenance } from '../../../lib/api/maintenance'
import i18n from 'i18next'

const mockFetchAdminMaintenance = vi.mocked(fetchAdminMaintenance)
const mockUpdateAdminMaintenance = vi.mocked(updateAdminMaintenance)
const mockReloadResources = vi.mocked(i18n.reloadResources)

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
  pages: {
    home: { enabled: false, message: 'Home off' },
    ourStory: { enabled: false, message: 'Story off' },
    whereWeAre: { enabled: false, message: 'Where off' },
    funeralHomes: { enabled: false, message: 'Funeral off' },
    marmistas: { enabled: false, message: 'Marmistas off' },
  },
}

describe('MaintenancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    mockFetchAdminMaintenance.mockResolvedValue(axiosResponse(SAMPLE))
    mockUpdateAdminMaintenance.mockResolvedValue(axiosResponse({ ok: true }))
    mockReloadResources.mockResolvedValue(undefined)
  })

  it('carica e mostra le 5 pagine', async () => {
    render(<MaintenancePage />)
    expect(await screen.findByText('Manutenzione')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('La Nostra Storia')).toBeInTheDocument()
    expect(screen.getByText('Dove Siamo')).toBeInTheDocument()
    expect(screen.getByText('Per le Imprese Funebri')).toBeInTheDocument()
    expect(screen.getByText('Per i Marmisti')).toBeInTheDocument()
  })

  it('salva le modifiche della prima pagina', async () => {
    const user = userEvent.setup()
    render(<MaintenancePage />)

    await screen.findByText('Manutenzione')
    const toggle = screen.getAllByRole('checkbox')[0]
    await user.click(toggle)
    const textareas = screen.getAllByRole('textbox')
    await user.clear(textareas[0])
    await user.type(textareas[0], 'Home in manutenzione')
    await user.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    await waitFor(() => {
      expect(mockUpdateAdminMaintenance).toHaveBeenCalled()
    })

    expect(mockUpdateAdminMaintenance.mock.calls[0]?.[0].pages.home.message).toBe('Home in manutenzione')
    expect(mockReloadResources).toHaveBeenCalledWith('it')
  })

  it('inizializza la preview dal dropdown della sessione senza sporcare il form', async () => {
    window.sessionStorage.setItem('admin-maintenance-preview-enabled', 'true')

    render(<MaintenancePage />)

    const previewSelect = await screen.findByRole('combobox', { name: 'Preview manutenzione' })

    expect(previewSelect).toHaveValue('true')
    expect(screen.getByRole('button', { name: 'Salva modifiche' })).toBeDisabled()
    expect(screen.queryByText('Hai modifiche non salvate.')).toBeNull()
  })

  it('aggiorna la preview nella sessione tramite dropdown', async () => {
    const user = userEvent.setup()

    render(<MaintenancePage />)

    const previewSelect = await screen.findByRole('combobox', { name: 'Preview manutenzione' })

    expect(window.sessionStorage.getItem('admin-maintenance-preview-enabled')).toBeNull()

    await user.selectOptions(previewSelect, 'true')

    expect(window.sessionStorage.getItem('admin-maintenance-preview-enabled')).toBe('true')
    expect(previewSelect).toHaveValue('true')
    expect(screen.getByRole('button', { name: 'Salva modifiche' })).toBeDisabled()
  })
})

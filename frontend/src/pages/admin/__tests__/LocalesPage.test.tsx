import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocalesPage from '../LocalesPage'

vi.mock('i18next', () => ({
  default: { reloadResources: vi.fn() },
}))

const SAMPLE_LOCALE = {
  common: {
    contactUs: 'Contattaci',
  },
  maintenance: {
    home: 'Sito in manutenzione\nRiprova piu tardi',
  },
}

describe('LocalesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === '/api/public/locales/it') {
          return new Response(JSON.stringify(SAMPLE_LOCALE), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        throw new Error(`Unexpected fetch: ${String(input)}`)
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mostra common.contactUs e maintenance.home nella sezione comuni', async () => {
    const user = userEvent.setup()

    render(<LocalesPage />)

    await screen.findByText('Testi del sito')
    await user.click(screen.getByRole('button', { name: 'Comuni' }))

    expect(await screen.findByText('Azioni comuni')).toBeInTheDocument()
    expect(screen.getByText('Pulsante Contattaci')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Contattaci').tagName).toBe('INPUT')

    expect(screen.getByText('Manutenzione')).toBeInTheDocument()
    const maintenanceField = screen.getByLabelText(/Messaggio manutenzione globale/i)
    expect(maintenanceField.tagName).toBe('TEXTAREA')
    expect(maintenanceField).toHaveValue('Sito in manutenzione\nRiprova piu tardi')
  })

  it('rimuove lo stato dirty quando un campo torna al valore salvato', async () => {
    const user = userEvent.setup()

    render(<LocalesPage />)

    await screen.findByText('Testi del sito')
    await user.click(screen.getByRole('button', { name: 'Comuni' }))

    const contactField = screen.getByLabelText(/Pulsante Contattaci/i)
    const saveButton = screen.getByRole('button', { name: 'Salva modifiche' })

    expect(saveButton).toBeDisabled()

    await user.clear(contactField)
    await user.type(contactField, 'Contattaci subito')

    expect(saveButton).toBeEnabled()
    expect(screen.getByText('1 campo modificato')).toBeInTheDocument()

    await user.clear(contactField)
    await user.type(contactField, 'Contattaci')

    expect(saveButton).toBeDisabled()
    expect(screen.queryByText('1 campo modificato')).not.toBeInTheDocument()
  })
})

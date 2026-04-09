import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FormModal from '../FormModal'

function FormModalHarness() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        Apri modal
      </button>
      <a href="https://example.com">Fuori modal</a>
      <FormModal
        isOpen={isOpen}
        title="Nuovo ruolo"
        onClose={() => setIsOpen(false)}
        onSubmit={vi.fn()}
      >
        <label>
          Nome visualizzato
          <input type="text" />
        </label>
      </FormModal>
    </div>
  )
}

describe('FormModal', () => {
  it('moves focus into the dialog, traps tab, closes on Escape, and restores focus to the opener', async () => {
    const user = userEvent.setup()

    render(<FormModalHarness />)

    const opener = screen.getByRole('button', { name: 'Apri modal' })
    await user.click(opener)

    const dialog = screen.getByRole('dialog', { name: 'Nuovo ruolo' })
    const closeButton = screen.getByRole('button', { name: 'Chiudi' })
    const nameInput = screen.getByLabelText('Nome visualizzato')
    const cancelButton = screen.getByRole('button', { name: 'Annulla' })
    const submitButton = screen.getByRole('button', { name: 'Salva' })

    expect(dialog).toBeInTheDocument()
    expect(closeButton).toHaveFocus()

    await user.tab()
    expect(nameInput).toHaveFocus()
    await user.tab()
    expect(cancelButton).toHaveFocus()
    await user.tab()
    expect(submitButton).toHaveFocus()
    await user.tab()
    expect(closeButton).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Nuovo ruolo' })).toBeNull()
    await waitFor(() => {
      expect(opener).toHaveFocus()
    })
  })
})

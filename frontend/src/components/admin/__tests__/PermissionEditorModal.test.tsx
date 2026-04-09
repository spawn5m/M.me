import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import PermissionEditorModal from '../PermissionEditorModal'

const permissions = [
  {
    id: '1',
    code: 'roles.read',
    resource: 'roles',
    action: 'read',
    scope: null,
    label: 'Ruoli',
    description: 'Vedere ruoli e permessi',
    isSystem: true,
  },
]

describe('PermissionEditorModal', () => {
  it('renders dialog semantics with an accessible title', () => {
    render(
      <PermissionEditorModal
        isOpen
        title="Permessi utente"
        permissions={permissions}
        selectedCodes={[]}
        readOnly={false}
        onToggle={vi.fn()}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog', { name: 'Permessi utente' })).toBeInTheDocument()
    expect(screen.getByText('Permessi utente')).toHaveAttribute('id')
  })

  it('hides save interaction while loading', () => {
    const onSave = vi.fn()

    render(
      <PermissionEditorModal
        isOpen
        title="Permessi utente"
        permissions={permissions}
        selectedCodes={[]}
        readOnly={false}
        isLoading
        onToggle={vi.fn()}
        onClose={vi.fn()}
        onSave={onSave}
      />
    )

    expect(screen.queryByRole('button', { name: 'Salva permessi' })).toBeNull()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('moves focus inside on open and keeps tabbing within the modal', async () => {
    const user = userEvent.setup()

    render(
      <>
        <button type="button">Sfondo</button>
        <PermissionEditorModal
          isOpen
          title="Permessi utente"
          permissions={permissions}
          selectedCodes={[]}
          readOnly={false}
          onToggle={vi.fn()}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      </>
    )

    const dialog = screen.getByRole('dialog', { name: 'Permessi utente' })
    const closeButton = screen.getAllByRole('button', { name: 'Chiudi' })[0]
    const backgroundButton = screen.getByRole('button', { name: 'Sfondo' })

    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(closeButton)

    await user.tab({ shift: true })
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).not.toBe(backgroundButton)
  })

  it('returns focus to the opener after close', async () => {
    const user = userEvent.setup()

    function TestHarness() {
      const [isOpen, setIsOpen] = useState(false)

      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Apri permessi
          </button>
          <PermissionEditorModal
            isOpen={isOpen}
            title="Permessi utente"
            permissions={permissions}
            selectedCodes={[]}
            readOnly={false}
            onToggle={vi.fn()}
            onClose={() => setIsOpen(false)}
            onSave={vi.fn()}
          />
        </>
      )
    }

    render(<TestHarness />)

    const opener = screen.getByRole('button', { name: 'Apri permessi' })
    await user.click(opener)
    await user.click(screen.getAllByRole('button', { name: 'Chiudi' })[0])

    expect(opener).toHaveFocus()
  })
})

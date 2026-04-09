import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PermissionChecklist from '../PermissionChecklist'

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
  {
    id: '2',
    code: 'users.create',
    resource: 'users',
    action: 'create',
    scope: null,
    label: 'Crea utenti',
    description: 'Creare nuovi utenti',
    isSystem: true,
  },
]

describe('PermissionChecklist', () => {
  it('filters by code and label', () => {
    render(
      <PermissionChecklist
        permissions={permissions}
        selectedCodes={[]}
        readOnly={false}
        onToggle={vi.fn()}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Cerca permesso'), {
      target: { value: 'ruoli' },
    })

    expect(screen.getByText('roles.read')).toBeInTheDocument()
    expect(screen.queryByText('users.create')).toBeNull()

    fireEvent.change(screen.getByPlaceholderText('Cerca permesso'), {
      target: { value: 'users.create' },
    })

    expect(screen.getByText('users.create')).toBeInTheDocument()
    expect(screen.queryByText('roles.read')).toBeNull()
  })

  it('disables checkboxes in read-only mode', () => {
    render(
      <PermissionChecklist
        permissions={permissions}
        selectedCodes={['roles.read']}
        readOnly
        onToggle={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Ruoli')).toBeDisabled()
    expect(screen.getByLabelText('Crea utenti')).toBeDisabled()
  })

  it('uses the human-readable label as the checkbox accessible name', () => {
    render(
      <PermissionChecklist
        permissions={permissions}
        selectedCodes={[]}
        readOnly={false}
        onToggle={vi.fn()}
      />
    )

    expect(screen.getByRole('checkbox', { name: 'Ruoli' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Crea utenti' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'roles.read' })).toBeNull()
  })

  it('toggles when clicking the row content in editable mode', () => {
    const onToggle = vi.fn()

    render(
      <PermissionChecklist
        permissions={permissions}
        selectedCodes={[]}
        readOnly={false}
        onToggle={onToggle}
      />
    )

    fireEvent.click(screen.getByText('roles.read'))
    fireEvent.click(screen.getByText('Vedere ruoli e permessi'))
    fireEvent.click(screen.getByText('Ruoli').closest('div')!)

    expect(onToggle).toHaveBeenNthCalledWith(1, 'roles.read')
    expect(onToggle).toHaveBeenNthCalledWith(2, 'roles.read')
    expect(onToggle).toHaveBeenNthCalledWith(3, 'roles.read')
  })

  it('keeps row content non-interactive in read-only mode', () => {
    const onToggle = vi.fn()

    render(
      <PermissionChecklist
        permissions={permissions}
        selectedCodes={['roles.read']}
        readOnly
        onToggle={onToggle}
      />
    )

    fireEvent.click(screen.getByText('roles.read'))
    fireEvent.click(screen.getByText('Vedere ruoli e permessi'))

    expect(onToggle).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RolesPage from '../RolesPage'

vi.mock('../../../lib/admin/roles-api', () => ({
  rolesApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../lib/admin/permissions-api', () => ({
  permissionsApi: {
    list: vi.fn(),
    getRolePermissions: vi.fn(),
    updateRolePermissions: vi.fn(),
  },
}))

import { rolesApi } from '../../../lib/admin/roles-api'
import { permissionsApi } from '../../../lib/admin/permissions-api'

const mockRolesApi = vi.mocked(rolesApi)
const mockPermissionsApi = vi.mocked(permissionsApi)

const systemRole = {
  id: 'role-system',
  name: 'manager',
  label: 'Manager',
  isSystem: true,
}

const customRole = {
  id: 'role-custom',
  name: 'operatore_magazzino',
  label: 'Operatore Magazzino',
  isSystem: false,
}

const permissionCatalog = [
  {
    id: 'perm-1',
    code: 'roles.read',
    resource: 'roles',
    action: 'read',
    scope: null,
    label: 'Visualizzare ruoli',
    description: 'Consente di vedere ruoli e permessi',
    isSystem: true,
  },
  {
    id: 'perm-2',
    code: 'users.create',
    resource: 'users',
    action: 'create',
    scope: null,
    label: 'Creare utenti',
    description: 'Consente di creare nuovi utenti',
    isSystem: true,
  },
]

const systemRoleDetail = {
  role: systemRole,
  permissions: [permissionCatalog[0]],
}

const customRoleDetail = {
  role: customRole,
  permissions: [],
}

const updatedCustomRoleDetail = {
  role: customRole,
  permissions: [permissionCatalog[0]],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <RolesPage />
    </MemoryRouter>
  )
}

describe('RolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRolesApi.list.mockResolvedValue({
      data: [systemRole, customRole],
      pagination: { page: 1, pageSize: 2, total: 2, totalPages: 1 },
    })
    mockPermissionsApi.list.mockResolvedValue({
      data: permissionCatalog,
      pagination: { page: 1, pageSize: 2, total: 2, totalPages: 1 },
    })
    mockPermissionsApi.getRolePermissions.mockImplementation((id: string) => {
      return Promise.resolve(id === systemRole.id ? systemRoleDetail : customRoleDetail)
    })
    mockPermissionsApi.updateRolePermissions.mockResolvedValue(updatedCustomRoleDetail)
  })

  it('shows system role permissions in read-only mode', async () => {
    const user = userEvent.setup()

    renderPage()

    const row = (await screen.findByText('Manager')).closest('tr')

    expect(row).not.toBeNull()

    await user.click(within(row as HTMLTableRowElement).getByRole('button', { name: 'Permessi' }))

    const dialog = await screen.findByRole('dialog', { name: 'Permessi ruolo: Manager' })

    expect(await within(dialog).findByRole('checkbox', { name: 'Visualizzare ruoli' })).toBeDisabled()
    expect(within(dialog).queryByRole('button', { name: 'Salva permessi' })).toBeNull()

    await waitFor(() => {
      expect(mockPermissionsApi.list).toHaveBeenCalledTimes(1)
      expect(mockPermissionsApi.getRolePermissions).toHaveBeenCalledWith(systemRole.id)
    })
  })

  it('saves custom role permissions and refreshes the displayed detail', async () => {
    const user = userEvent.setup()

    renderPage()

    const row = (await screen.findByText('Operatore Magazzino')).closest('tr')

    expect(row).not.toBeNull()

    await user.click(within(row as HTMLTableRowElement).getByRole('button', { name: 'Permessi' }))

    const dialog = await screen.findByRole('dialog', { name: 'Permessi ruolo: Operatore Magazzino' })

    await user.click(within(dialog).getByRole('checkbox', { name: 'Creare utenti' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salva permessi' }))

    await waitFor(() => {
      expect(mockPermissionsApi.updateRolePermissions).toHaveBeenCalledWith(customRole.id, ['users.create'])
    })

    await waitFor(() => {
      expect(within(dialog).getByRole('checkbox', { name: 'Visualizzare ruoli' })).toBeChecked()
      expect(within(dialog).getByRole('checkbox', { name: 'Creare utenti' })).not.toBeChecked()
    })
  })

  it('shows a modal error state when saving custom role permissions fails', async () => {
    const user = userEvent.setup()
    mockPermissionsApi.updateRolePermissions.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Salvataggio permessi non riuscito',
        },
      },
    })

    renderPage()

    const row = (await screen.findByText('Operatore Magazzino')).closest('tr')

    expect(row).not.toBeNull()

    await user.click(within(row as HTMLTableRowElement).getByRole('button', { name: 'Permessi' }))

    const dialog = await screen.findByRole('dialog', { name: 'Permessi ruolo: Operatore Magazzino' })

    await user.click(within(dialog).getByRole('checkbox', { name: 'Creare utenti' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salva permessi' }))

    expect(await within(dialog).findByText('Salvataggio permessi non riuscito')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Permessi ruolo: Operatore Magazzino' })).toBeInTheDocument()
  })

  it('shows a page error when role loading fails', async () => {
    mockRolesApi.list.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Caricamento ruoli non riuscito',
        },
      },
    })

    renderPage()

    expect(await screen.findByText('Caricamento ruoli non riuscito')).toBeInTheDocument()
    expect(screen.queryByText('Operatore Magazzino')).toBeNull()
  })

  it('associates create-role labels with their inputs', async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(screen.getByRole('button', { name: '+ Nuovo ruolo' }))

    expect(screen.getByLabelText('Identificatore (es. operatore_magazzino)')).toHaveAttribute('placeholder', 'nome_ruolo')
    expect(screen.getByLabelText('Nome visualizzato')).toHaveAttribute('placeholder', 'Operatore Magazzino')
  })
})

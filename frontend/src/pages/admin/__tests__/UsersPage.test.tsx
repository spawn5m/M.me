import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import UsersPage from '../UsersPage'
import type { AdminUserPermissionDetail } from '../../../../../backend/src/types/shared'

vi.mock('../../../lib/admin/users-api', () => ({
  usersApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../lib/admin/roles-api', () => ({
  rolesApi: {
    list: vi.fn(),
  },
}))

vi.mock('../../../lib/api/pricelists', () => ({
  pricelistsApi: {
    list: vi.fn(),
    assign: vi.fn(),
  },
}))

vi.mock('../../../lib/admin/permissions-api', () => ({
  permissionsApi: {
    list: vi.fn(),
    getUserPermissions: vi.fn(),
    updateUserPermissions: vi.fn(),
  },
}))

import { usersApi } from '../../../lib/admin/users-api'
import { rolesApi } from '../../../lib/admin/roles-api'
import { pricelistsApi } from '../../../lib/api/pricelists'
import { permissionsApi } from '../../../lib/admin/permissions-api'

const mockUsersApi = vi.mocked(usersApi)
const mockRolesApi = vi.mocked(rolesApi)
const mockPricelistsApi = vi.mocked(pricelistsApi)
const mockPermissionsApi = vi.mocked(permissionsApi)

const userRow = {
  id: 'user-1',
  email: 'mario@test.it',
  firstName: 'Mario',
  lastName: 'Rossi',
  isActive: true,
  roles: [
    { id: 'role-1', name: 'manager', label: 'Manager', isSystem: true },
  ],
  manager: null,
  funeralPriceList: null,
  marmistaPriceList: null,
  createdAt: '2026-04-08T10:00:00.000Z',
  updatedAt: '2026-04-08T10:00:00.000Z',
}

const clientUserRow = {
  id: 'user-2',
  email: 'luigi@test.it',
  firstName: 'Luigi',
  lastName: 'Bianchi',
  isActive: true,
  roles: [
    { id: 'role-2', name: 'impresario_funebre', label: 'Impresario funebre', isSystem: true },
  ],
  manager: null,
  funeralPriceList: null,
  marmistaPriceList: null,
  createdAt: '2026-04-08T10:00:00.000Z',
  updatedAt: '2026-04-08T10:00:00.000Z',
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
    code: 'users.write',
    resource: 'users',
    action: 'write',
    scope: null,
    label: 'Gestire utenti',
    description: 'Consente di creare e modificare utenti',
    isSystem: true,
  },
]

const initialDetail = {
  user: {
    id: userRow.id,
    email: userRow.email,
    firstName: userRow.firstName,
    lastName: userRow.lastName,
    isActive: userRow.isActive,
  },
  roles: userRow.roles,
  directPermissions: [permissionCatalog[1]],
  effectivePermissions: [permissionCatalog[0], permissionCatalog[1]],
}

const updatedDetail = {
  ...initialDetail,
  directPermissions: [permissionCatalog[0]],
  effectivePermissions: [permissionCatalog[0], permissionCatalog[1]],
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <UsersPage />
    </MemoryRouter>
  )
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUsersApi.list.mockResolvedValue({
      data: [userRow],
      pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
    })
    mockRolesApi.list.mockResolvedValue({
      data: userRow.roles,
      pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
    })
    mockPricelistsApi.list.mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 0, total: 0, totalPages: 1 },
    })
    mockPermissionsApi.list.mockResolvedValue({
      data: permissionCatalog,
      pagination: { page: 1, pageSize: 2, total: 2, totalPages: 1 },
    })
    mockPermissionsApi.getUserPermissions.mockResolvedValue(initialDetail)
    mockPermissionsApi.updateUserPermissions.mockResolvedValue(updatedDetail)
  })

  it('opens the permission modal and loads catalog plus user detail', async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Permessi' }))

    const dialog = await screen.findByRole('dialog', { name: 'Permessi utente: Mario Rossi' })

    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Ruoli assegnati')).toBeInTheDocument()
    expect(within(dialog).getByText('Manager')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockPermissionsApi.list).toHaveBeenCalledTimes(1)
      expect(mockPermissionsApi.getUserPermissions).toHaveBeenCalledWith(userRow.id)
    })
  })

  it('saves the selected direct grants', async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Permessi' }))
    const dialog = await screen.findByRole('dialog', { name: 'Permessi utente: Mario Rossi' })

    await user.click(within(dialog).getByRole('checkbox', { name: 'Visualizzare ruoli' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Gestire utenti' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salva permessi' }))

    await waitFor(() => {
      expect(mockPermissionsApi.updateUserPermissions).toHaveBeenCalledWith(userRow.id, ['roles.read'])
    })
  })

  it('shows effective permissions in the modal', async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Permessi' }))
    const dialog = await screen.findByRole('dialog', { name: 'Permessi utente: Mario Rossi' })

    expect(within(dialog).getByText('Permessi effettivi')).toBeInTheDocument()
    expect(within(dialog).getAllByText('roles.read').length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText('users.write').length).toBeGreaterThan(0)
  })

  it('shows a modal error when permission save fails', async () => {
    const user = userEvent.setup()
    mockPermissionsApi.updateUserPermissions.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Salvataggio permessi non riuscito',
        },
      },
    })

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Permessi' }))
    const dialog = await screen.findByRole('dialog', { name: 'Permessi utente: Mario Rossi' })

    await user.click(within(dialog).getByRole('checkbox', { name: 'Visualizzare ruoli' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Gestire utenti' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salva permessi' }))

    expect(await screen.findByText('Salvataggio permessi non riuscito')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Permessi utente: Mario Rossi' })).toBeInTheDocument()
  })

  it('ignores stale permission responses when another user is opened later', async () => {
    const user = userEvent.setup()
    const luigiDetail: AdminUserPermissionDetail = {
      ...initialDetail,
      user: {
        id: clientUserRow.id,
        email: clientUserRow.email,
        firstName: clientUserRow.firstName,
        lastName: clientUserRow.lastName,
        isActive: clientUserRow.isActive,
      },
      roles: clientUserRow.roles,
      directPermissions: [permissionCatalog[0]],
      effectivePermissions: [permissionCatalog[0]],
    }
    const firstDetail = createDeferred<AdminUserPermissionDetail>()
    const secondDetail = createDeferred<AdminUserPermissionDetail>()

    mockUsersApi.list.mockResolvedValueOnce({
      data: [userRow, clientUserRow],
      pagination: { page: 1, pageSize: 2, total: 2, totalPages: 1 },
    })
    mockPermissionsApi.getUserPermissions.mockImplementation((id: string) => {
      return id === userRow.id ? firstDetail.promise : secondDetail.promise
    })

    renderPage()

    const marioRow = (await screen.findByText('Mario Rossi')).closest('tr')
    const luigiRow = (await screen.findByText('Luigi Bianchi')).closest('tr')

    expect(marioRow).not.toBeNull()
    expect(luigiRow).not.toBeNull()

    await user.click(within(marioRow as HTMLTableRowElement).getByRole('button', { name: 'Permessi' }))
    await user.click(within(luigiRow as HTMLTableRowElement).getByRole('button', { name: 'Permessi' }))

    secondDetail.resolve(luigiDetail)

    const dialog = await screen.findByRole('dialog', { name: 'Permessi utente: Luigi Bianchi' })
    expect(within(dialog).getByText('Impresario funebre')).toBeInTheDocument()
    expect(within(dialog).queryByText('Manager')).toBeNull()

    firstDetail.resolve(initialDetail)

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Permessi utente: Luigi Bianchi' })).toBeInTheDocument()
      expect(within(dialog).getByText('Impresario funebre')).toBeInTheDocument()
      expect(within(dialog).queryByText('Manager')).toBeNull()
    })
  })

  it('ignores stale permission saves after another user is opened', async () => {
    const user = userEvent.setup()
    const luigiDetail: AdminUserPermissionDetail = {
      ...initialDetail,
      user: {
        id: clientUserRow.id,
        email: clientUserRow.email,
        firstName: clientUserRow.firstName,
        lastName: clientUserRow.lastName,
        isActive: clientUserRow.isActive,
      },
      roles: clientUserRow.roles,
      directPermissions: [permissionCatalog[0]],
      effectivePermissions: [permissionCatalog[0]],
    }
    const marioSave = createDeferred<AdminUserPermissionDetail>()

    mockUsersApi.list.mockResolvedValueOnce({
      data: [userRow, clientUserRow],
      pagination: { page: 1, pageSize: 2, total: 2, totalPages: 1 },
    })
    mockPermissionsApi.getUserPermissions.mockImplementation((id: string) => {
      return Promise.resolve(id === userRow.id ? initialDetail : luigiDetail)
    })
    mockPermissionsApi.updateUserPermissions.mockImplementation((id: string) => {
      return id === userRow.id ? marioSave.promise : Promise.resolve(updatedDetail)
    })

    renderPage()

    const marioRow = (await screen.findByText('Mario Rossi')).closest('tr')
    const luigiRow = (await screen.findByText('Luigi Bianchi')).closest('tr')

    expect(marioRow).not.toBeNull()
    expect(luigiRow).not.toBeNull()

    await user.click(within(marioRow as HTMLTableRowElement).getByRole('button', { name: 'Permessi' }))
    const marioDialog = await screen.findByRole('dialog', { name: 'Permessi utente: Mario Rossi' })
    await user.click(within(marioDialog).getByRole('checkbox', { name: 'Visualizzare ruoli' }))
    await user.click(within(marioDialog).getByRole('checkbox', { name: 'Gestire utenti' }))
    await user.click(within(marioDialog).getByRole('button', { name: 'Salva permessi' }))

    await user.click(within(marioDialog).getAllByRole('button', { name: 'Chiudi' })[0])
    await user.click(within(luigiRow as HTMLTableRowElement).getByRole('button', { name: 'Permessi' }))

    const luigiDialog = await screen.findByRole('dialog', { name: 'Permessi utente: Luigi Bianchi' })
    expect(within(luigiDialog).getByText('Impresario funebre')).toBeInTheDocument()
    expect(within(luigiDialog).queryByText('Manager')).toBeNull()

    marioSave.resolve(updatedDetail)

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Permessi utente: Luigi Bianchi' })).toBeInTheDocument()
      expect(within(luigiDialog).getByText('Impresario funebre')).toBeInTheDocument()
      expect(within(luigiDialog).queryByText('Manager')).toBeNull()
    })
  })

  it('renders the listino modal with accessible dialog semantics and placeholder-only empty state', async () => {
    const user = userEvent.setup()

    mockUsersApi.list.mockResolvedValueOnce({
      data: [clientUserRow],
      pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
    })
    mockRolesApi.list.mockResolvedValueOnce({
      data: clientUserRow.roles,
      pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
    })
    mockPricelistsApi.list.mockResolvedValueOnce({
      data: [
        { id: 'funeral-1', name: 'Funebre Base', type: 'sale', articleType: 'funeral', parentId: null, autoUpdate: false, _count: { items: 0 } },
        { id: 'marmista-1', name: 'Marmista Base', type: 'sale', articleType: 'marmista', parentId: null, autoUpdate: false, _count: { items: 0 } },
      ],
      pagination: { page: 1, pageSize: 2, total: 2, totalPages: 1 },
    })

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Listino' }))

    const dialog = await screen.findByRole('dialog', { name: 'Assegna Listino — Luigi Bianchi' })
    const closeButton = within(dialog).getByRole('button', { name: 'Chiudi' })
    const funeralSelect = within(dialog).getByLabelText('Listino Cofani')
    const assignButton = within(dialog).getByRole('button', { name: 'Assegna' })

    expect(closeButton).toBeInTheDocument()
    expect(within(dialog).queryByRole('option', { name: '— Nessuno —' })).toBeNull()
    expect(within(dialog).getByRole('option', { name: 'Seleziona listino cofani' })).toBeDisabled()
    expect(assignButton).toBeDisabled()

    await user.selectOptions(funeralSelect, 'funeral-1')

    expect(assignButton).toBeEnabled()
  })

  it('shows an inline error when listino assignment fails', async () => {
    const user = userEvent.setup()

    mockUsersApi.list.mockResolvedValueOnce({
      data: [clientUserRow],
      pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
    })
    mockRolesApi.list.mockResolvedValueOnce({
      data: clientUserRow.roles,
      pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
    })
    mockPricelistsApi.list.mockResolvedValueOnce({
      data: [
        { id: 'funeral-1', name: 'Funebre Base', type: 'sale', articleType: 'funeral', parentId: null, autoUpdate: false, _count: { items: 0 } },
      ],
      pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
    })
    mockPricelistsApi.assign.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Assegnazione listino non riuscita',
        },
      },
    })

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Listino' }))

    const dialog = await screen.findByRole('dialog', { name: 'Assegna Listino — Luigi Bianchi' })
    await user.selectOptions(within(dialog).getByLabelText('Listino Cofani'), 'funeral-1')
    await user.click(within(dialog).getByRole('button', { name: 'Assegna' }))

    expect(await within(dialog).findByText('Assegnazione listino non riuscita')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Assegna Listino — Luigi Bianchi' })).toBeInTheDocument()
  })
})

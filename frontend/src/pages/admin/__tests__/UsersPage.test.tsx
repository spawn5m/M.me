import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import UsersPage from '../UsersPage'

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

import { usersApi } from '../../../lib/admin/users-api'
import { rolesApi } from '../../../lib/admin/roles-api'
import { pricelistsApi } from '../../../lib/api/pricelists'

const mockUsersApi = vi.mocked(usersApi)
const mockRolesApi = vi.mocked(rolesApi)
const mockPricelistsApi = vi.mocked(pricelistsApi)

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
  accessoriesPriceList: null,
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
  accessoriesPriceList: null,
  createdAt: '2026-04-08T10:00:00.000Z',
  updatedAt: '2026-04-08T10:00:00.000Z',
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
  })

  it('does not render a Permessi action for user rows', async () => {
    renderPage()

    expect(await screen.findByText(userRow.email)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Permessi' })).toBeNull()
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

  it('moves focus into the listino modal, traps tab navigation, and restores focus on Escape', async () => {
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

    expect(closeButton).toHaveFocus()

    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()

    expect(closeButton).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Assegna Listino — Luigi Bianchi' })).toBeNull()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Listino' })).toHaveFocus()
    })
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

  it('keeps the page usable when role options cannot be loaded', async () => {
    const user = userEvent.setup()

    mockRolesApi.list.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Ruoli non disponibili',
        },
      },
    })

    renderPage()

    expect(await screen.findByText(userRow.email)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Nuovo utente' }))

    const createDialog = screen.getByRole('dialog', { name: 'Nuovo utente' })

    expect(within(createDialog).getByRole('alert')).toHaveTextContent('Ruoli non disponibili')
    expect(within(createDialog).queryByRole('button', { name: 'Manager' })).toBeNull()
    expect(within(createDialog).getByRole('button', { name: 'Salva' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Modifica' }))

    const editDialog = await screen.findByRole('dialog', { name: 'Modifica — Mario Rossi' })

    expect(within(editDialog).getByRole('alert')).toHaveTextContent('Ruoli non disponibili')
    expect(within(editDialog).getByText('Manager')).toBeInTheDocument()
    expect(within(editDialog).getByRole('button', { name: 'Salva modifiche' })).toBeEnabled()
  })

  it('exposes selected role state in create and edit modals', async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(screen.getByRole('button', { name: '+ Nuovo utente' }))

    const createDialog = screen.getByRole('dialog', { name: 'Nuovo utente' })
    const createRoleButton = within(createDialog).getByRole('button', { name: 'Manager' })

    expect(createRoleButton).toHaveAttribute('aria-pressed', 'false')

    await user.click(createRoleButton)

    expect(createRoleButton).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    await user.click(screen.getByRole('button', { name: 'Modifica' }))

    const editDialog = await screen.findByRole('dialog', { name: 'Modifica — Mario Rossi' })
    const editRoleButton = within(editDialog).getByRole('button', { name: 'Manager' })

    expect(editRoleButton).toHaveAttribute('aria-pressed', 'true')

    await user.click(editRoleButton)

    expect(editRoleButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('associates create and edit user inputs with programmatic labels', async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(screen.getByRole('button', { name: '+ Nuovo utente' }))

    const createDialog = screen.getByRole('dialog', { name: 'Nuovo utente' })

    expect(within(createDialog).getByLabelText('Nome')).toBeInTheDocument()
    expect(within(createDialog).getByLabelText('Cognome')).toBeInTheDocument()
    expect(within(createDialog).getByLabelText('Email')).toBeInTheDocument()
    expect(within(createDialog).getByLabelText('Password')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    await user.click(screen.getByRole('button', { name: 'Modifica' }))

    const editDialog = await screen.findByRole('dialog', { name: 'Modifica — Mario Rossi' })

    expect(within(editDialog).getByLabelText('Nome')).toBeInTheDocument()
    expect(within(editDialog).getByLabelText('Cognome')).toBeInTheDocument()
    expect(within(editDialog).getByLabelText('Email')).toBeInTheDocument()
  })
})

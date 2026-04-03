import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RolesPage from '../admin/RolesPage'

vi.mock('../../lib/admin/roles-api', () => ({
  rolesApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn()
  }
}))

import { rolesApi } from '../../lib/admin/roles-api'
const mockRolesApi = vi.mocked(rolesApi)

const mockRoles = {
  data: [
    { id: '1', name: 'super_admin', label: 'Super Admin', isSystem: true },
    { id: '2', name: 'manager', label: 'Manager', isSystem: true },
    { id: '3', name: 'ruolo_custom', label: 'Ruolo Custom', isSystem: false }
  ],
  pagination: { page: 1, pageSize: 3, total: 3, totalPages: 1 }
}

describe('RolesPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mostra i ruoli nella tabella', async () => {
    mockRolesApi.list.mockResolvedValueOnce(mockRoles)
    render(<MemoryRouter><RolesPage /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText('Super Admin')).toBeTruthy()
      expect(screen.getByText('Manager')).toBeTruthy()
      expect(screen.getByText('Ruolo Custom')).toBeTruthy()
    })
  })

  it('mostra badge Sistema e Custom', async () => {
    mockRolesApi.list.mockResolvedValueOnce(mockRoles)
    render(<MemoryRouter><RolesPage /></MemoryRouter>)

    await waitFor(() => {
      const sistemaBadges = screen.getAllByText('Sistema')
      expect(sistemaBadges.length).toBe(2)
      expect(screen.getByText('Custom')).toBeTruthy()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, getDefaultRoute, useAuth } from '../../../context/AuthContext'

// Mock dell'API
vi.mock('../../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

import api from '../../../lib/api'
const mockApi = vi.mocked(api)

function TestConsumer() {
  const { user, isLoading, roles, permissions, hasPermission, hasAnyPermission } = useAuth()
  if (isLoading) return <div>loading</div>
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <span data-testid="roles">{roles.join(',')}</span>
      <span data-testid="permissions">{permissions.join(',')}</span>
      <span data-testid="has-roles-read">{String(hasPermission('roles.read'))}</span>
      <span data-testid="has-any-pricelists">{String(hasAnyPermission(['pricelists.sale.read', 'pricelists.purchase.read']))}</span>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('imposta user dopo una chiamata riuscita a /auth/me', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        user: {
          id: '1',
          email: 'test@test.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['manager'],
          isActive: true
        },
        permissions: ['roles.read', 'pricelists.sale.read']
      }
    })

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@test.com')
      expect(screen.getByTestId('roles').textContent).toBe('manager')
      expect(screen.getByTestId('permissions').textContent).toBe('roles.read,pricelists.sale.read')
      expect(screen.getByTestId('has-roles-read').textContent).toBe('true')
      expect(screen.getByTestId('has-any-pricelists').textContent).toBe('true')
    })
  })

  it('user rimane null se /auth/me fallisce', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('401'))

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null')
      expect(screen.getByTestId('permissions').textContent).toBe('')
      expect(screen.getByTestId('has-roles-read').textContent).toBe('false')
    })
  })

  it('calcola una route admin accessibile anche senza permesso dashboard', () => {
    expect(getDefaultRoute(
      { id: '1', email: 'admin@test.com', firstName: 'Admin', lastName: 'User', roles: ['manager'], isActive: true },
      ['roles.read']
    )).toBe('/admin/roles')
  })

  it('calcola una route client accessibile anche senza permesso dashboard', () => {
    expect(getDefaultRoute(
      { id: '1', email: 'client@test.com', firstName: 'Client', lastName: 'User', roles: ['impresario_funebre'], isActive: true },
      ['client.catalog.funeral.read']
    )).toBe('/client/catalog/funeral')
  })

  it('mantiene il default admin dentro le route admin quando richiesto', () => {
    expect(getDefaultRoute(
      { id: '1', email: 'hybrid@test.com', firstName: 'Hybrid', lastName: 'User', roles: ['manager', 'impresario_funebre'], isActive: true },
      ['roles.read', 'client.catalog.funeral.read'],
      'admin'
    )).toBe('/admin/roles')
  })

  it('calcola la route manutenzione se è l unico permesso admin disponibile', () => {
    expect(getDefaultRoute(
      { id: '1', email: 'maint@test.com', firstName: 'Maint', lastName: 'User', roles: ['manager'], isActive: true },
      ['maintenance.manage'],
      'admin'
    )).toBe('/admin/maintenance')
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'

// Mock useAuth
vi.mock('../../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../context/AuthContext')>()
  return {
    ...actual,
    useAuth: vi.fn()
  }
})

import { useAuth } from '../../../context/AuthContext'
const mockUseAuth = vi.mocked(useAuth)

function makeAuth(overrides = {}) {
  return {
    user: null,
    roles: [],
    permissions: [],
    isLoading: false,
    hasPermission: () => false,
    hasAnyPermission: () => false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    ...overrides
  }
}

describe('ProtectedRoute', () => {
  it('mostra spinner durante il caricamento', () => {
    mockUseAuth.mockReturnValue(makeAuth({ isLoading: true }))
    render(
      <MemoryRouter>
        <ProtectedRoute><div>contenuto</div></ProtectedRoute>
      </MemoryRouter>
    )
    expect(screen.queryByText('contenuto')).toBeNull()
  })

  it('reindirizza a /login se non autenticato', () => {
    mockUseAuth.mockReturnValue(makeAuth({ user: null }))
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute><div>admin</div></ProtectedRoute>} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('login page')).toBeTruthy()
  })

  it('mostra il contenuto se autenticato senza ruoli richiesti', () => {
    const user = { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', roles: ['manager'], isActive: true }
    mockUseAuth.mockReturnValue(makeAuth({ user }))
    render(
      <MemoryRouter>
        <ProtectedRoute><div>contenuto protetto</div></ProtectedRoute>
      </MemoryRouter>
    )
    expect(screen.getByText('contenuto protetto')).toBeTruthy()
  })

  it('mostra il contenuto se ha almeno uno dei permessi richiesti con match any', () => {
    const user = { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', roles: ['manager'], isActive: true }
    mockUseAuth.mockReturnValue(makeAuth({
      user,
      hasAnyPermission: (required: string[]) => required.includes('roles.read')
    }))

    render(
      <MemoryRouter>
        <ProtectedRoute requiredPermissions={['roles.read', 'users.read.all']}>
          <div>contenuto permesso</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('contenuto permesso')).toBeTruthy()
  })

  it('reindirizza se match all richiede tutti i permessi e ne manca uno', () => {
    const user = { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', roles: ['manager'], isActive: true }
    mockUseAuth.mockReturnValue(makeAuth({
      user,
      permissions: ['roles.read'],
      hasPermission: (permission: string) => permission === 'roles.read'
    }))

    render(
      <MemoryRouter initialEntries={['/admin/roles/manage']}>
        <Routes>
          <Route
            path="/admin/roles/manage"
            element={
              <ProtectedRoute requiredPermissions={['roles.read', 'roles.manage']} match="all">
                <div>ruoli</div>
              </ProtectedRoute>
            }
          />
          <Route path="/admin/roles" element={<div>lista ruoli</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('lista ruoli')).toBeTruthy()
  })

  it('mantiene il fallback dentro admin anche con permessi client aggiuntivi', () => {
    const user = { id: '1', email: 'hybrid@test.com', firstName: 'Hybrid', lastName: 'User', roles: ['manager', 'impresario_funebre'], isActive: true }
    mockUseAuth.mockReturnValue(makeAuth({
      user,
      permissions: ['roles.read', 'client.catalog.funeral.read'],
      hasAnyPermission: () => false
    }))

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredPermissions={['dashboard.admin.read']}>
                <div>dashboard admin</div>
              </ProtectedRoute>
            }
          />
          <Route path="/admin/roles" element={<div>lista ruoli</div>} />
          <Route path="/client/catalog/funeral" element={<div>catalogo funebre</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('lista ruoli')).toBeTruthy()
    expect(screen.queryByText('catalogo funebre')).toBeNull()
  })
})

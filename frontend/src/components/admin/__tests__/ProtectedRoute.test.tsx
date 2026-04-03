import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute'

// Mock useAuth
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

import { useAuth } from '../../../context/AuthContext'
const mockUseAuth = vi.mocked(useAuth)

function makeAuth(overrides = {}) {
  return {
    user: null,
    roles: [],
    isLoading: false,
    hasRole: () => false,
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
    mockUseAuth.mockReturnValue(makeAuth({ user, hasRole: () => true }))
    render(
      <MemoryRouter>
        <ProtectedRoute><div>contenuto protetto</div></ProtectedRoute>
      </MemoryRouter>
    )
    expect(screen.getByText('contenuto protetto')).toBeTruthy()
  })
})

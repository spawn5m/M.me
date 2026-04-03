import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminSidebar from '../AdminSidebar'

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

import { useAuth } from '../../../context/AuthContext'
const mockUseAuth = vi.mocked(useAuth)

function makeAuth(roles: string[]) {
  return {
    user: { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', roles, isActive: true },
    roles,
    isLoading: false,
    hasRole: (r: string | string[]) => {
      const allowed = Array.isArray(r) ? r : [r]
      return allowed.some((role) => roles.includes(role))
    },
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn()
  }
}

describe('AdminSidebar', () => {
  it('mostra "Ruoli" solo per super_admin', () => {
    mockUseAuth.mockReturnValue(makeAuth(['super_admin']))
    render(<MemoryRouter><AdminSidebar /></MemoryRouter>)
    expect(screen.getByText('Ruoli')).toBeTruthy()
  })

  it('nasconde "Ruoli" per manager', () => {
    mockUseAuth.mockReturnValue(makeAuth(['manager']))
    render(<MemoryRouter><AdminSidebar /></MemoryRouter>)
    expect(screen.queryByText('Ruoli')).toBeNull()
  })

  it('mostra Dashboard per tutti', () => {
    mockUseAuth.mockReturnValue(makeAuth(['collaboratore']))
    render(<MemoryRouter><AdminSidebar /></MemoryRouter>)
    expect(screen.getByText('Dashboard')).toBeTruthy()
  })
})

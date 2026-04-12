import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminSidebar from '../AdminSidebar'

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

import { useAuth } from '../../../context/AuthContext'
const mockUseAuth = vi.mocked(useAuth)

function makeAuth(roles: string[], permissions: string[] = []) {
  return {
    user: { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', roles, isActive: true },
    roles,
    permissions,
    isLoading: false,
    hasPermission: (permission: string) => permissions.includes(permission),
    hasAnyPermission: (required: string[]) => required.some((permission) => permissions.includes(permission)),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn()
  }
}

describe('AdminSidebar', () => {
  it('mostra "Ruoli" per chi ha roles.read', () => {
    mockUseAuth.mockReturnValue(makeAuth(['manager'], ['roles.read']))
    render(<MemoryRouter><AdminSidebar /></MemoryRouter>)
    expect(screen.getByText('Ruoli')).toBeTruthy()
  })

  it('nasconde "Ruoli" a manager senza roles.read', () => {
    mockUseAuth.mockReturnValue(makeAuth(['manager']))
    render(<MemoryRouter><AdminSidebar /></MemoryRouter>)
    expect(screen.queryByText('Ruoli')).toBeNull()
  })

  it('nasconde "Listini" a collaboratore senza permessi pricelists', () => {
    mockUseAuth.mockReturnValue(makeAuth(['collaboratore'], ['dashboard.admin.read']))
    render(<MemoryRouter><AdminSidebar /></MemoryRouter>)
    expect(screen.queryByText('Listini')).toBeNull()
  })

  it('mostra "Listini" se ha pricelists.sale.read', () => {
    mockUseAuth.mockReturnValue(makeAuth(['collaboratore'], ['pricelists.sale.read']))
    render(<MemoryRouter><AdminSidebar /></MemoryRouter>)
    expect(screen.getByText('Listini')).toBeTruthy()
  })

  it('mostra "Listini" se ha pricelists.purchase.read', () => {
    mockUseAuth.mockReturnValue(makeAuth(['collaboratore'], ['pricelists.purchase.read']))
    render(<MemoryRouter><AdminSidebar /></MemoryRouter>)
    expect(screen.getByText('Listini')).toBeTruthy()
  })

  it('mostra una voce client quando ha il permesso client corrispondente', () => {
    mockUseAuth.mockReturnValue(makeAuth(['impresario_funebre'], ['client.catalog.funeral.read']))
    render(<MemoryRouter><AdminSidebar variant="client" /></MemoryRouter>)
    expect(screen.getByText('Catalogo Funebre')).toBeTruthy()
  })

  it('mostra "Manutenzione" per chi ha maintenance.manage', () => {
    mockUseAuth.mockReturnValue(makeAuth(['manager'], ['maintenance.manage']))
    render(<MemoryRouter initialEntries={['/admin/maintenance']}><AdminSidebar /></MemoryRouter>)
    expect(screen.getByText('Manutenzione')).toBeTruthy()
  })

  it('nasconde una voce client quando manca il permesso client corrispondente', () => {
    mockUseAuth.mockReturnValue(makeAuth(['impresario_funebre'], ['dashboard.client.read']))
    render(<MemoryRouter><AdminSidebar variant="client" /></MemoryRouter>)
    expect(screen.queryByText('Catalogo Funebre')).toBeNull()
  })

  it('mostra Dashboard per tutti', () => {
    mockUseAuth.mockReturnValue(makeAuth(['collaboratore'], ['dashboard.admin.read']))
    render(<MemoryRouter><AdminSidebar /></MemoryRouter>)
    expect(screen.getByText('Dashboard')).toBeTruthy()
  })
})

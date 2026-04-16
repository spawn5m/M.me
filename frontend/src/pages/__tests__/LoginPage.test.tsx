import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LoginPage from '../LoginPage'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({ 'home.headline': 'MIRIGLIANI', 'nav.home': 'Home' }[key] ?? key),
  }),
}))

vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>()
  return {
    ...actual,
    useAuth: vi.fn()
  }
})

vi.mock('../../context/BrandingContext', () => ({
  useBranding: () => ({ logoUrl: '/logo.svg' }),
}))

import { useAuth } from '../../context/AuthContext'
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

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renderizza form email e password', () => {
    mockUseAuth.mockReturnValue(makeAuth())
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'MIRIGLIANI' })).toBeTruthy()
    expect(screen.getByAltText('Mirigliani logo')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy()
    expect(screen.getByPlaceholderText('nome@esempio.it')).toBeTruthy()
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy()
  })

  it('chiama login con email e password al submit', async () => {
    const loginMock = vi.fn().mockResolvedValue({
      user: {
        id: '1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['manager'],
        isActive: true
      },
      permissions: ['dashboard.admin.read']
    })
    mockUseAuth.mockReturnValue(makeAuth({ login: loginMock }))

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/dashboard" element={<div>dashboard</div>} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('nome@esempio.it'), {
      target: { value: 'test@test.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' }
    })
    fireEvent.click(screen.getByText('Accedi'))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('test@test.com', 'password123')
      expect(screen.getByText('dashboard')).toBeTruthy()
    })
  })

  it('reindirizza alla prima route admin accessibile se manca dashboard.admin.read', async () => {
    const loginMock = vi.fn().mockResolvedValue({
      user: {
        id: '1',
        email: 'roles@test.com',
        firstName: 'Roles',
        lastName: 'Only',
        roles: ['manager'],
        isActive: true
      },
      permissions: ['roles.read']
    })
    mockUseAuth.mockReturnValue(makeAuth({ login: loginMock }))

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/roles" element={<div>ruoli page</div>} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('nome@esempio.it'), {
      target: { value: 'roles@test.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' }
    })
    fireEvent.click(screen.getByText('Accedi'))

    await waitFor(() => {
      expect(screen.getByText('ruoli page')).toBeTruthy()
    })
  })

  it('reindirizza alla prima route client accessibile se manca dashboard.client.read', async () => {
    const loginMock = vi.fn().mockResolvedValue({
      user: {
        id: '1',
        email: 'client@test.com',
        firstName: 'Client',
        lastName: 'Only',
        roles: ['impresario_funebre'],
        isActive: true
      },
      permissions: ['client.catalog.funeral.read']
    })
    mockUseAuth.mockReturnValue(makeAuth({ login: loginMock }))

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/client/catalog/funeral" element={<div>catalogo funebre</div>} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('nome@esempio.it'), {
      target: { value: 'client@test.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' }
    })
    fireEvent.click(screen.getByText('Accedi'))

    await waitFor(() => {
      expect(screen.getByText('catalogo funebre')).toBeTruthy()
    })
  })

  it('mostra errore se il login fallisce', async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error('401'))
    mockUseAuth.mockReturnValue(makeAuth({ login: loginMock }))

    render(<MemoryRouter><LoginPage /></MemoryRouter>)

    fireEvent.change(screen.getByPlaceholderText('nome@esempio.it'), {
      target: { value: 'bad@test.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpassword' }
    })
    fireEvent.click(screen.getByText('Accedi'))

    await waitFor(() => {
      expect(screen.getByText('Credenziali non valide. Riprova.')).toBeTruthy()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LoginPage from '../LoginPage'

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

import { useAuth } from '../../context/AuthContext'
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

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renderizza form email e password', () => {
    mockUseAuth.mockReturnValue(makeAuth())
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    expect(screen.getByPlaceholderText('nome@esempio.it')).toBeTruthy()
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy()
  })

  it('chiama login con email e password al submit', async () => {
    const loginMock = vi.fn().mockResolvedValue(undefined)
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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../../../context/AuthContext'

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
  const { user, isLoading, roles } = useAuth()
  if (isLoading) return <div>loading</div>
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <span data-testid="roles">{roles.join(',')}</span>
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
        }
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
    })
  })
})

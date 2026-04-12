import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PublicPageRoute from '../PublicPageRoute'

vi.mock('../../../context/MaintenanceContext', () => ({
  useMaintenance: vi.fn(),
}))

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
  getDefaultRoute: () => '/login',
}))

vi.mock('../../../context/BrandingContext', () => ({
  useBranding: () => ({ logoUrl: null }),
}))

vi.mock('../Navbar', () => ({
  default: ({ variant }: { variant: 'dark' | 'light' }) => <div data-testid={`navbar-${variant}`} />,
}))

vi.mock('../FooterLight', () => ({
  default: () => <div data-testid="footer-light" />,
}))

vi.mock('../PublicMaintenanceScreen', () => ({
  default: ({ variant, message, showReservedAreaButton }: { variant: string; message: string; showReservedAreaButton?: boolean }) => (
    <div data-testid="maintenance-screen" data-variant={variant} data-reserved={String(Boolean(showReservedAreaButton))}>
      {message}
    </div>
  ),
}))

import { useMaintenance } from '../../../context/MaintenanceContext'
import { useAuth } from '../../../context/AuthContext'

const mockUseMaintenance = vi.mocked(useMaintenance)
const mockUseAuth = vi.mocked(useAuth)

function renderRoute(page: 'home' | 'ourStory' | 'whereWeAre' | 'funeralHomes' | 'marmistas', pages: Record<string, { enabled: boolean }>) {
  mockUseMaintenance.mockReturnValue({ pages: pages as never, refresh: vi.fn() })
  return render(
    <MemoryRouter>
      <PublicPageRoute page={page}>
        <div data-testid="child">child</div>
      </PublicPageRoute>
    </MemoryRouter>
  )
}

describe('PublicPageRoute', () => {
beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  mockUseAuth.mockReturnValue({ user: null, permissions: [], isLoading: false } as never)
})

  it('mostra il child normale per una pagina pubblica attiva', () => {
    renderRoute('ourStory', {
      home: { enabled: false },
      ourStory: { enabled: false },
      whereWeAre: { enabled: false },
      funeralHomes: { enabled: false },
      marmistas: { enabled: false },
    })

    expect(screen.getByTestId('navbar-light')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByTestId('footer-light')).toBeInTheDocument()
  })

  it('mostra la manutenzione della pagina interna quando attiva', () => {
    renderRoute('whereWeAre', {
      home: { enabled: false },
      ourStory: { enabled: false },
      whereWeAre: { enabled: true },
      funeralHomes: { enabled: false },
      marmistas: { enabled: false },
    })

    expect(screen.getByTestId('maintenance-screen')).toHaveTextContent('Questa pagina è temporaneamente in manutenzione.')
    expect(screen.queryByTestId('child')).toBeNull()
  })

  it('mostra la manutenzione dark globale se Home è attiva', () => {
    renderRoute('home', {
      home: { enabled: true },
      ourStory: { enabled: false },
      whereWeAre: { enabled: false },
      funeralHomes: { enabled: false },
      marmistas: { enabled: false },
    })

    expect(screen.getByTestId('maintenance-screen')).toHaveAttribute('data-variant', 'dark')
    expect(screen.getByTestId('maintenance-screen')).toHaveAttribute('data-reserved', 'true')
  })

  it('bypassa la manutenzione globale per gli admin con preview attiva', () => {
    window.sessionStorage.setItem('admin-maintenance-preview-enabled', 'true')
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      permissions: ['maintenance.manage'],
    } as never)

    renderRoute('home', {
      home: { enabled: true },
      ourStory: { enabled: false },
      whereWeAre: { enabled: false },
      funeralHomes: { enabled: false },
      marmistas: { enabled: false },
    })

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.queryByTestId('maintenance-screen')).toBeNull()
  })

  it('mantiene il layout pubblico normale quando la preview admin e attiva', () => {
    window.sessionStorage.setItem('admin-maintenance-preview-enabled', 'true')
    mockUseAuth.mockReturnValue({
      user: { id: '1' },
      permissions: ['maintenance.manage'],
    } as never)

    renderRoute('whereWeAre', {
      home: { enabled: false },
      ourStory: { enabled: false },
      whereWeAre: { enabled: true },
      funeralHomes: { enabled: false },
      marmistas: { enabled: false },
    })

    expect(screen.getByTestId('navbar-light')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByTestId('footer-light')).toBeInTheDocument()
    expect(screen.queryByTestId('maintenance-screen')).toBeNull()
  })

  it('mantiene la manutenzione per chi non ha maintenance.manage anche con preview attiva', () => {
    window.sessionStorage.setItem('admin-maintenance-preview-enabled', 'true')

    renderRoute('whereWeAre', {
      home: { enabled: false },
      ourStory: { enabled: false },
      whereWeAre: { enabled: true },
      funeralHomes: { enabled: false },
      marmistas: { enabled: false },
    })

    expect(screen.getByTestId('maintenance-screen')).toHaveTextContent('Questa pagina è temporaneamente in manutenzione.')
    expect(screen.queryByTestId('child')).toBeNull()
  })

  it('aspetta l hydration auth quando la preview e attiva', () => {
    window.sessionStorage.setItem('admin-maintenance-preview-enabled', 'true')
    mockUseAuth.mockReturnValue({
      user: null,
      permissions: [],
      isLoading: true,
    } as never)

    renderRoute('home', {
      home: { enabled: true },
      ourStory: { enabled: false },
      whereWeAre: { enabled: false },
      funeralHomes: { enabled: false },
      marmistas: { enabled: false },
    })

    expect(screen.queryByTestId('maintenance-screen')).toBeNull()
    expect(screen.queryByTestId('child')).toBeNull()
  })
})

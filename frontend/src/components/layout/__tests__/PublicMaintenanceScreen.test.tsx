import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PublicMaintenanceScreen from '../PublicMaintenanceScreen'

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, permissions: [] }),
  getDefaultRoute: () => '/login',
}))

vi.mock('../../../context/BrandingContext', () => ({
  useBranding: () => ({ logoUrl: '/logo.svg' }),
}))

describe('PublicMaintenanceScreen', () => {
  it('renders the dark global maintenance screen with reserved area and contact actions', () => {
    render(
      <MemoryRouter>
        <PublicMaintenanceScreen
          variant="dark"
          message="Stiamo lavorando per migliorare il sito. Torneremo presto con grandi novita'."
          showHeadline
          showReservedAreaButton
        />
      </MemoryRouter>,
    )

    const reservedAreaLink = screen.getByRole('link', { name: 'Area Riservata' })
    const contactLink = screen.getByRole('link', { name: 'Contattaci' })
    const logo = screen.getByAltText('Mirigliani logo')
    const headline = screen.getByRole('heading', { name: 'MIRIGLIANI' })

    expect(logo).toHaveStyle({ width: 'clamp(6rem, 14vw, 12rem)', height: 'auto' })
    expect(headline).toBeInTheDocument()
    expect(headline).toHaveStyle({ fontSize: 'clamp(4rem, 12vw, 10rem)', color: '#FFFFFF' })
    expect(screen.getByText("Stiamo lavorando per migliorare il sito. Torneremo presto con grandi novita'.")).toBeInTheDocument()
    expect(reservedAreaLink).toHaveAttribute('href', '/login')
    expect(reservedAreaLink.className).toContain('focus-visible:outline')
    expect(contactLink).toHaveAttribute('href', 'mailto:info@mirigliani.me')
    expect(contactLink.className).toContain('focus-visible:outline')
  })

  it('keeps the light maintenance variant free of global CTAs', () => {
    render(
      <MemoryRouter>
        <PublicMaintenanceScreen
          variant="light"
          message="Questa pagina e temporaneamente in manutenzione."
        />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: 'Area Riservata' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Contattaci' })).toBeNull()
  })
})

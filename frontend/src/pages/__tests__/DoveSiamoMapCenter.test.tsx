import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DoveSiamoPage from '../DoveSiamoPage'

vi.mock('../../lib/api/maps', () => ({
  fetchPublicMaps: vi.fn().mockResolvedValue({
    data: {
      offices: {
        villamar: { lat: 39.608685, lng: 8.952865 },
        sassari: { lat: 40.78027, lng: 8.49902 },
      },
    },
  }),
}))

vi.mock('../../components/ContactForm', () => ({
  default: () => <div>Mock contact form</div>,
}))

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ center, zoom }: { center: [number, number]; zoom: number }) => {
    const [initialCenter] = React.useState(center)
    return (
      <div>
        <div data-testid="map-center">{initialCenter.join(',')}</div>
        <div data-testid="map-zoom">{zoom}</div>
      </div>
    )
  },
  TileLayer: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
  },
}))

vi.mock('leaflet/dist/leaflet.css', () => ({}))
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: '' }))
vi.mock('leaflet/dist/images/marker-icon-2x.png', () => ({ default: '' }))
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: '' }))

describe('DoveSiamoPage map center updates', () => {
  it('remounts maps with fetched coordinates after async load', async () => {
    render(
      <MemoryRouter>
        <DoveSiamoPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByTestId('map-center').map((node) => node.textContent)).toEqual([
        '39.608685,8.952865',
        '40.78027,8.49902',
      ])
    })

    expect(screen.getAllByTestId('map-zoom').map((node) => node.textContent)).toEqual(['18', '18'])
  })
})

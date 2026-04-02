import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ImpreseFunebrePage from '../ImpreseFunebrePage'
import MarmistiPage from '../MarmistiPage'
import NostraStoriaPage from '../NostraStoriaPage'
import DoveSiamoPage from '../DoveSiamoPage'
import itJSON from '../../locales/it.json'

// Mock react-leaflet to avoid DOM issues in jsdom
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock leaflet itself to avoid import errors
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

// Mock leaflet CSS
vi.mock('leaflet/dist/leaflet.css', () => ({}))
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: '' }))
vi.mock('leaflet/dist/images/marker-icon-2x.png', () => ({ default: '' }))
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: '' }))

// Mock hooks — return empty arrays to avoid API calls
vi.mock('../../hooks/useCoffins', () => ({
  useCoffins: () => ({ items: [], loading: false, error: null, pagination: null }),
}))
vi.mock('../../hooks/useAccessories', () => ({
  useAccessories: () => ({ items: [], loading: false, error: null, pagination: null }),
}))
vi.mock('../../hooks/useCeabis', () => ({
  useCeabis: () => ({ items: [], loading: false, error: null, pagination: null }),
}))
vi.mock('../../hooks/useMarmista', () => ({
  useMarmista: () => ({ items: [], loading: false, error: null, pagination: null }),
}))

// Setup i18n for tests
const testI18n = i18n.createInstance()
await testI18n.use(initReactI18next).init({
  lng: 'it',
  resources: {
    it: { translation: itJSON },
  },
  interpolation: { escapeValue: false },
})

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <I18nextProvider i18n={testI18n}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>
  )
}

describe('Pagine interne', () => {
  // Test 1: ImpreseFunebrePage
  it('ImpreseFunebrePage monta senza errori e mostra "Per le Imprese Funebri"', () => {
    renderWithProviders(<ImpreseFunebrePage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Per le Imprese Funebri')
  })

  // Test 2: MarmistiPage
  it('MarmistiPage monta senza errori e mostra "Per i Marmisti"', () => {
    renderWithProviders(<MarmistiPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Per i Marmisti')
  })

  // Test 3: NostraStoriaPage
  it('NostraStoriaPage monta senza errori e mostra "Mirigliani"', () => {
    renderWithProviders(<NostraStoriaPage />)
    // The hero title "Mirigliani" — look for the h1
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Mirigliani')
  })

  // Test 4: DoveSiamoPage
  it('DoveSiamoPage monta senza errori e mostra "Dove Siamo"', () => {
    renderWithProviders(<DoveSiamoPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dove Siamo')
  })
})

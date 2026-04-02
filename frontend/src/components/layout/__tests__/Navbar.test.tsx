import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import it_translation from '../../../locales/it.json'
import Navbar from '../Navbar'

// Bootstrap i18n for tests
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'it',
    fallbackLng: 'it',
    resources: { it: { translation: it_translation } },
    interpolation: { escapeValue: false },
  })
}

function renderNavbar(variant: 'dark' | 'light') {
  return render(
    <MemoryRouter>
      <Navbar variant={variant} />
    </MemoryRouter>
  )
}

describe('Navbar', () => {
  // Test 1: variant dark mostra wordmark con stile corretto
  it('variant dark mostra il wordmark con classe testo bianco', () => {
    renderNavbar('dark')
    const wordmark = screen.getByTestId('navbar-wordmark')
    expect(wordmark).toBeInTheDocument()
    expect(wordmark.textContent).toBe('MIRIGLIANI')
    expect(wordmark.className).toMatch(/text-white/)
  })

  // Test 2: variant light mostra wordmark con stile corretto
  it('variant light mostra il wordmark con classe testo navy', () => {
    renderNavbar('light')
    const wordmark = screen.getByTestId('navbar-wordmark')
    expect(wordmark).toBeInTheDocument()
    expect(wordmark.textContent).toBe('MIRIGLIANI')
    // light wordmark deve avere colore primario (non bianco)
    expect(wordmark.className).not.toMatch(/text-white/)
  })

  // Test 3: entrambe le varianti mostrano i 5 link di navigazione
  it('variant dark mostra tutti e 5 i link di navigazione', () => {
    renderNavbar('dark')
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'La Nostra Storia' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dove Siamo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Per le Imprese Funebri' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Per i Marmisti' })).toBeInTheDocument()
  })

  it('variant light mostra tutti e 5 i link di navigazione', () => {
    renderNavbar('light')
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'La Nostra Storia' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dove Siamo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Per le Imprese Funebri' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Per i Marmisti' })).toBeInTheDocument()
  })

  // Test 4: CTA "AREA RISERVATA" è presente in entrambe le varianti
  it('variant dark mostra il pulsante AREA RISERVATA', () => {
    renderNavbar('dark')
    const cta = screen.getByTestId('navbar-cta')
    expect(cta).toBeInTheDocument()
    expect(cta.textContent).toMatch(/AREA RISERVATA/i)
  })

  it('variant light mostra il pulsante AREA RISERVATA', () => {
    renderNavbar('light')
    const cta = screen.getByTestId('navbar-cta')
    expect(cta).toBeInTheDocument()
    expect(cta.textContent).toMatch(/AREA RISERVATA/i)
  })
})

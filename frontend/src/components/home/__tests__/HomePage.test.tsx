import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import it_translation from '../../../locales/it.json'
import HomePage from '../../../pages/HomePage'

// Bootstrap i18n for tests
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'it',
    fallbackLng: 'it',
    resources: { it: { translation: it_translation } },
    interpolation: { escapeValue: false },
  })
}

function renderHomePage() {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <HomePage />
      </I18nextProvider>
    </MemoryRouter>
  )
}

describe('HomePage', () => {
  // Test 1: HomePage monta senza errori
  it('monta senza errori', () => {
    renderHomePage()
    expect(document.body).toBeTruthy()
  })

  // Test 2: contiene wordmark principale
  it('contiene la headline principale', () => {
    renderHomePage()
    expect(screen.getByText(/MIRIGLIANI/i)).toBeInTheDocument()
  })

  // Test 3: contiene link a /imprese-funebri
  it('contiene un link verso /imprese-funebri', () => {
    renderHomePage()
    const links = screen.getAllByRole('link')
    const funebriLink = links.find(
      (l) => l.getAttribute('href') === '/imprese-funebri'
    )
    expect(funebriLink).toBeDefined()
  })

  // Test 4: contiene link a /marmisti
  it('contiene un link verso /marmisti', () => {
    renderHomePage()
    const links = screen.getAllByRole('link')
    const marmistiLink = links.find(
      (l) => l.getAttribute('href') === '/marmisti'
    )
    expect(marmistiLink).toBeDefined()
  })
})

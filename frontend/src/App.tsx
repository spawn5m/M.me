import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function PlaceholderPage({ name }: { name: string }) {
  const { t } = useTranslation()
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>{name}</h1>
      <p style={{ color: '#666' }}>Pagina disponibile dalla Fase 2.</p>
      <p><a href="/">{t('nav.home')}</a></p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlaceholderPage name="Home" />} />
        <Route path="/storia" element={<PlaceholderPage name="La Nostra Storia" />} />
        <Route path="/dove-siamo" element={<PlaceholderPage name="Dove Siamo" />} />
        <Route path="/imprese-funebri" element={<PlaceholderPage name="Per le Imprese Funebri" />} />
        <Route path="/marmisti" element={<PlaceholderPage name="Per i Marmisti" />} />
        <Route path="/area-riservata" element={<PlaceholderPage name="Area Riservata" />} />
      </Routes>
    </BrowserRouter>
  )
}

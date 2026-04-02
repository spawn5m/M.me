import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from './components/layout/Navbar'
import FooterLight from './components/layout/FooterLight'
import HomePage from './pages/HomePage'
import ImpreseFunebrePage from './pages/ImpreseFunebrePage'
import MarmistiPage from './pages/MarmistiPage'
import NostraStoriaPage from './pages/NostraStoriaPage'
import DoveSiamoPage from './pages/DoveSiamoPage'

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

function AppContent() {
  const location = useLocation()
  const isDark = location.pathname === '/'

  return (
    <>
      <Navbar variant={isDark ? 'dark' : 'light'} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/storia" element={<NostraStoriaPage />} />
        <Route path="/dove-siamo" element={<DoveSiamoPage />} />
        <Route path="/imprese-funebri" element={<ImpreseFunebrePage />} />
        <Route path="/marmisti" element={<MarmistiPage />} />
        <Route path="/area-riservata" element={<PlaceholderPage name="Area Riservata" />} />
      </Routes>
      {isDark ? null : <FooterLight />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

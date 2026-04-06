import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from './components/layout/Navbar'
import FooterLight from './components/layout/FooterLight'
import HomePage from './pages/HomePage'
import ImpreseFunebrePage from './pages/ImpreseFunebrePage'
import MarmistiPage from './pages/MarmistiPage'
import NostraStoriaPage from './pages/NostraStoriaPage'
import DoveSiamoPage from './pages/DoveSiamoPage'

import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/admin/ProtectedRoute'
import AdminLayout from './components/admin/AdminLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import UsersPage from './pages/admin/UsersPage'
import RolesPage from './pages/admin/RolesPage'
import LookupPage from './pages/admin/LookupPage'
import CoffinsPage from './pages/admin/CoffinsPage'
import AccessoriesPage from './pages/admin/AccessoriesPage'
import MarmistaArticlesPage from './pages/admin/MarmistaArticlesPage'
import PriceListsPage from './pages/admin/PriceListsPage'
import PriceListDetailPage from './pages/admin/PriceListDetailPage'

function PlaceholderAdmin({ name }: { name: string }) {
  return (
    <div className="text-[#6B7280] text-sm p-4">
      <h3 className="text-lg text-[#1A2B4A] mb-2">{name}</h3>
      <p>Disponibile nelle prossime fasi.</p>
    </div>
  )
}

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
      {!isDark && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/login') && (
        <Navbar variant="light" />
      )}
      <Routes>
        {/* Pubbliche */}
        <Route path="/" element={<HomePage />} />
        <Route path="/storia" element={<NostraStoriaPage />} />
        <Route path="/dove-siamo" element={<DoveSiamoPage />} />
        <Route path="/imprese-funebri" element={<ImpreseFunebrePage />} />
        <Route path="/marmisti" element={<MarmistiPage />} />
        <Route path="/area-riservata" element={<PlaceholderPage name="Area Riservata" />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin — protette */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route
            path="roles"
            element={
              <ProtectedRoute requiredRoles={['super_admin']}>
                <RolesPage />
              </ProtectedRoute>
            }
          />
          <Route path="articles/coffins" element={<CoffinsPage />} />
          <Route path="articles/accessories" element={<AccessoriesPage />} />
          <Route path="articles/marmista" element={<MarmistaArticlesPage />} />
          <Route path="catalog" element={<PlaceholderAdmin name="Catalogo PDF" />} />
          <Route path="lookups/:type" element={<LookupPage />} />
          <Route path="pricelists" element={<PriceListsPage />} />
          <Route path="pricelists/:id" element={<PriceListDetailPage />} />
        </Route>
      </Routes>
      {!isDark && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/login') && (
        <FooterLight />
      )}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from './components/layout/Navbar'
import FooterLight from './components/layout/FooterLight'

import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/admin/ProtectedRoute'

const HomePage = lazy(() => import('./pages/HomePage'))
const ImpreseFunebrePage = lazy(() => import('./pages/ImpreseFunebrePage'))
const MarmistiPage = lazy(() => import('./pages/MarmistiPage'))
const NostraStoriaPage = lazy(() => import('./pages/NostraStoriaPage'))
const DoveSiamoPage = lazy(() => import('./pages/DoveSiamoPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))

const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const RolesPage = lazy(() => import('./pages/admin/RolesPage'))
const LookupPage = lazy(() => import('./pages/admin/LookupPage'))
const CoffinsPage = lazy(() => import('./pages/admin/CoffinsPage'))
const AccessoriesPage = lazy(() => import('./pages/admin/AccessoriesPage'))
const MarmistaArticlesPage = lazy(() => import('./pages/admin/MarmistaArticlesPage'))
const PriceListsPage = lazy(() => import('./pages/admin/PriceListsPage'))
const PriceListDetailPage = lazy(() => import('./pages/admin/PriceListDetailPage'))
const MeasuresPage = lazy(() => import('./pages/admin/MeasuresPage'))

const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'))
const FuneralCatalogPage = lazy(() => import('./pages/client/FuneralCatalogPage'))
const FuneralDetailPage = lazy(() => import('./pages/client/FuneralDetailPage'))
const MarmistaClientCatalogPage = lazy(() => import('./pages/client/MarmistaClientCatalogPage'))
const MarmistaClientDetailPage = lazy(() => import('./pages/client/MarmistaClientDetailPage'))
const ChangePasswordPage = lazy(() => import('./pages/client/ChangePasswordPage'))

function PlaceholderAdmin({ name }: { name: string }) {
  return (
    <div className="border border-[#E5E0D8] bg-white p-8 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
        Area riservata
      </p>
      <h3 className="mb-3 text-3xl text-[#031634]" style={{ fontFamily: 'Playfair Display, serif' }}>
        {name}
      </h3>
      <p className="text-sm leading-relaxed text-[#6B7280]">Disponibile nelle prossime fasi.</p>
    </div>
  )
}

function PlaceholderPage({ name }: { name: string }) {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-[#FAF9F6] px-6 pb-20 pt-28 md:px-12 lg:px-20">
      <div className="mx-auto max-w-4xl border border-[#E5E0D8] bg-white p-8 shadow-[0_2px_8px_rgba(26,43,74,0.08)] md:p-12">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
          Area riservata
        </p>
        <h1 className="text-4xl text-[#031634] md:text-5xl" style={{ fontFamily: 'Playfair Display, serif' }}>
          {name}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#6B7280]">
          Pagina disponibile dalla Fase 2.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center border border-[#E5E0D8] px-4 py-2 text-sm font-medium text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]"
        >
          {t('nav.home')}
        </a>
      </div>
    </div>
  )
}

function RouteFallback({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center border border-[#E5E0D8] bg-white shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#031634] border-t-transparent" />
          <p className="text-sm uppercase tracking-[0.16em] text-[#6B7280]">Caricamento</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6] px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#031634] border-t-transparent" />
        <p className="text-sm uppercase tracking-[0.16em] text-[#6B7280]">Caricamento</p>
      </div>
    </div>
  )
}

function AppContent() {
  const location = useLocation()
  const isDark = location.pathname === '/'
  const isAdmin = location.pathname.startsWith('/admin') || location.pathname.startsWith('/client')

  return (
    <>
      {!isDark && !isAdmin && !location.pathname.startsWith('/login') && (
        <Navbar variant="light" />
      )}
      <Suspense fallback={<RouteFallback isAdmin={isAdmin} />}>
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
            <Route path="measures" element={<MeasuresPage />} />
            <Route path="pricelists" element={<PriceListsPage />} />
            <Route path="pricelists/:id" element={<PriceListDetailPage />} />
          </Route>
          {/* Client — protette per impresario_funebre e marmista */}
          <Route
            path="/client"
            element={
              <ProtectedRoute requiredRoles={['impresario_funebre', 'marmista']}>
                <AdminLayout variant="client" />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/client/dashboard" replace />} />
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route path="catalog/funeral" element={
              <ProtectedRoute requiredRoles={['impresario_funebre']}><FuneralCatalogPage /></ProtectedRoute>
            } />
            <Route path="catalog/funeral/:id" element={
              <ProtectedRoute requiredRoles={['impresario_funebre']}><FuneralDetailPage /></ProtectedRoute>
            } />
            <Route path="catalog/marmista" element={
              <ProtectedRoute requiredRoles={['marmista']}><MarmistaClientCatalogPage /></ProtectedRoute>
            } />
            <Route path="catalog/marmista/:id" element={
              <ProtectedRoute requiredRoles={['marmista']}><MarmistaClientDetailPage /></ProtectedRoute>
            } />
            <Route path="change-password" element={<ChangePasswordPage />} />
          </Route>
        </Routes>
      </Suspense>
      {!isDark && !isAdmin && !location.pathname.startsWith('/login') && (
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

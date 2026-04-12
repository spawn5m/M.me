import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ADMIN_ROUTE_PERMISSIONS, AuthProvider, CLIENT_ROUTE_PERMISSIONS, getDefaultRoute, useAuth } from './context/AuthContext'
import { BrandingProvider, useBranding } from './context/BrandingContext'
import { MaintenanceProvider } from './context/MaintenanceContext'
import ProtectedRoute from './components/admin/ProtectedRoute'
import PublicPageRoute from './components/layout/PublicPageRoute'

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
const CatalogPdfPage = lazy(() => import('./pages/admin/CatalogPdfPage'))
const BrandingLogoPage = lazy(() => import('./pages/admin/BrandingLogoPage'))
const LocalesPage = lazy(() => import('./pages/admin/LocalesPage'))
const MaintenancePage = lazy(() => import('./pages/admin/MaintenancePage'))

const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'))
const FuneralCatalogPage = lazy(() => import('./pages/client/FuneralCatalogPage'))
const FuneralDetailPage = lazy(() => import('./pages/client/FuneralDetailPage'))
const MarmistaClientCatalogPage = lazy(() => import('./pages/client/MarmistaClientCatalogPage'))
const MarmistaClientDetailPage = lazy(() => import('./pages/client/MarmistaClientDetailPage'))
const ChangePasswordPage = lazy(() => import('./pages/client/ChangePasswordPage'))

const ADMIN_SHELL_PERMISSIONS = ADMIN_ROUTE_PERMISSIONS

const CLIENT_SHELL_PERMISSIONS = CLIENT_ROUTE_PERMISSIONS

function DefaultProtectedIndex({ scope }: { scope: 'admin' | 'client' }) {
  const { user, permissions } = useAuth()

  return <Navigate to={getDefaultRoute(user, permissions, scope)} replace />
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
  const isAdmin = location.pathname.startsWith('/admin') || location.pathname.startsWith('/client')

  const { logoUrl } = useBranding()

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (link) {
      link.href = logoUrl ?? '/favicon.svg'
      link.type = logoUrl?.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
    }
  }, [logoUrl])

  return (
    <>
      <Suspense fallback={<RouteFallback isAdmin={isAdmin} />}>
        <Routes>
          {/* Pubbliche */}
          <Route path="/" element={<PublicPageRoute page="home"><HomePage /></PublicPageRoute>} />
          <Route path="/storia" element={<PublicPageRoute page="ourStory"><NostraStoriaPage /></PublicPageRoute>} />
          <Route path="/dove-siamo" element={<PublicPageRoute page="whereWeAre"><DoveSiamoPage /></PublicPageRoute>} />
          <Route path="/imprese-funebri" element={<PublicPageRoute page="funeralHomes"><ImpreseFunebrePage /></PublicPageRoute>} />
          <Route path="/marmisti" element={<PublicPageRoute page="marmistas"><MarmistiPage /></PublicPageRoute>} />
          <Route path="/area-riservata" element={<PlaceholderPage name="Area Riservata" />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Admin — protette */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredPermissions={ADMIN_SHELL_PERMISSIONS}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DefaultProtectedIndex scope="admin" />} />
            <Route path="dashboard" element={<ProtectedRoute requiredPermissions={['dashboard.admin.read']}><DashboardPage /></ProtectedRoute>} />
            <Route path="users" element={<ProtectedRoute requiredPermissions={['users.read.team', 'users.read.all']}><UsersPage /></ProtectedRoute>} />
            <Route
              path="roles"
              element={
                <ProtectedRoute requiredPermissions={['roles.read']}>
                  <RolesPage />
                </ProtectedRoute>
              }
            />
            <Route path="articles/coffins" element={<ProtectedRoute requiredPermissions={['articles.coffins.read']}><CoffinsPage /></ProtectedRoute>} />
            <Route path="articles/accessories" element={<ProtectedRoute requiredPermissions={['articles.accessories.read']}><AccessoriesPage /></ProtectedRoute>} />
            <Route path="articles/marmista" element={<ProtectedRoute requiredPermissions={['articles.marmista.read']}><MarmistaArticlesPage /></ProtectedRoute>} />
            <Route path="catalog" element={<ProtectedRoute requiredPermissions={['catalog.pdf.read']}><CatalogPdfPage /></ProtectedRoute>} />
            <Route path="lookups/:type" element={<ProtectedRoute requiredPermissions={['lookups.read']}><LookupPage /></ProtectedRoute>} />
            <Route path="measures" element={<ProtectedRoute requiredPermissions={['measures.read']}><MeasuresPage /></ProtectedRoute>} />
            <Route path="branding/logo" element={<ProtectedRoute requiredPermissions={['branding.logo.manage']}><BrandingLogoPage /></ProtectedRoute>} />
            <Route path="locales" element={<ProtectedRoute requiredPermissions={['locales.manage']}><LocalesPage /></ProtectedRoute>} />
            <Route path="maintenance" element={<ProtectedRoute requiredPermissions={['maintenance.manage']}><MaintenancePage /></ProtectedRoute>} />
            <Route path="pricelists" element={<ProtectedRoute requiredPermissions={['pricelists.sale.read', 'pricelists.purchase.read']}><PriceListsPage /></ProtectedRoute>} />
            <Route path="pricelists/:id" element={<ProtectedRoute requiredPermissions={['pricelists.sale.read', 'pricelists.purchase.read']}><PriceListDetailPage /></ProtectedRoute>} />
          </Route>
          {/* Client — protette per impresario_funebre e marmista */}
          <Route
            path="/client"
            element={
              <ProtectedRoute requiredPermissions={CLIENT_SHELL_PERMISSIONS}>
                <AdminLayout variant="client" />
              </ProtectedRoute>
            }
          >
            <Route index element={<DefaultProtectedIndex scope="client" />} />
            <Route path="dashboard" element={<ProtectedRoute requiredPermissions={['dashboard.client.read']}><ClientDashboard /></ProtectedRoute>} />
            <Route path="catalog/funeral" element={
              <ProtectedRoute requiredPermissions={['client.catalog.funeral.read']}><FuneralCatalogPage /></ProtectedRoute>
            } />
            <Route path="catalog/funeral/:id" element={
              <ProtectedRoute requiredPermissions={['client.catalog.funeral.read']}><FuneralDetailPage /></ProtectedRoute>
            } />
            <Route path="catalog/marmista" element={
              <ProtectedRoute requiredPermissions={['client.catalog.marmista.read']}><MarmistaClientCatalogPage /></ProtectedRoute>
            } />
            <Route path="catalog/marmista/:id" element={
              <ProtectedRoute requiredPermissions={['client.catalog.marmista.read']}><MarmistaClientDetailPage /></ProtectedRoute>
            } />
            <Route path="change-password" element={<ProtectedRoute requiredPermissions={['client.password.change']}><ChangePasswordPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <BrandingProvider>
      <BrowserRouter>
        <AuthProvider>
          <MaintenanceProvider>
            <AppContent />
          </MaintenanceProvider>
        </AuthProvider>
      </BrowserRouter>
    </BrandingProvider>
  )
}

import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout({ variant = 'admin' }: { variant?: 'admin' | 'client' }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] lg:flex">
      <AdminSidebar variant={variant} onLogout={handleLogout} />

      <div className="min-w-0 flex-1">
        <header className="border-b border-[#E5E0D8] bg-[#FAF9F6]/95 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-6 md:px-10 lg:px-12">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
              Area riservata
            </p>
            <h1
              className="text-3xl text-[#031634] md:text-4xl"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Gestione catalogo e listini
            </h1>
          </div>
        </header>

        <main className="px-6 pb-10 pt-8 md:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

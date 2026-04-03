import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#F8F7F4]">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-[#E5E0D8] px-6 py-3 flex items-center justify-between">
          <h1 className="text-[#1A2B4A] font-medium text-sm">Gestione</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#6B7280]">
              {user?.firstName} {user?.lastName}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-[#6B7280] hover:text-[#1A2B4A] transition-colors"
            >
              Esci
            </button>
          </div>
        </header>

        {/* Contenuto */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

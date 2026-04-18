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
        <main className="px-6 pb-10 pt-8 md:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

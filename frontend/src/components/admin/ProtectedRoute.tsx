import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getDefaultRoute, type RouteScope, useAuth } from '../../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requiredPermissions?: string[]
  match?: 'any' | 'all'
}

export default function ProtectedRoute({
  children,
  requiredPermissions,
  match = 'any'
}: ProtectedRouteProps) {
  const { user, permissions, isLoading, hasPermission, hasAnyPermission } = useAuth()
  const location = useLocation()
  const fallbackScope: RouteScope = location.pathname.startsWith('/client')
    ? 'client'
    : location.pathname.startsWith('/admin')
      ? 'admin'
      : 'global'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F7F4]">
        <div className="w-8 h-8 border-2 border-[#1A2B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const isAllowed = !requiredPermissions || requiredPermissions.length === 0
    ? true
    : match === 'all'
      ? requiredPermissions.every((permission) => hasPermission(permission))
      : hasAnyPermission(requiredPermissions)

  if (!isAllowed) {
    return <Navigate to={getDefaultRoute(user, permissions, fallbackScope)} replace />
  }

  return <>{children}</>
}

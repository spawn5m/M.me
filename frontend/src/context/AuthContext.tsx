import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import api from '../lib/api'

interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  isActive: boolean
}

interface RoutePermissionRule {
  path: string
  permissions: readonly string[]
}

export type RouteScope = 'global' | 'admin' | 'client'

const ADMIN_DEFAULT_ROUTE_RULES: readonly RoutePermissionRule[] = [
  { path: '/admin/dashboard', permissions: ['dashboard.admin.read'] },
  { path: '/admin/users', permissions: ['users.read.team', 'users.read.all'] },
  { path: '/admin/roles', permissions: ['roles.read'] },
  { path: '/admin/articles/coffins', permissions: ['articles.coffins.read'] },
  { path: '/admin/articles/accessories', permissions: ['articles.accessories.read'] },
  { path: '/admin/articles/marmista', permissions: ['articles.marmista.read'] },
  { path: '/admin/lookups/coffin-categories', permissions: ['lookups.read'] },
  { path: '/admin/measures', permissions: ['measures.read'] },
  { path: '/admin/pricelists', permissions: ['pricelists.sale.read', 'pricelists.purchase.read'] },
  { path: '/admin/catalog', permissions: ['catalog.pdf.read'] },
  { path: '/admin/locales', permissions: ['locales.manage'] },
  { path: '/admin/maintenance', permissions: ['maintenance.manage'] },
]

const CLIENT_DEFAULT_ROUTE_RULES: readonly RoutePermissionRule[] = [
  { path: '/client/dashboard', permissions: ['dashboard.client.read'] },
  { path: '/client/catalog/funeral', permissions: ['client.catalog.funeral.read'] },
  { path: '/client/catalog/marmista', permissions: ['client.catalog.marmista.read'] },
  { path: '/client/change-password', permissions: ['client.password.change'] }
]

function getUniquePermissions(rules: readonly RoutePermissionRule[]) {
  return Array.from(new Set(rules.flatMap((rule) => rule.permissions)))
}

function getFirstAllowedRoute(permissions: readonly string[], rules: readonly RoutePermissionRule[]) {
  return rules.find((rule) => rule.permissions.some((permission) => permissions.includes(permission)))?.path ?? null
}

export const ADMIN_ROUTE_PERMISSIONS = getUniquePermissions(ADMIN_DEFAULT_ROUTE_RULES)
export const CLIENT_ROUTE_PERMISSIONS = getUniquePermissions(CLIENT_DEFAULT_ROUTE_RULES)

export function getDefaultRoute(
  user: AuthUser | null,
  permissions: readonly string[] = [],
  scope: RouteScope = 'global'
): string {
  if (!user) return '/login'

  if (scope === 'admin') {
    return getFirstAllowedRoute(permissions, ADMIN_DEFAULT_ROUTE_RULES) ?? '/login'
  }

  if (scope === 'client') {
    return getFirstAllowedRoute(permissions, CLIENT_DEFAULT_ROUTE_RULES) ?? '/login'
  }

  return getFirstAllowedRoute(permissions, CLIENT_DEFAULT_ROUTE_RULES)
    ?? getFirstAllowedRoute(permissions, ADMIN_DEFAULT_ROUTE_RULES)
    ?? '/login'
}

interface AuthResponse {
  user: AuthUser
  permissions: string[]
}

interface AuthContextValue {
  user: AuthUser | null
  roles: string[]
  permissions: string[]
  isLoading: boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  login: (email: string, password: string) => Promise<AuthResponse>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = async () => {
    try {
      const res = await api.get<AuthResponse>('/auth/me')
      setUser(res.data.user)
      setPermissions(res.data.permissions)
    } catch {
      setUser(null)
      setPermissions([])
    }
  }

  useEffect(() => {
    refresh().finally(() => setIsLoading(false))
  }, [])

  const hasPermission = (permission: string): boolean => permissions.includes(permission)

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some((permission) => permissions.includes(permission))
  }

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password })
    setUser(res.data.user)
    setPermissions(res.data.permissions)
    return res.data
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setUser(null)
    setPermissions([])
  }

  return (
    <AuthContext.Provider
        value={{
          user,
          roles: user?.roles ?? [],
          permissions,
          isLoading,
          hasPermission,
          hasAnyPermission,
          login,
          logout,
          refresh
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider')
  return ctx
}

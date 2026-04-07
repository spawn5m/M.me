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

interface AuthContextValue {
  user: AuthUser | null
  roles: string[]
  isLoading: boolean
  hasRole: (role: string | string[]) => boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = async () => {
    try {
      const res = await api.get<{ user: AuthUser }>('/auth/me')
      setUser(res.data.user)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    refresh().finally(() => setIsLoading(false))
  }, [])

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false
    const allowed = Array.isArray(role) ? role : [role]
    return allowed.some((r) => user.roles.includes(r))
  }

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const res = await api.post<{ user: AuthUser }>('/auth/login', { email, password })
    setUser(res.data.user)
    return res.data.user
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        roles: user?.roles ?? [],
        isLoading,
        hasRole,
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

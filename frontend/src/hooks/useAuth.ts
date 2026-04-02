// Placeholder — sostituire con implementazione reale in Fase 3
// quando sarà disponibile l'endpoint /api/auth/me

export interface AuthUser {
  id: string
  name: string
  role: 'super_admin' | 'manager' | 'marmista' | 'impresario'
}

export function useAuth(): { user: AuthUser | null; loading: boolean } {
  // In Fase 3: fetch /api/auth/me con @fastify/secure-session
  return { user: null, loading: false }
}

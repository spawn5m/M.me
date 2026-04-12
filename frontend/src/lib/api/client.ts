const BASE = '/api/client'

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...opts })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export const clientApi = {
  me: () =>
    req<{
      funeralPriceList: { id: string; name: string } | null
      marmistaPriceList: { id: string; name: string } | null
      manager: { name: string; email: string } | null
    }>(`${BASE}/me`),

  catalog: {
    funeral: (params?: Record<string, string>) =>
      req<{
        data: Array<{ id: string; code: string; description: string; price: number | null }>
        pagination: { page: number; pageSize: number; total: number; totalPages: number }
        warning?: string
      }>(`${BASE}/catalog/funeral${params ? '?' + new URLSearchParams(params) : ''}`),

    funeralDetail: (id: string) =>
      req<{
        id: string
        code: string
        description: string
        price: number | null
        measures?: unknown[]
        categories?: Array<{ code: string }>
        subcategories?: Array<{ code: string }>
      }>(`${BASE}/catalog/funeral/${id}`),


    marmista: (params?: Record<string, string>) =>
      req<{
        data: Array<{ id: string; code: string; description: string; price: number | null }>
        pagination: { page: number; pageSize: number; total: number; totalPages: number }
        warning?: string
      }>(`${BASE}/catalog/marmista${params ? '?' + new URLSearchParams(params) : ''}`),

    marmistaDetail: (id: string) =>
      req<{
        id: string
        code: string
        description: string
        price: number | null
        accessories?: Array<{
          id: string
          code: string
          description: string
          paginaPdf?: number | null
        }>
      }>(`${BASE}/catalog/marmista/${id}`),
  },

  changePassword: (oldPassword: string, newPassword: string) =>
    req<{ ok: boolean }>(`${BASE}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword }),
    }),
}

import api from '../api'
import type { AdminRole } from '../../../../backend/src/types/shared'

interface PaginatedRoles {
  data: AdminRole[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

interface CreateRolePayload {
  name: string
  label: string
}

export const rolesApi = {
  list: () =>
    api.get<PaginatedRoles>('/roles').then((r) => r.data),

  create: (payload: CreateRolePayload) =>
    api.post<AdminRole>('/roles', payload).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/roles/${id}`)
}

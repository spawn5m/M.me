import api from '../api'
import type { AdminUser } from '../../../../backend/src/types/shared'

interface UserFilters {
  page?: number
  pageSize?: number
  role?: string
  isActive?: boolean
  search?: string
}

interface PaginatedUsers {
  data: AdminUser[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

interface CreateUserPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  roleIds: string[]
  managerId?: string
}

interface UpdateUserPayload {
  email?: string
  firstName?: string
  lastName?: string
  isActive?: boolean
  roleIds?: string[]
  managerId?: string | null
}

export const usersApi = {
  list: (filters?: UserFilters) =>
    api.get<PaginatedUsers>('/users', { params: filters }).then((r) => r.data),

  get: (id: string) =>
    api.get<AdminUser>(`/users/${id}`).then((r) => r.data),

  create: (payload: CreateUserPayload) =>
    api.post<AdminUser>('/users', payload).then((r) => r.data),

  update: (id: string, payload: UpdateUserPayload) =>
    api.put<AdminUser>(`/users/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/users/${id}`),

  mySubordinates: () =>
    api.get<AdminUser[]>('/users/me/subordinates').then((r) => r.data)
}

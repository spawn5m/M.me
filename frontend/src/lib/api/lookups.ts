import api from '../api'
import type { AdminLookup, PaginatedResponse } from '../../../../backend/src/types/shared'

const base = '/admin/lookups'

export const lookupsApi = {
  list: (type: string) =>
    api.get<PaginatedResponse<AdminLookup>>(`${base}/${type}`).then(r => r.data),

  create: (type: string, data: { code: string; label: string }) =>
    api.post<AdminLookup>(`${base}/${type}`, data).then(r => r.data),

  update: (type: string, id: string, data: { code: string; label: string }) =>
    api.put<AdminLookup>(`${base}/${type}/${id}`, data).then(r => r.data),

  remove: (type: string, id: string) =>
    api.delete(`${base}/${type}/${id}`),
}

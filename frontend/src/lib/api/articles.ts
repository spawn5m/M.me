import api from '../api'
import type {
  AdminCoffinArticle,
  AdminAccessoryArticle,
  AdminMarmistaArticle,
  ImportResult,
  PaginatedResponse,
} from '../../../../backend/src/types/shared'

const base = '/admin/articles'

interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  category?: string
}

export const articlesApi = {
  coffins: {
    list: (params?: ListParams) =>
      api.get<PaginatedResponse<AdminCoffinArticle>>(`${base}/coffins`, { params }).then(r => r.data),

    get: (id: string) =>
      api.get<AdminCoffinArticle>(`${base}/coffins/${id}`).then(r => r.data),

    create: (data: unknown) =>
      api.post<AdminCoffinArticle>(`${base}/coffins`, data).then(r => r.data),

    update: (id: string, data: unknown) =>
      api.put<AdminCoffinArticle>(`${base}/coffins/${id}`, data).then(r => r.data),

    remove: (id: string) =>
      api.delete(`${base}/coffins/${id}`),

    uploadImage: (id: string, file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<AdminCoffinArticle>(`${base}/coffins/${id}/image`, form).then(r => r.data)
    },

    import: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<ImportResult>(`${base}/coffins/import`, form).then(r => r.data)
    },
  },

  accessories: {
    list: (params?: ListParams) =>
      api.get<PaginatedResponse<AdminAccessoryArticle>>(`${base}/accessories`, { params }).then(r => r.data),

    get: (id: string) =>
      api.get<AdminAccessoryArticle>(`${base}/accessories/${id}`).then(r => r.data),

    create: (data: unknown) =>
      api.post<AdminAccessoryArticle>(`${base}/accessories`, data).then(r => r.data),

    update: (id: string, data: unknown) =>
      api.put<AdminAccessoryArticle>(`${base}/accessories/${id}`, data).then(r => r.data),

    remove: (id: string) =>
      api.delete(`${base}/accessories/${id}`),

    import: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<ImportResult>(`${base}/accessories/import`, form).then(r => r.data)
    },
  },

  marmista: {
    list: (params?: ListParams) =>
      api.get<PaginatedResponse<AdminMarmistaArticle>>(`${base}/marmista`, { params }).then(r => r.data),

    get: (id: string) =>
      api.get<AdminMarmistaArticle>(`${base}/marmista/${id}`).then(r => r.data),

    create: (data: unknown) =>
      api.post<AdminMarmistaArticle>(`${base}/marmista`, data).then(r => r.data),

    update: (id: string, data: unknown) =>
      api.put<AdminMarmistaArticle>(`${base}/marmista/${id}`, data).then(r => r.data),

    remove: (id: string) =>
      api.delete(`${base}/marmista/${id}`),

    import: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<ImportResult>(`${base}/marmista/import`, form).then(r => r.data)
    },
  },
}

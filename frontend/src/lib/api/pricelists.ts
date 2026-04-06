import api from '../api'
import type {
  AdminPriceList,
  PaginatedResponse,
  PriceListType,
  ArticleType,
} from '../../../../backend/src/types/shared'

const base = '/admin/pricelists'

interface CreatePriceListPayload {
  name: string
  type: PriceListType
  articleType: ArticleType
  parentId?: string | null
  autoUpdate?: boolean
}

interface PriceListItem {
  coffinArticleId?: string | null
  accessoryArticleId?: string | null
  marmistaArticleId?: string | null
  price: number
}

interface PriceRule {
  filterType?: 'category' | 'subcategory' | null
  filterValue?: string | null
  discountType: 'percentage' | 'absolute'
  discountValue: number
}

export const pricelistsApi = {
  list: () =>
    api.get<PaginatedResponse<AdminPriceList>>(base).then(r => r.data),

  get: (id: string) =>
    api.get<AdminPriceList & { items: unknown[]; rules: unknown[] }>(`${base}/${id}`).then(r => r.data),

  create: (data: CreatePriceListPayload) =>
    api.post<AdminPriceList>(base, data).then(r => r.data),

  update: (id: string, data: CreatePriceListPayload) =>
    api.put<AdminPriceList>(`${base}/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    api.delete(`${base}/${id}`),

  setItems: (id: string, items: PriceListItem[]) =>
    api.post<{ ok: boolean }>(`${base}/${id}/items`, { items }).then(r => r.data),

  addRule: (id: string, rule: PriceRule) =>
    api.post(`${base}/${id}/rules`, rule).then(r => r.data),

  removeRule: (id: string, ruleId: string) =>
    api.delete(`${base}/${id}/rules/${ruleId}`),

  preview: (id: string) =>
    api.get<{ previews: Array<{ itemId: string; computedPrice: number }> }>(`${base}/${id}/preview`).then(r => r.data),

  recalculate: (id: string) =>
    api.post<{ recalculated: number }>(`${base}/${id}/recalculate`).then(r => r.data),

  assign: (id: string, userId: string) =>
    api.put<{ ok: boolean }>(`${base}/${id}/assign/${userId}`).then(r => r.data),
}

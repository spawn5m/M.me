// Tipi API

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  isActive: boolean
}

// Tipi priceEngine

export type PriceListType = 'purchase' | 'sale'
export type DiscountType = 'percentage' | 'absolute'

export interface PriceRule {
  filterType: 'category' | 'subcategory' | null
  filterValue: string | null
  discountType: DiscountType
  discountValue: number
}

export interface PriceListNode {
  type: PriceListType
  autoUpdate: boolean
  rules: PriceRule[]
  parent?: PriceListNode
}

export interface ArticleContext {
  basePrice: number
  categoryCode?: string
  subcategoryCode?: string
}

// ─── Tipi Admin ───────────────────────────────────────────────────────────────

export interface AdminRole {
  id: string
  name: string
  label: string
  isSystem: boolean
}

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  roles: AdminRole[]
  manager: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminStats {
  users: number
  coffins: number
  accessories: number
  marmista: number
}

// Nota: SessionData augmentation è in src/plugins/auth.ts
// dove @fastify/secure-session viene importato

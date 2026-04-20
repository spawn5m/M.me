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
}

export interface AdminPermission {
  id: string
  code: string
  resource: string
  action: string
  scope: string | null
  label: string
  description: string
  isSystem: boolean
}

export type ArticleType = 'funeral' | 'marmista' | 'accessories'

export interface AdminAssignedPriceList {
  id: string
  name: string
  type: PriceListType
  articleType: ArticleType
}

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  intestazione: string | null
  indirizzo: string | null
  numeroCivico: string | null
  cap: string | null
  comune: string | null
  provincia: string | null
  codicePP: string | null
  isActive: boolean
  roles: AdminRole[]
  permissions: string[]
  manager: string | null
  funeralPriceList: AdminAssignedPriceList | null
  marmistaPriceList: AdminAssignedPriceList | null
  accessoriesPriceList: AdminAssignedPriceList | null
  createdAt: string
  updatedAt: string
}

export interface AdminUserPermissionDetail {
  user: Pick<AdminUser, 'id' | 'email' | 'firstName' | 'lastName' | 'isActive'>
  roles: AdminRole[]
  directPermissions: AdminPermission[]
  effectivePermissions: AdminPermission[]
}

export interface AdminRolePermissionDetail {
  role: AdminRole
  permissions: AdminPermission[]
}

export interface AdminStats {
  users: number
  coffins: number
  accessories: number
  marmista: number
}

export interface AdminLookup { id: string; code: string; label: string }

export interface AdminCoffinArticle {
  id: string; code: string; description: string; notes: string | null
  imageUrl: string | null; measure: AdminLookup | null
  categories: AdminLookup[]; subcategories: AdminLookup[]
  essences: AdminLookup[]; figures: AdminLookup[]
  colors: AdminLookup[]; finishes: AdminLookup[]
}

export interface AdminAccessoryArticle {
  id: string; code: string; description: string; notes: string | null
  imageUrl: string | null; pdfPage: number | null
  categories: AdminLookup[]; subcategories: AdminLookup[]
}

export interface AdminMarmistaArticle {
  id: string; code: string; description: string; notes: string | null
  pdfPage: number | null; publicPrice: number | null; color: boolean
  accessory: AdminLookup | null; categories: AdminLookup[]
}

export interface AdminPriceList {
  id: string; name: string; type: PriceListType; articleType: ArticleType
  parentId: string | null; autoUpdate: boolean; _count: { items: number }
}

export interface ImportResult {
  imported: number; skipped: number
  errors: Array<{ row: number; code: string; reason: string }>
  warnings: Array<{ row: number; code: string; reason: string }>
}

export type MaintenancePageKey = 'home' | 'ourStory' | 'whereWeAre' | 'funeralHomes' | 'marmistas'

export interface MaintenancePageState {
  enabled: boolean
}

export type MaintenanceStateMap = Record<MaintenancePageKey, MaintenancePageState>

export interface PublicMaintenanceResponse {
  pages: MaintenanceStateMap
}

export interface AdminMaintenancePageConfig extends MaintenancePageState {
  message: string
  homeH2?: string
}

export type AdminMaintenanceConfigMap = Record<MaintenancePageKey, AdminMaintenancePageConfig>

export interface AdminMaintenanceResponse {
  pages: AdminMaintenanceConfigMap
}

export interface MapCoordinates {
  lat: number
  lng: number
}

export interface MapsConfig {
  offices: {
    villamar: MapCoordinates
    sassari: MapCoordinates
  }
}

export type PublicMapsResponse = MapsConfig
export type AdminMapsResponse = MapsConfig

// Nota: SessionData augmentation è in src/plugins/auth.ts
// dove @fastify/secure-session viene importato

// ─── Catalog PDF ──────────────────────────────────────────────────────────────

/** Layout configuration as returned by API responses (no totalPdfPages). */
export interface CatalogLayoutConfig {
  offset: number
  firstPageType: 'single' | 'double'
  bodyPageType: 'single' | 'double'
  lastPageType: 'single' | 'double'
}

export interface CatalogStatus {
  type: 'accessories' | 'marmista'
  fileName: string
  uploadedAt: string
  totalPdfPages: number | null
  splitPages: number
  isComplete: boolean
  slug: string
  layout: CatalogLayoutConfig
}

export interface CatalogLayoutPublic {
  type: 'accessories' | 'marmista'
  slug: string
  totalPdfPages: number
  layout: CatalogLayoutConfig
}

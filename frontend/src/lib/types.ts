export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiListResponse<T> {
  data: T[]
  pagination: Pagination
}

// Cofano (senza purchasePrice)
export interface CoffinItem {
  id: string
  code: string
  description: string
  notes?: string
  imageUrl?: string
  categories: string[]
  subcategories: string[]
  essences: string[]
  figures: string[]
  colors: string[]
  finishes: string[]
  measure?: {
    id: string
    code: string
    label: string
    head: number
    feet: number
    shoulder: number
    height: number
    width: number
    depth: number
  }
}

// Accessorio
export interface AccessoryItem {
  id: string
  code: string
  description: string
  notes?: string
  imageUrl?: string
  categories: string[]
  pdfPage?: number
}

// Marmista (con prezzo pubblico)
export interface MarmistaItem {
  id: string
  code: string
  description: string
  notes?: string
  pdfPage?: number
  publicPrice?: number
  linkedAccessory?: { id: string; code: string; description: string }
  categories: string[]
}

// Ceabis (senza prezzi)
export interface CeabisItem {
  id: string
  code: string
  description: string
  notes?: string
  pdfPage?: number
  categories: string[]
}

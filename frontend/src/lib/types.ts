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

export interface CoffinPriceOption {
  priceListId: string
  priceListName: string
  priceListType: 'purchase' | 'sale'
  price: number
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
  price?: number | null
  priceOptions?: CoffinPriceOption[]
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
  price?: number | null
  priceOptions?: CoffinPriceOption[]
  purchasePrice?: number | null
}

// Marmista (con prezzo pubblico)
export interface MarmistaItem {
  id: string
  code: string
  description: string
  notes?: string
  pdfPage?: number
  publicPrice?: number
  price?: number | null       // prezzo listino vendita assegnato — solo quando loggato
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

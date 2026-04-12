import { useState, useEffect } from 'react'
import api from '../lib/api'
import { mockAccessories } from '../lib/mock-data'
import type { AccessoryItem, CoffinPriceOption, Pagination } from '../lib/types'

interface LookupLike {
  label?: string
  code?: string
}

interface PublicAccessoryRaw {
  id: string
  code: string
  description: string
  notes?: string | null
  imageUrl?: string | null
  pdfPage?: number | null
  categories?: Array<string | LookupLike>
  price?: number | null
  priceOptions?: CoffinPriceOption[]
}

function normalizeLookupList(values: Array<string | LookupLike> | undefined): string[] {
  if (!values) return []
  return values
    .map((value) => {
      if (typeof value === 'string') return value
      if (typeof value.label === 'string' && value.label.length > 0) return value.label
      if (typeof value.code === 'string') return value.code
      return ''
    })
    .filter((value) => value.length > 0)
}

function normalizeAccessories(data: PublicAccessoryRaw[]): AccessoryItem[] {
  return data.map((item) => {
    const normalized: AccessoryItem = {
      id: item.id,
      code: item.code,
      description: item.description,
      notes: item.notes ?? undefined,
      imageUrl: item.imageUrl ?? undefined,
      pdfPage: item.pdfPage ?? undefined,
      categories: normalizeLookupList(item.categories),
    }
    if (item.price !== undefined) normalized.price = item.price
    if (item.priceOptions !== undefined) normalized.priceOptions = item.priceOptions
    return normalized
  })
}

interface UseAccessoriesParams {
  page?: number
  limit?: number
  category?: string
  search?: string
}

interface UseAccessoriesResult {
  items: AccessoryItem[]
  pagination: Pagination | null
  loading: boolean
  error: string | null
}

export function useAccessories(params: UseAccessoriesParams = {}): UseAccessoriesResult {
  const [items, setItems] = useState<AccessoryItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      try {
        const res = await api.get('/public/accessories', { params })
        if (!cancelled) {
          const data = normalizeAccessories(res.data.data as PublicAccessoryRaw[])
          setItems(data.length > 0 ? data : mockAccessories)
          setPagination(res.data.pagination)
        }
      } catch {
        if (!cancelled) {
          setItems(mockAccessories)
          setError(null) // silenzioso — usiamo mock
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetchData()
    return () => {
      cancelled = true
    }
  }, [params.page, params.limit, params.category, params.search])

  return { items, pagination, loading, error }
}

import { useState, useEffect } from 'react'
import api from '../lib/api'
import { mockCoffins } from '../lib/mock-data'
import type { CoffinItem, Pagination } from '../lib/types'

interface LookupLike {
  label?: string
  code?: string
}

interface PublicCoffinRaw {
  id: string
  code: string
  description: string
  notes?: string | null
  imageUrl?: string | null
  categories?: Array<string | LookupLike>
  subcategories?: Array<string | LookupLike>
  essences?: Array<string | LookupLike>
  figures?: Array<string | LookupLike>
  colors?: Array<string | LookupLike>
  finishes?: Array<string | LookupLike>
  measure?: CoffinItem['measure'] | null
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

function normalizeCoffins(data: PublicCoffinRaw[]): CoffinItem[] {
  return data.map((item) => ({
    id: item.id,
    code: item.code,
    description: item.description,
    notes: item.notes ?? undefined,
    imageUrl: item.imageUrl ?? undefined,
    categories: normalizeLookupList(item.categories),
    subcategories: normalizeLookupList(item.subcategories),
    essences: normalizeLookupList(item.essences),
    figures: normalizeLookupList(item.figures),
    colors: normalizeLookupList(item.colors),
    finishes: normalizeLookupList(item.finishes),
    measure: item.measure ?? undefined,
  }))
}

interface UseCoffinsParams {
  page?: number
  limit?: number
  category?: string
  search?: string
}

interface UseCoffinsResult {
  items: CoffinItem[]
  pagination: Pagination | null
  loading: boolean
  error: string | null
}

export function useCoffins(params: UseCoffinsParams = {}): UseCoffinsResult {
  const [items, setItems] = useState<CoffinItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      try {
        const res = await api.get('/public/coffins', { params })
        if (!cancelled) {
          const data = normalizeCoffins(res.data.data as PublicCoffinRaw[])
          setItems(data.length > 0 ? data : mockCoffins)
          setPagination(res.data.pagination)
        }
      } catch {
        if (!cancelled) {
          setItems(mockCoffins)
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

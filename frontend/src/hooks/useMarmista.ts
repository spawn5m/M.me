import { useState, useEffect } from 'react'
import api from '../lib/api'
import { mockMarmista } from '../lib/mock-data'
import type { MarmistaItem, Pagination } from '../lib/types'

interface LookupLike {
  label?: string
  code?: string
}

interface PublicMarmistaRaw {
  id: string
  code: string
  description: string
  notes?: string | null
  publicPrice?: number | null
  pdfPage?: number | null
  categories?: Array<string | LookupLike>
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

function normalizeMarmista(data: PublicMarmistaRaw[]): MarmistaItem[] {
  return data.map((item) => ({
    id: item.id,
    code: item.code,
    description: item.description,
    notes: item.notes ?? undefined,
    publicPrice: item.publicPrice ?? undefined,
    pdfPage: item.pdfPage ?? undefined,
    categories: normalizeLookupList(item.categories),
  }))
}

interface UseMarmistaParams {
  page?: number
  limit?: number
  category?: string
  search?: string
}

interface UseMarmistaResult {
  items: MarmistaItem[]
  pagination: Pagination | null
  loading: boolean
  error: string | null
}

export function useMarmista(params: UseMarmistaParams = {}): UseMarmistaResult {
  const [items, setItems] = useState<MarmistaItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      try {
        const res = await api.get('/public/marmista', { params })
        if (!cancelled) {
          const data = normalizeMarmista(res.data.data as PublicMarmistaRaw[])
          setItems(data.length > 0 ? data : mockMarmista)
          setPagination(res.data.pagination)
        }
      } catch {
        if (!cancelled) {
          setItems(mockMarmista)
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

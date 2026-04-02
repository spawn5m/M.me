import { useState, useEffect } from 'react'
import api from '../lib/api'
import { mockMarmista } from '../lib/mock-data'
import type { MarmistaItem, Pagination } from '../lib/types'

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
          const data = res.data.data as MarmistaItem[]
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

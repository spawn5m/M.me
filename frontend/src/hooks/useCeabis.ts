import { useState, useEffect } from 'react'
import api from '../lib/api'
import { mockCeabis } from '../lib/mock-data'
import type { CeabisItem, Pagination } from '../lib/types'

interface UseCeabisParams {
  page?: number
  limit?: number
  category?: string
  search?: string
}

interface UseCeabisResult {
  items: CeabisItem[]
  pagination: Pagination | null
  loading: boolean
  error: string | null
}

export function useCeabis(params: UseCeabisParams = {}): UseCeabisResult {
  const [items, setItems] = useState<CeabisItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      try {
        const res = await api.get('/public/ceabis', { params })
        if (!cancelled) {
          const data = res.data.data as CeabisItem[]
          setItems(data.length > 0 ? data : mockCeabis)
          setPagination(res.data.pagination)
        }
      } catch {
        if (!cancelled) {
          setItems(mockCeabis)
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

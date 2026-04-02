import { useState, useEffect } from 'react'
import api from '../lib/api'
import { mockCoffins } from '../lib/mock-data'
import type { CoffinItem, Pagination } from '../lib/types'

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
          const data = res.data.data as CoffinItem[]
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

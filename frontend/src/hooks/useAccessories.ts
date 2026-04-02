import { useState, useEffect } from 'react'
import api from '../lib/api'
import { mockAccessories } from '../lib/mock-data'
import type { AccessoryItem, Pagination } from '../lib/types'

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
          const data = res.data.data as AccessoryItem[]
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

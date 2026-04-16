import api from '../api'
import type { AdminMapsResponse, PublicMapsResponse } from '../../../../backend/src/types/shared'

export async function fetchPublicMaps() {
  return api.get<PublicMapsResponse>('/public/maps', {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function fetchAdminMaps() {
  return api.get<AdminMapsResponse>('/admin/maps')
}

export async function updateAdminMaps(payload: AdminMapsResponse) {
  return api.put('/admin/maps', payload)
}

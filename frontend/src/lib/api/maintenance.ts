import api from '../api'
import type { AdminMaintenanceResponse, PublicMaintenanceResponse } from '../../../../backend/src/types/shared'

export async function fetchPublicMaintenance() {
  return api.get<PublicMaintenanceResponse>('/public/maintenance', {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function fetchAdminMaintenance() {
  return api.get<AdminMaintenanceResponse>('/admin/maintenance')
}

export async function updateAdminMaintenance(payload: AdminMaintenanceResponse) {
  return api.put('/admin/maintenance', payload)
}

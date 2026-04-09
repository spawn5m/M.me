import api from '../api'
import type {
  AdminPermission,
  AdminRolePermissionDetail,
  AdminUserPermissionDetail,
  PaginatedResponse,
} from '../../../../backend/src/types/shared'

interface PermissionUpdatePayload {
  permissionCodes: string[]
}

export const permissionsApi = {
  list: () =>
    api.get<PaginatedResponse<AdminPermission>>('/permissions').then((res) => res.data),

  getUserPermissions: (id: string) =>
    api.get<AdminUserPermissionDetail>(`/users/${id}/permissions`).then((res) => res.data),

  updateUserPermissions: (id: string, permissionCodes: string[]) =>
    api.put<AdminUserPermissionDetail, { data: AdminUserPermissionDetail }, PermissionUpdatePayload>(
      `/users/${id}/permissions`,
      { permissionCodes }
    ).then((res) => res.data),

  getRolePermissions: (id: string) =>
    api.get<AdminRolePermissionDetail>(`/roles/${id}/permissions`).then((res) => res.data),

  updateRolePermissions: (id: string, permissionCodes: string[]) =>
    api.put<AdminRolePermissionDetail, { data: AdminRolePermissionDetail }, PermissionUpdatePayload>(
      `/roles/${id}/permissions`,
      { permissionCodes }
    ).then((res) => res.data),
}

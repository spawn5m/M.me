export function hasPermission(permissions: readonly string[], permission: string) {
  return permissions.includes(permission)
}

export function hasAnyPermission(permissions: readonly string[], required: readonly string[]) {
  return required.some((permission) => hasPermission(permissions, permission))
}

export function hasAllPermissions(permissions: readonly string[], required: readonly string[]) {
  return required.every((permission) => hasPermission(permissions, permission))
}

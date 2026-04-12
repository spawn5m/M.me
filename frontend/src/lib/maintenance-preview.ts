export const MAINTENANCE_PREVIEW_STORAGE_KEY = 'admin-maintenance-preview-enabled'

export function readMaintenancePreviewEnabled(): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.sessionStorage.getItem(MAINTENANCE_PREVIEW_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeMaintenancePreviewEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(MAINTENANCE_PREVIEW_STORAGE_KEY, String(enabled))
  } catch {
    // Ignore storage failures: preview is only a session convenience.
  }
}

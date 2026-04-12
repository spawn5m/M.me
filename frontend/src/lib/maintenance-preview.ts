import { useSyncExternalStore } from 'react'

export const MAINTENANCE_PREVIEW_STORAGE_KEY = 'admin-maintenance-preview-enabled'

const MAINTENANCE_PREVIEW_CHANGE_EVENT = 'maintenance-preview-change'
const MAINTENANCE_PREVIEW_SYNC_KEY = 'admin-maintenance-preview-sync'

function notifyMaintenancePreviewChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(MAINTENANCE_PREVIEW_CHANGE_EVENT))
}

function syncMaintenancePreviewFromStorage(value: string | null) {
  if (typeof window === 'undefined' || value === null) return

  try {
    const payload = JSON.parse(value) as { enabled?: unknown }
    if (typeof payload.enabled !== 'boolean') return

    window.sessionStorage.setItem(MAINTENANCE_PREVIEW_STORAGE_KEY, String(payload.enabled))
  } catch {
    // Ignore malformed sync payloads.
  }
}

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

  try {
    window.localStorage.setItem(MAINTENANCE_PREVIEW_SYNC_KEY, JSON.stringify({ enabled, ts: Date.now() }))
  } catch {
    // Ignore sync failures outside the current tab.
  }

  notifyMaintenancePreviewChange()
}

function subscribeMaintenancePreview(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handlePreviewChange = () => {
    onStoreChange()
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== MAINTENANCE_PREVIEW_SYNC_KEY) return

    syncMaintenancePreviewFromStorage(event.newValue)
    onStoreChange()
  }

  window.addEventListener(MAINTENANCE_PREVIEW_CHANGE_EVENT, handlePreviewChange)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(MAINTENANCE_PREVIEW_CHANGE_EVENT, handlePreviewChange)
    window.removeEventListener('storage', handleStorage)
  }
}

export function useMaintenancePreviewEnabled(): boolean {
  return useSyncExternalStore(subscribeMaintenancePreview, readMaintenancePreviewEnabled, () => false)
}

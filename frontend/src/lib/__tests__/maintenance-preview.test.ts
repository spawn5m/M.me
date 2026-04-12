import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MAINTENANCE_PREVIEW_STORAGE_KEY,
  readMaintenancePreviewEnabled,
  writeMaintenancePreviewEnabled,
} from '../maintenance-preview'

describe('maintenance preview storage helpers', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false when sessionStorage read fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(readMaintenancePreviewEnabled()).toBe(false)
  })

  it('swallows sessionStorage write failures', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(() => writeMaintenancePreviewEnabled(true)).not.toThrow()
    expect(setItemSpy).toHaveBeenCalledWith(MAINTENANCE_PREVIEW_STORAGE_KEY, 'true')
  })
})

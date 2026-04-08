import { describe, expect, it } from 'vitest'

import { hasAllPermissions, hasAnyPermission, hasPermission } from '../checks'

describe('hasPermission', () => {
  it('returns true when the permission is present', () => {
    expect(hasPermission(['users.read.team', 'roles.read'], 'roles.read')).toBe(true)
  })

  it('returns false when the permission is missing', () => {
    expect(hasPermission(['users.read.team'], 'roles.read')).toBe(false)
  })
})

describe('hasAnyPermission', () => {
  it('returns true when at least one required permission is present', () => {
    expect(hasAnyPermission(['users.read.team', 'roles.read'], ['roles.manage', 'roles.read'])).toBe(true)
  })

  it('returns false when none of the required permissions are present', () => {
    expect(hasAnyPermission(['users.read.team'], ['roles.manage', 'roles.read'])).toBe(false)
  })
})

describe('hasAllPermissions', () => {
  it('returns true when every required permission is present', () => {
    expect(hasAllPermissions(['users.read.team', 'roles.read'], ['users.read.team', 'roles.read'])).toBe(true)
  })

  it('returns false when one required permission is missing', () => {
    expect(hasAllPermissions(['users.read.team'], ['users.read.team', 'roles.read'])).toBe(false)
  })
})

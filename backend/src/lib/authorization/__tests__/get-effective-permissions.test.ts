import { describe, expect, it, vi } from 'vitest'

import {
  EFFECTIVE_PERMISSIONS_USER_SELECT,
  getEffectivePermissions,
  type EffectivePermissionsDataSource,
} from '../get-effective-permissions'

describe('getEffectivePermissions', () => {
  it('uses the future authorization data contract for role and direct grants', async () => {
    expect(EFFECTIVE_PERMISSIONS_USER_SELECT).toEqual({
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      userPermissions: {
        select: {
          permission: {
            select: {
              code: true,
            },
          },
        },
      },
    })
  })

  it('merges role and direct permissions without duplicates and sorts roles and permissions', async () => {
    const dataSource: EffectivePermissionsDataSource = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          userRoles: [
            {
              role: {
                name: 'manager',
                rolePermissions: [
                  { permission: { code: 'users.read.all' } },
                  { permission: { code: 'pricelists.sale.read' } },
                ],
              },
            },
            {
              role: {
                name: 'collaboratore',
                rolePermissions: [
                  { permission: { code: 'articles.coffins.read' } },
                  { permission: { code: 'users.read.all' } },
                ],
              },
            },
          ],
          userPermissions: [
            { permission: { code: 'articles.coffins.read' } },
            { permission: { code: 'catalog.pdf.read' } },
          ],
        }),
      },
    }

    await expect(getEffectivePermissions(dataSource, 'user-123')).resolves.toEqual({
      roles: ['collaboratore', 'manager'],
      permissions: [
        'articles.coffins.read',
        'catalog.pdf.read',
        'pricelists.sale.read',
        'users.read.all',
      ],
    })

    expect(dataSource.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: EFFECTIVE_PERMISSIONS_USER_SELECT,
    })
  })

  it('returns empty arrays when the user is missing', async () => {
    const dataSource: EffectivePermissionsDataSource = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    }

    await expect(getEffectivePermissions(dataSource, 'missing-user')).resolves.toEqual({
      roles: [],
      permissions: [],
    })
  })
})

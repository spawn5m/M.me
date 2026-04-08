import { describe, expect, it, vi } from 'vitest'

import {
  getEffectivePermissions,
  type AuthorizationPrismaClient,
} from '../get-effective-permissions'

describe('getEffectivePermissions', () => {
  it('merges role and direct permissions without duplicates and sorts roles and permissions', async () => {
    const prisma: AuthorizationPrismaClient = {
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

    await expect(getEffectivePermissions(prisma, 'user-123')).resolves.toEqual({
      roles: ['collaboratore', 'manager'],
      permissions: [
        'articles.coffins.read',
        'catalog.pdf.read',
        'pricelists.sale.read',
        'users.read.all',
      ],
    })

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: {
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
      },
    })
  })

  it('returns empty arrays when the user is missing', async () => {
    const prisma: AuthorizationPrismaClient = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    }

    await expect(getEffectivePermissions(prisma, 'missing-user')).resolves.toEqual({
      roles: [],
      permissions: [],
    })
  })
})

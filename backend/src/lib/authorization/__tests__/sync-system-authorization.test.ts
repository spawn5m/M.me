import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'

import { syncSystemAuthorization } from '../sync-system-authorization'

const prisma = new PrismaClient()

async function cleanupDb() {
  await prisma.userPermission.deleteMany()
  await prisma.userRole.deleteMany()
  await prisma.userManager.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.user.deleteMany()
  await prisma.role.deleteMany()
  await prisma.permission.deleteMany()
}

describe('system authorization bootstrap', () => {
  beforeEach(async () => {
    await cleanupDb()
  })

  afterAll(async () => {
    await cleanupDb()
    await prisma.$disconnect()
  })

  it('sincronizza maps.manage e lo assegna ai ruoli di sistema all avvio', async () => {
    await prisma.role.createMany({
      data: [
        { name: 'super_admin', label: 'Super Admin', isSystem: true },
        { name: 'manager', label: 'Manager', isSystem: true },
      ],
    })

    const maintenancePermission = await prisma.permission.create({
      data: {
        code: 'maintenance.manage',
        resource: 'maintenance',
        action: 'manage',
        scope: null,
        label: 'Gestisci Manutenzione',
        description: 'Attivare la manutenzione delle pagine pubbliche e modificarne i messaggi.',
        isSystem: true,
      },
    })

    const roles = await prisma.role.findMany({
      where: { name: { in: ['super_admin', 'manager'] } },
      select: { id: true, name: true },
    })

    for (const role of roles) {
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: maintenancePermission.id,
        },
      })
    }

    await syncSystemAuthorization(prisma)

    const mapsPermission = await prisma.permission.findUnique({
      where: { code: 'maps.manage' },
    })

    const rolesAfterBootstrap = await prisma.role.findMany({
      where: { name: { in: ['super_admin', 'manager'] } },
      select: {
        name: true,
        rolePermissions: {
          select: { permission: { select: { code: true } } },
        },
      },
    })

    expect(mapsPermission).not.toBeNull()
    expect(rolesAfterBootstrap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'super_admin',
          rolePermissions: expect.arrayContaining([
            expect.objectContaining({ permission: expect.objectContaining({ code: 'maps.manage' }) }),
          ]),
        }),
        expect.objectContaining({
          name: 'manager',
          rolePermissions: expect.arrayContaining([
            expect.objectContaining({ permission: expect.objectContaining({ code: 'maps.manage' }) }),
          ]),
        }),
      ]),
    )
  })
})

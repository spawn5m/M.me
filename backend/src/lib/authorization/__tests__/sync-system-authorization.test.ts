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

  it('sincronizza maps.manage nel catalogo permessi all avvio', async () => {
    await syncSystemAuthorization(prisma)

    const mapsPermission = await prisma.permission.findUnique({
      where: { code: 'maps.manage' },
    })

    expect(mapsPermission).not.toBeNull()
  })
})

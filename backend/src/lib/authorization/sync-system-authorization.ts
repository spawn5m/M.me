import type { PrismaClient } from '@prisma/client'

import { SYSTEM_PERMISSIONS } from './permissions'
import { SYSTEM_ROLE_DEFAULTS, type SystemRoleName } from './role-defaults'

const SYSTEM_ROLES = [
  { name: 'super_admin', label: 'Super Admin' },
  { name: 'manager', label: 'Manager' },
  { name: 'collaboratore', label: 'Collaboratore' },
  { name: 'impresario_funebre', label: 'Impresario Funebre' },
  { name: 'marmista', label: 'Marmista' },
] as const

export async function syncSystemAuthorization(prisma: PrismaClient) {
  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        label: role.label,
        isSystem: true,
      },
      create: {
        name: role.name,
        label: role.label,
        isSystem: true,
      },
    })
  }

  for (const permission of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope ?? null,
        label: permission.label,
        description: permission.description,
        isSystem: permission.isSystem,
      },
      create: {
        code: permission.code,
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope ?? null,
        label: permission.label,
        description: permission.description,
        isSystem: permission.isSystem,
      },
    })
  }

  const roles = await prisma.role.findMany({
    where: { name: { in: SYSTEM_ROLES.map((role) => role.name) } },
    select: { id: true, name: true },
  })

  const permissions = await prisma.permission.findMany({
    where: { code: { in: SYSTEM_PERMISSIONS.map((permission) => permission.code) } },
    select: { id: true, code: true },
  })

  const permissionIdsByCode = new Map(permissions.map((permission) => [permission.code, permission.id]))

  for (const role of roles) {
    const permissionCodes = SYSTEM_ROLE_DEFAULTS[role.name as SystemRoleName]

    for (const permissionCode of permissionCodes) {
      const permissionId = permissionIdsByCode.get(permissionCode)
      if (!permissionId) {
        throw new Error(`Permesso di sistema mancante: ${permissionCode}`)
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId,
        },
      })
    }
  }
}

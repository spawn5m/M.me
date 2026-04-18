import type { PrismaClient } from '@prisma/client'

import { SYSTEM_PERMISSIONS } from './permissions'

export async function syncSystemAuthorization(prisma: PrismaClient) {
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
}

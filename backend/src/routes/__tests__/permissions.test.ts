import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { buildTestApp, cleanupTestDb, seedTestUser, getAuthCookie } from '../../test-helper'
import {
  getRolePermissionDetail,
  getUserPermissionDetail,
} from '../../lib/authorization/admin-permission-details'
import { SYSTEM_PERMISSIONS, type PermissionCode } from '../../lib/authorization/permissions'

interface AuthorizationPermissionRecord {
  id: string
  code: string
}

interface AuthorizationRoleRecord {
  id: string
  name: string
  label: string
  isSystem: boolean
}

interface AuthorizationUserRecord {
  id: string
  email: string
}

interface AuthorizationPrismaClient {
  permission: {
    upsert(args: {
      where: { code: string }
      update: {
        resource?: string
        action?: string
        scope?: string | null
        label?: string
        description?: string
        isSystem?: boolean
      }
      create: {
        code: string
        resource: string
        action: string
        scope?: string | null
        label: string
        description: string
        isSystem: boolean
      }
    }): Promise<AuthorizationPermissionRecord>
  }
  role: {
    create(args: {
      data: {
        name: string
        label: string
        isSystem: boolean
      }
    }): Promise<AuthorizationRoleRecord>
  }
  rolePermission: {
    create(args: {
      data: {
        roleId: string
        permissionId: string
      }
    }): Promise<unknown>
  }
  userPermission: {
    create(args: {
      data: {
        userId: string
        permissionId: string
      }
    }): Promise<unknown>
  }
}

function getAuthorizationPrisma(app: FastifyInstance): AuthorizationPrismaClient {
  return app.prisma as unknown as AuthorizationPrismaClient
}

async function ensurePermission(app: FastifyInstance, code: PermissionCode): Promise<AuthorizationPermissionRecord> {
  const definition = SYSTEM_PERMISSIONS.find((permission) => permission.code === code)
  if (!definition) {
    throw new Error(`Permission ${code} non trovata`)
  }

  return getAuthorizationPrisma(app).permission.upsert({
    where: { code },
    update: definition,
    create: definition,
  })
}

async function grantRolePermissions(app: FastifyInstance, roleName: string, permissionCodes: PermissionCode[]) {
  const role = await app.prisma.role.findUnique({ where: { name: roleName } })
  if (!role) {
    throw new Error(`Ruolo ${roleName} non trovato`)
  }

  for (const code of permissionCodes) {
    const permission = await ensurePermission(app, code)
    await getAuthorizationPrisma(app).rolePermission.create({
      data: {
        roleId: role.id,
        permissionId: permission.id,
      },
    })
  }
}

async function grantUserPermissions(app: FastifyInstance, userId: string, permissionCodes: PermissionCode[]) {
  for (const code of permissionCodes) {
    const permission = await ensurePermission(app, code)
    await getAuthorizationPrisma(app).userPermission.create({
      data: {
        userId,
        permissionId: permission.id,
      },
    })
  }
}

function getSortedSystemPermissionCodes(): string[] {
  return SYSTEM_PERMISSIONS
    .slice()
    .sort((left, right) => {
      if (left.resource !== right.resource) {
        return left.resource.localeCompare(right.resource)
      }

      if (left.action !== right.action) {
        return left.action.localeCompare(right.action)
      }

      return left.code.localeCompare(right.code)
    })
    .map((permission) => permission.code)
}

describe('Permissions API', () => {
  let app: FastifyInstance
  let superAdminCookie: string
  let managerCookie: string

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(async () => {
    await cleanupTestDb(app)

    await seedTestUser(app, {
      email: 'super-perms@test.com',
      password: 'pass1234!',
      roles: ['super_admin'],
    })
    await seedTestUser(app, {
      email: 'manager-perms@test.com',
      password: 'pass1234!',
      roles: ['manager'],
    })

    await grantRolePermissions(app, 'super_admin', ['roles.read', 'roles.manage'])

    superAdminCookie = await getAuthCookie(app, 'super-perms@test.com', 'pass1234!')
    managerCookie = await getAuthCookie(app, 'manager-perms@test.com', 'pass1234!')
  })

  it('returns the system permission catalog to a caller with roles.read', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/permissions',
      headers: { cookie: superAdminCookie },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      data: Array<{ code: string; label: string }>
      pagination: { total: number }
    }
    expect(body.data.some((permission) => permission.code === 'roles.manage')).toBe(true)
    expect(body.data.map((permission) => permission.code)).toEqual(getSortedSystemPermissionCodes())
    expect(body.pagination.total).toBe(SYSTEM_PERMISSIONS.length)
  })

  it('returns the full system permission catalog even when only a subset exists in the database', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/permissions',
      headers: { cookie: superAdminCookie },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      data: Array<{ code: string }>
      pagination: { total: number }
    }

    expect(body.data).toHaveLength(SYSTEM_PERMISSIONS.length)
    expect(body.data.map((permission) => permission.code)).toEqual(getSortedSystemPermissionCodes())
    expect(body.pagination.total).toBe(SYSTEM_PERMISSIONS.length)
  })

  it('returns 403 without roles.read', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/permissions',
      headers: { cookie: managerCookie },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns deterministically sorted permission detail arrays', async () => {
    const adminUser = await seedTestUser(app, {
      email: 'detail-order@test.com',
      password: 'pass1234!',
      roles: [],
    })
    const zebraRole = await getAuthorizationPrisma(app).role.create({
      data: {
        name: 'zebra_role',
        label: 'Zebra Role',
        isSystem: false,
      },
    })
    const alphaRole = await getAuthorizationPrisma(app).role.create({
      data: {
        name: 'alpha_role',
        label: 'Alpha Role',
        isSystem: false,
      },
    })

    await app.prisma.userRole.create({
      data: { userId: adminUser.id, roleId: zebraRole.id },
    })
    await app.prisma.userRole.create({
      data: { userId: adminUser.id, roleId: alphaRole.id },
    })

    await grantRolePermissions(app, 'zebra_role', ['users.disable', 'catalog.pdf.write'])
    await grantRolePermissions(app, 'alpha_role', ['roles.read', 'articles.coffins.read'])
    await grantUserPermissions(app, adminUser.id, ['users.create', 'articles.accessories.delete'])

    const userDetail = await getUserPermissionDetail(app.prisma, adminUser.id)
    const roleDetail = await getRolePermissionDetail(app.prisma, zebraRole.id)

    expect(userDetail).not.toBeNull()
    expect(roleDetail).not.toBeNull()

    expect(userDetail?.roles.map((role) => role.name)).toEqual(['alpha_role', 'zebra_role'])
    expect(userDetail?.directPermissions.map((permission) => permission.code)).toEqual([
      'articles.accessories.delete',
      'users.create',
    ])
    expect(userDetail?.effectivePermissions.map((permission) => permission.code)).toEqual([
      'articles.accessories.delete',
      'articles.coffins.read',
      'catalog.pdf.write',
      'roles.read',
      'users.create',
      'users.disable',
    ])
    expect(roleDetail?.permissions.map((permission) => permission.code)).toEqual([
      'catalog.pdf.write',
      'users.disable',
    ])
  })
})

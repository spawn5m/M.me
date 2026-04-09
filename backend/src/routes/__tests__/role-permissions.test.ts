import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

import {
  buildTestApp,
  cleanupTestDb,
  getAuthCookie,
  seedTestUser,
} from '../../test-helper'
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
}

function getAuthorizationPrisma(app: FastifyInstance): AuthorizationPrismaClient {
  return app.prisma as unknown as AuthorizationPrismaClient
}

async function ensurePermission(
  app: FastifyInstance,
  code: PermissionCode,
): Promise<AuthorizationPermissionRecord> {
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

async function grantRolePermissions(
  app: FastifyInstance,
  roleName: string,
  permissionCodes: PermissionCode[],
) {
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

describe('Role permission routes', () => {
  let app: FastifyInstance
  let superAdminCookie: string
  let managerCookie: string
  let restrictedEditorCookie: string
  let customRoleId: string
  let systemRoleId: string

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
      email: 'superadmin-role-permissions@test.com',
      password: 'password123',
      roles: ['super_admin'],
    })
    await seedTestUser(app, {
      email: 'manager-role-permissions@test.com',
      password: 'password123',
      roles: ['manager'],
    })
    await seedTestUser(app, {
      email: 'restricted-editor-role-permissions@test.com',
      password: 'password123',
      roles: ['restricted_permission_editor'],
    })

    await grantRolePermissions(app, 'super_admin', [
      'roles.read',
      'roles.manage',
      'catalog.pdf.read',
      'catalog.pdf.write',
    ])
    await grantRolePermissions(app, 'restricted_permission_editor', [
      'roles.manage',
      'roles.read',
    ])

    const customRole = await getAuthorizationPrisma(app).role.create({
      data: {
        name: 'custom_role_permissions',
        label: 'Custom Role Permissions',
        isSystem: false,
      },
    })
    customRoleId = customRole.id

    const systemRole = await app.prisma.role.findUnique({ where: { name: 'super_admin' } })
    if (!systemRole) {
      throw new Error('Ruolo super_admin non trovato')
    }
    systemRoleId = systemRole.id

    await grantRolePermissions(app, 'custom_role_permissions', ['catalog.pdf.read'])

    superAdminCookie = await getAuthCookie(
      app,
      'superadmin-role-permissions@test.com',
      'password123',
    )
    managerCookie = await getAuthCookie(
      app,
      'manager-role-permissions@test.com',
      'password123',
    )
    restrictedEditorCookie = await getAuthCookie(
      app,
      'restricted-editor-role-permissions@test.com',
      'password123',
    )
  })

  it('reads the permission bundle for a custom role', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/roles/${customRoleId}/permissions`,
      headers: { cookie: superAdminCookie },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      role: { id: string; name: string; isSystem: boolean }
      permissions: Array<{ code: string }>
    }

    expect(body.role).toMatchObject({
      id: customRoleId,
      name: 'custom_role_permissions',
      isSystem: false,
    })
    expect(body.permissions.map((permission) => permission.code)).toEqual(['catalog.pdf.read'])
  })

  it('updates the permission bundle for a custom role', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/roles/${customRoleId}/permissions`,
      headers: { cookie: superAdminCookie },
      payload: {
        permissionCodes: ['catalog.pdf.write', 'catalog.pdf.write', 'roles.read'],
      },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      role: { id: string }
      permissions: Array<{ code: string }>
    }

    expect(body.role.id).toBe(customRoleId)
    expect(body.permissions.map((permission) => permission.code)).toEqual([
      'catalog.pdf.write',
      'roles.read',
    ])
  })

  it('returns 409 when updating a system role', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/roles/${systemRoleId}/permissions`,
      headers: { cookie: superAdminCookie },
      payload: { permissionCodes: ['roles.read'] },
    })

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({
      error: 'Conflict',
      statusCode: 409,
    })
  })

  it('returns 400 when a requested permission code is invalid', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/roles/${customRoleId}/permissions`,
      headers: { cookie: superAdminCookie },
      payload: { permissionCodes: ['not.real.permission'] },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({
      error: 'ValidationError',
      statusCode: 400,
    })
  })

  it('treats a valid system permission as known even if its Permission row is missing before the write', async () => {
    await app.prisma.permission.deleteMany({ where: { code: 'catalog.pdf.write' } })

    const res = await app.inject({
      method: 'PUT',
      url: `/api/roles/${customRoleId}/permissions`,
      headers: { cookie: superAdminCookie },
      payload: { permissionCodes: ['catalog.pdf.write'] },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({
      error: 'Forbidden',
      statusCode: 403,
    })

    const permission = await app.prisma.permission.findUnique({ where: { code: 'catalog.pdf.write' } })
    expect(permission).toBeNull()
  })

  it('rejects assigning permissions the caller does not currently hold', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/roles/${customRoleId}/permissions`,
      headers: { cookie: restrictedEditorCookie },
      payload: { permissionCodes: ['catalog.pdf.write'] },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({
      error: 'Forbidden',
      statusCode: 403,
    })
  })

  it('returns 404 when the role does not exist', async () => {
    const readRes = await app.inject({
      method: 'GET',
      url: '/api/roles/not-a-role/permissions',
      headers: { cookie: superAdminCookie },
    })

    expect(readRes.statusCode).toBe(404)
    expect(readRes.json()).toMatchObject({
      error: 'NotFound',
      statusCode: 404,
    })

    const writeRes = await app.inject({
      method: 'PUT',
      url: '/api/roles/not-a-role/permissions',
      headers: { cookie: superAdminCookie },
      payload: { permissionCodes: [] },
    })

    expect(writeRes.statusCode).toBe(404)
    expect(writeRes.json()).toMatchObject({
      error: 'NotFound',
      statusCode: 404,
    })
  })

  it('still requires the route permission guards', async () => {
    const readRes = await app.inject({
      method: 'GET',
      url: `/api/roles/${customRoleId}/permissions`,
      headers: { cookie: managerCookie },
    })

    expect(readRes.statusCode).toBe(403)

    const writeRes = await app.inject({
      method: 'PUT',
      url: `/api/roles/${customRoleId}/permissions`,
      headers: { cookie: managerCookie },
      payload: { permissionCodes: ['roles.read'] },
    })

    expect(writeRes.statusCode).toBe(403)
  })
})

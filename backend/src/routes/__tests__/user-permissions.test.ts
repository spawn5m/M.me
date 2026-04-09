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
        grantedByUserId?: string
      }
    }): Promise<unknown>
  }
  user: {
    findUnique(args: {
      where: { email: string }
      select: { id: true; email: true }
    }): Promise<AuthorizationUserRecord | null>
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

async function grantUserPermissions(
  app: FastifyInstance,
  userId: string,
  permissionCodes: PermissionCode[],
  grantedByUserId?: string,
) {
  for (const code of permissionCodes) {
    const permission = await ensurePermission(app, code)
    await getAuthorizationPrisma(app).userPermission.create({
      data: {
        userId,
        permissionId: permission.id,
        grantedByUserId,
      },
    })
  }
}

async function getUserByEmail(app: FastifyInstance, email: string): Promise<AuthorizationUserRecord> {
  const user = await getAuthorizationPrisma(app).user.findUnique({
    where: { email },
    select: { id: true, email: true },
  })

  if (!user) {
    throw new Error(`Utente ${email} non trovato`)
  }

  return user
}

describe('User permission routes', () => {
  let app: FastifyInstance
  let superAdminCookie: string
  let managerCookie: string
  let collaboratorCookie: string
  let restrictedSuperAdminCookie: string
  let readRestrictedEditorCookie: string
  let updateRestrictedEditorCookie: string
  let superAdminId: string
  let collaboratorId: string
  let superAdminTargetId: string

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
      email: 'superadmin-permissions@test.com',
      password: 'password123',
      roles: ['super_admin'],
    })
    await seedTestUser(app, {
      email: 'manager-permissions@test.com',
      password: 'password123',
      roles: ['manager'],
    })
    await seedTestUser(app, {
      email: 'collaboratore-permissions@test.com',
      password: 'password123',
      roles: ['collaboratore'],
    })
    await seedTestUser(app, {
      email: 'restricted-superadmin@test.com',
      password: 'password123',
      roles: ['permission_editor'],
    })
    await seedTestUser(app, {
      email: 'target-superadmin@test.com',
      password: 'password123',
      roles: ['super_admin'],
    })
    await seedTestUser(app, {
      email: 'read-restricted-editor@test.com',
      password: 'password123',
      roles: ['update_only_permission_editor'],
    })
    await seedTestUser(app, {
      email: 'update-restricted-editor@test.com',
      password: 'password123',
      roles: ['read_only_permission_editor'],
    })

    await grantRolePermissions(app, 'super_admin', [
      'roles.manage',
      'users.read.all',
      'users.update.all',
      'users.super_admin.read',
      'users.super_admin.manage',
      'articles.coffins.read',
    ])
    await grantRolePermissions(app, 'manager', [
      'users.read.all',
      'users.update.all',
    ])
    await grantRolePermissions(app, 'collaboratore', ['articles.coffins.read'])

    await grantRolePermissions(app, 'permission_editor', [
      'roles.manage',
      'users.read.all',
      'users.update.all',
    ])
    await grantRolePermissions(app, 'update_only_permission_editor', [
      'roles.manage',
      'users.update.all',
    ])
    await grantRolePermissions(app, 'read_only_permission_editor', [
      'roles.manage',
      'users.read.all',
    ])

    const collaborator = await getUserByEmail(app, 'collaboratore-permissions@test.com')
    const fullSuperAdmin = await getUserByEmail(app, 'superadmin-permissions@test.com')
    const restrictedSuperAdmin = await getUserByEmail(app, 'restricted-superadmin@test.com')
    const targetSuperAdmin = await getUserByEmail(app, 'target-superadmin@test.com')

    await grantUserPermissions(app, collaborator.id, ['roles.read'], fullSuperAdmin.id)

    superAdminCookie = await getAuthCookie(app, 'superadmin-permissions@test.com', 'password123')
    managerCookie = await getAuthCookie(app, 'manager-permissions@test.com', 'password123')
    collaboratorCookie = await getAuthCookie(app, 'collaboratore-permissions@test.com', 'password123')
    restrictedSuperAdminCookie = await getAuthCookie(app, 'restricted-superadmin@test.com', 'password123')
    readRestrictedEditorCookie = await getAuthCookie(app, 'read-restricted-editor@test.com', 'password123')
    updateRestrictedEditorCookie = await getAuthCookie(app, 'update-restricted-editor@test.com', 'password123')

    superAdminId = fullSuperAdmin.id
    collaboratorId = collaborator.id
    superAdminTargetId = targetSuperAdmin.id
  })

  it('caller with required permissions can read direct and effective permissions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/users/${collaboratorId}/permissions`,
      headers: { cookie: superAdminCookie },
    })

    expect(res.statusCode).toBe(200)

    const body = res.json() as {
      user: { id: string; email: string }
      roles: Array<{ name: string }>
      directPermissions: Array<{ code: string }>
      effectivePermissions: Array<{ code: string }>
    }

    expect(body.user).toMatchObject({
      id: collaboratorId,
      email: 'collaboratore-permissions@test.com',
    })
    expect(body.roles.map((role) => role.name)).toEqual(['collaboratore'])
    expect(body.directPermissions.map((permission) => permission.code)).toEqual(['roles.read'])
    expect(body.effectivePermissions.map((permission) => permission.code)).toEqual([
      'articles.coffins.read',
      'roles.read',
    ])
  })

  it('caller with roles.manage can replace direct grants and effective permissions update accordingly', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${collaboratorId}/permissions`,
      headers: { cookie: superAdminCookie },
      payload: { permissionCodes: ['roles.manage'] },
    })

    expect(res.statusCode).toBe(200)

    const body = res.json() as {
      user: { id: string }
      directPermissions: Array<{ code: string }>
      effectivePermissions: Array<{ code: string }>
    }

    expect(body.user.id).toBe(collaboratorId)
    expect(body.directPermissions.map((permission) => permission.code)).toEqual(['roles.manage'])
    expect(body.effectivePermissions.map((permission) => permission.code)).toEqual([
      'articles.coffins.read',
      'roles.manage',
    ])
  })

  it('caller without roles.manage gets 403', async () => {
    const readRes = await app.inject({
      method: 'GET',
      url: `/api/users/${collaboratorId}/permissions`,
      headers: { cookie: collaboratorCookie },
    })

    expect(readRes.statusCode).toBe(403)
    expect(readRes.json()).toMatchObject({
      error: 'Forbidden',
      statusCode: 403,
    })

    const writeRes = await app.inject({
      method: 'PUT',
      url: `/api/users/${collaboratorId}/permissions`,
      headers: { cookie: managerCookie },
      payload: { permissionCodes: ['roles.read'] },
    })

    expect(writeRes.statusCode).toBe(403)
    expect(writeRes.json()).toMatchObject({
      error: 'Forbidden',
      statusCode: 403,
    })
  })

  it('reading a super_admin target without users.super_admin.read is blocked', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/users/${superAdminTargetId}/permissions`,
      headers: { cookie: restrictedSuperAdminCookie },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({
      error: 'Forbidden',
      statusCode: 403,
    })
  })

  it('reading permissions also requires user read scope', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/users/${collaboratorId}/permissions`,
      headers: { cookie: readRestrictedEditorCookie },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({
      error: 'Forbidden',
      statusCode: 403,
    })
  })

  it('editing a super_admin target without users.super_admin.manage is blocked', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${superAdminTargetId}/permissions`,
      headers: { cookie: restrictedSuperAdminCookie },
      payload: { permissionCodes: ['roles.read'] },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({
      error: 'Forbidden',
      statusCode: 403,
    })
  })

  it('editing permissions also requires user update scope', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${collaboratorId}/permissions`,
      headers: { cookie: updateRestrictedEditorCookie },
      payload: { permissionCodes: ['roles.manage'] },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({
      error: 'Forbidden',
      statusCode: 403,
    })
  })

  it('editing permissions cannot grant codes the caller does not hold', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${collaboratorId}/permissions`,
      headers: { cookie: restrictedSuperAdminCookie },
      payload: { permissionCodes: ['roles.read'] },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({
      error: 'Forbidden',
      statusCode: 403,
    })

    const collaborator = await app.prisma.user.findUnique({
      where: { id: collaboratorId },
      include: {
        userPermissions: {
          include: { permission: true },
          orderBy: { permission: { code: 'asc' } },
        },
      },
    })

    expect(collaborator?.userPermissions.map((entry) => entry.permission.code)).toEqual([
      'roles.read',
    ])
  })

  it('invalid permission code returns 400', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${collaboratorId}/permissions`,
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
    await app.prisma.permission.deleteMany({ where: { code: 'catalog.pdf.read' } })

    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${collaboratorId}/permissions`,
      headers: { cookie: superAdminCookie },
      payload: { permissionCodes: ['catalog.pdf.read'] },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({
      error: 'Forbidden',
      statusCode: 403,
    })

    const permission = await app.prisma.permission.findUnique({ where: { code: 'catalog.pdf.read' } })
    expect(permission).toBeNull()
  })

  it('can replace all direct grants with an empty set', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/users/${collaboratorId}/permissions`,
      headers: { cookie: superAdminCookie },
      payload: { permissionCodes: [] },
    })

    expect(res.statusCode).toBe(200)

    const body = res.json() as {
      directPermissions: Array<{ code: string }>
      effectivePermissions: Array<{ code: string }>
    }

    expect(body.directPermissions).toEqual([])
    expect(body.effectivePermissions.map((permission) => permission.code)).toEqual([
      'articles.coffins.read',
    ])
  })

  it('returns 404 when the target user does not exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/not-a-user/permissions',
      headers: { cookie: superAdminCookie },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({
      error: 'NotFound',
      statusCode: 404,
    })
  })

  it('stores replacement grants on the user record', async () => {
    await app.inject({
      method: 'PUT',
      url: `/api/users/${collaboratorId}/permissions`,
      headers: { cookie: superAdminCookie },
      payload: { permissionCodes: ['roles.manage'] },
    })

    const collaborator = await app.prisma.user.findUnique({
      where: { id: collaboratorId },
      include: {
        userPermissions: {
          include: { permission: true },
          orderBy: { permission: { code: 'asc' } },
        },
      },
    })

    expect(collaborator?.userPermissions.map((entry) => entry.permission.code)).toEqual([
      'roles.manage',
    ])
    expect(collaborator?.userPermissions.every((entry) => entry.grantedByUserId === superAdminId)).toBe(true)
  })
})

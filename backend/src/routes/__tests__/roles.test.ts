import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb } from '../../test-helper'
import { SYSTEM_PERMISSIONS, type PermissionCode } from '../../lib/authorization/permissions'

interface AuthorizationPermissionRecord {
  id: string
  code: string
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
      }
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
      }
    })
  }
}

describe('Roles API', () => {
  let app: FastifyInstance
  let superAdminCookie: string
  let managerCookie: string
  let clientCookie: string

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
      email: 'superadmin@test.com',
      password: 'password123',
      roles: ['super_admin']
    })
    await seedTestUser(app, {
      email: 'manager@test.com',
      password: 'password123',
      roles: ['manager']
    })
    await seedTestUser(app, {
      email: 'client@test.com',
      password: 'password123',
      roles: ['impresario_funebre']
    })

    await grantRolePermissions(app, 'super_admin', ['roles.read', 'roles.manage'])
    await grantRolePermissions(app, 'manager', ['users.create', 'users.update.team', 'users.update.all'])

    superAdminCookie = await getAuthCookie(app, 'superadmin@test.com', 'password123')
    managerCookie = await getAuthCookie(app, 'manager@test.com', 'password123')
    clientCookie = await getAuthCookie(app, 'client@test.com', 'password123')
  })

  describe('GET /api/roles', () => {
    it('restituisce 200 per super_admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/roles',
        headers: { cookie: superAdminCookie }
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(Array.isArray(body.data)).toBe(true)
    })

    it('consente a un manager di leggere i ruoli per il workflow utenti', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/roles',
        headers: { cookie: managerCookie }
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({
        data: expect.any(Array),
      })
    })

    it('restituisce 403 per un cliente senza permessi ruoli o gestione utenti', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/roles',
        headers: { cookie: clientCookie }
      })

      expect(res.statusCode).toBe(403)
    })

    it('consente a un manager con grant diretto roles.read di leggere i ruoli', async () => {
      const manager = await app.prisma.user.findUnique({ where: { email: 'manager@test.com' } })
      expect(manager).not.toBeNull()

      await grantUserPermissions(app, manager!.id, ['roles.read'])

      const refreshedCookie = await getAuthCookie(app, 'manager@test.com', 'password123')
      const res = await app.inject({
        method: 'GET',
        url: '/api/roles',
        headers: { cookie: refreshedCookie }
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body)).toMatchObject({
        data: expect.any(Array),
      })
    })
  })

  describe('POST /api/roles', () => {
    it('crea un ruolo custom (201)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/roles',
        headers: { cookie: superAdminCookie },
        payload: { name: 'ruolo_test', label: 'Ruolo Test' }
      })
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.name).toBe('ruolo_test')
    })

    it('creates a custom role with an initial permission bundle', async () => {
      await grantRolePermissions(app, 'super_admin', ['articles.coffins.read', 'catalog.pdf.read'])
      superAdminCookie = await getAuthCookie(app, 'superadmin@test.com', 'password123')

      const res = await app.inject({
        method: 'POST',
        url: '/api/roles',
        headers: { cookie: superAdminCookie },
        payload: {
          name: 'custom_catalog_editor',
          label: 'Catalog Editor',
          permissionCodes: ['articles.coffins.read', 'catalog.pdf.read'],
        }
      })

      expect(res.statusCode).toBe(201)

      const role = await app.prisma.role.findUnique({
        where: { name: 'custom_catalog_editor' },
        include: { rolePermissions: { include: { permission: true } } },
      })

      expect(role?.rolePermissions.map((entry) => entry.permission.code).sort()).toEqual([
        'articles.coffins.read',
        'catalog.pdf.read',
      ])
    })

    it('returns 403 when requested permission codes exceed the caller permission set', async () => {
      await grantUserPermissions(
        app,
        (await app.prisma.user.findUniqueOrThrow({ where: { email: 'manager@test.com' } })).id,
        ['roles.manage'],
      )
      managerCookie = await getAuthCookie(app, 'manager@test.com', 'password123')

      const res = await app.inject({
        method: 'POST',
        url: '/api/roles',
        headers: { cookie: managerCookie },
        payload: {
          name: 'unauthorized_bundle',
          label: 'Unauthorized Bundle',
          permissionCodes: ['roles.read'],
        }
      })

      expect(res.statusCode).toBe(403)
      expect(res.json()).toMatchObject({
        error: 'Forbidden',
        message: 'Permessi insufficienti per questa operazione',
        statusCode: 403,
      })
      expect(await app.prisma.role.findUnique({ where: { name: 'unauthorized_bundle' } })).toBeNull()
    })

    it('restituisce 400 per nome con caratteri non validi', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/roles',
        headers: { cookie: superAdminCookie },
        payload: { name: 'Ruolo Invalido!', label: 'Test' }
      })
      expect(res.statusCode).toBe(400)
    })

    it('restituisce 409 per nome duplicato', async () => {
      // super_admin esiste già dal seed
      const res = await app.inject({
        method: 'POST',
        url: '/api/roles',
        headers: { cookie: superAdminCookie },
        payload: { name: 'super_admin', label: 'Duplicato' }
      })
      expect(res.statusCode).toBe(409)
      expect(res.json()).toMatchObject({
        error: 'Conflict',
        message: 'Nome ruolo già in uso',
        statusCode: 409,
      })
    })
  })

  describe('role id validation', () => {
    it('returns 400 for malformed role ids before permission read, write, or delete', async () => {
      const malformedRoleId = 'not-a-cuid'

      const readRes = await app.inject({
        method: 'GET',
        url: `/api/roles/${malformedRoleId}/permissions`,
        headers: { cookie: superAdminCookie },
      })

      expect(readRes.statusCode).toBe(400)
      expect(readRes.json()).toMatchObject({
        error: 'ValidationError',
        message: 'Id ruolo non valido',
        statusCode: 400,
      })

      const writeRes = await app.inject({
        method: 'PUT',
        url: `/api/roles/${malformedRoleId}/permissions`,
        headers: { cookie: superAdminCookie },
        payload: { permissionCodes: [] },
      })

      expect(writeRes.statusCode).toBe(400)
      expect(writeRes.json()).toMatchObject({
        error: 'ValidationError',
        message: 'Id ruolo non valido',
        statusCode: 400,
      })

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/roles/${malformedRoleId}`,
        headers: { cookie: superAdminCookie },
      })

      expect(deleteRes.statusCode).toBe(400)
      expect(deleteRes.json()).toMatchObject({
        error: 'ValidationError',
        message: 'Id ruolo non valido',
        statusCode: 400,
      })
    })
  })

  describe('DELETE /api/roles/:id', () => {
    it('restituisce 409 se il ruolo è di sistema', async () => {
      const superAdminRole = await app.prisma.role.findUnique({ where: { name: 'super_admin' } })
      if (!superAdminRole) {
        throw new Error('Ruolo super_admin non trovato')
      }

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/roles/${superAdminRole.id}`,
        headers: { cookie: superAdminCookie }
      })
      expect(res.statusCode).toBe(409)
    })

    it('elimina un ruolo custom (204)', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/roles',
        headers: { cookie: superAdminCookie },
        payload: { name: 'ruolo_da_eliminare', label: 'Da eliminare' }
      })
      const { id } = JSON.parse(create.body)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/roles/${id}`,
        headers: { cookie: superAdminCookie }
      })
      expect(res.statusCode).toBe(204)
    })
  })
})

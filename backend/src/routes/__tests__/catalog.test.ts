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

interface PermissionUpsertData {
  code: string
  resource: string
  action: string
  scope?: string | null
  label: string
  description: string
  isSystem: boolean
}

interface AuthorizationPrismaClient {
  permission: {
    upsert(args: {
      where: { code: string }
      update: PermissionUpsertData
      create: PermissionUpsertData
    }): Promise<AuthorizationPermissionRecord>
  }
  rolePermission: {
    create(args: { data: { roleId: string; permissionId: string } }): Promise<unknown>
  }
}

function getAuthorizationPrisma(app: FastifyInstance): AuthorizationPrismaClient {
  return app.prisma as unknown as AuthorizationPrismaClient
}

async function ensurePermission(app: FastifyInstance, code: PermissionCode) {
  const definition = SYSTEM_PERMISSIONS.find((p) => p.code === code)
  if (!definition) throw new Error(`Permission ${code} non trovata`)
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
  if (!role) throw new Error(`Ruolo ${roleName} non trovato`)
  for (const code of permissionCodes) {
    const permission = await ensurePermission(app, code)
    await getAuthorizationPrisma(app).rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    })
  }
}

describe('Catalog routes', () => {
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
      email: 'catalog-superadmin@test.com',
      password: 'password123',
      roles: ['super_admin'],
    })
    await seedTestUser(app, {
      email: 'catalog-manager@test.com',
      password: 'password123',
      roles: ['manager'],
    })
    await grantRolePermissions(app, 'super_admin', ['catalog.pdf.read', 'catalog.pdf.write'])
    superAdminCookie = await getAuthCookie(app, 'catalog-superadmin@test.com', 'password123')
    managerCookie = await getAuthCookie(app, 'catalog-manager@test.com', 'password123')
  })

  describe('GET / — lista cataloghi', () => {
    it('nega senza catalog.pdf.read', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/catalog',
        headers: { cookie: managerCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it('ritorna lista vuota se nessun catalogo', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/catalog',
        headers: { cookie: superAdminCookie },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ data: [] })
    })
  })

  describe('GET /:type/status', () => {
    it('ritorna 404 se tipo non esiste', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/catalog/accessories/status',
        headers: { cookie: superAdminCookie },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('PUT /:type/layout', () => {
    it('ritorna 404 se catalogo non esiste', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/admin/catalog/accessories/layout',
        headers: { cookie: superAdminCookie, 'content-type': 'application/json' },
        payload: {
          layoutOffset: 0,
          firstPageType: 'single',
          bodyPageType: 'double',
          lastPageType: 'single',
        },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('DELETE /:type', () => {
    it('nega senza catalog.pdf.write', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/admin/catalog/accessories',
        headers: { cookie: managerCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it('ritorna 404 se catalogo non esiste', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/admin/catalog/accessories',
        headers: { cookie: superAdminCookie },
      })
      expect(res.statusCode).toBe(404)
    })
  })
})

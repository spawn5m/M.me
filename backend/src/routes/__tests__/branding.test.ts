import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import {
  buildTestApp,
  cleanupTestDb,
  getAuthCookie,
  seedTestUser,
} from '../../test-helper'
import { SYSTEM_PERMISSIONS, type PermissionCode } from '../../lib/authorization/permissions'

interface AuthorizationPermissionRecord { id: string }
interface AuthorizationPrismaClient {
  permission: {
    upsert(args: {
      where: { code: string }
      update: object
      create: object
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

async function grantRolePermissions(app: FastifyInstance, roleName: string, codes: PermissionCode[]) {
  const role = await app.prisma.role.findUnique({ where: { name: roleName } })
  if (!role) throw new Error(`Ruolo ${roleName} non trovato`)
  for (const code of codes) {
    const permission = await ensurePermission(app, code)
    await getAuthorizationPrisma(app).rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    })
  }
}

describe('Branding images routes', () => {
  let app: FastifyInstance
  let managerCookie: string
  let collaboratoreCookie: string

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(async () => {
    await cleanupTestDb(app)

    await seedTestUser(app, { email: 'manager@test.com', password: 'pass123!', roles: ['manager'] })
    await seedTestUser(app, { email: 'collab@test.com', password: 'pass123!', roles: ['collaboratore'] })
    await grantRolePermissions(app, 'manager', ['branding.logo.manage'])

    managerCookie = await getAuthCookie(app, 'manager@test.com', 'pass123!')
    collaboratoreCookie = await getAuthCookie(app, 'collab@test.com', 'pass123!')
  })

  // ── GET /api/public/branding/images ──────────────────────────────────────

  describe('GET /api/public/branding/images', () => {
    it('restituisce 200 con mappa slot→null senza immagini su disco', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/public/branding/images' })
      expect(res.statusCode).toBe(200)
      const body = res.json<{ images: Record<string, string | null> }>()
      expect(body.images).toHaveProperty('home-funebri')
      expect(body.images).toHaveProperty('home-marmisti')
      expect(body.images).toHaveProperty('home-altri')
      expect(body.images).toHaveProperty('storia-narrativa')
      for (const val of Object.values(body.images)) {
        expect(val === null || typeof val === 'string').toBe(true)
      }
    })
  })

  // ── POST /api/admin/branding/images/:slot ────────────────────────────────

  describe('POST /api/admin/branding/images/:slot', () => {
    it('restituisce 401 senza autenticazione', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/branding/images/home-funebri',
      })
      expect(res.statusCode).toBe(401)
    })

    it('restituisce 403 senza permesso branding.logo.manage', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/branding/images/home-funebri',
        headers: { cookie: collaboratoreCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it('restituisce 400 per slot non valido', async () => {
      const boundary = '----TestBoundary'
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.png"',
        'Content-Type: image/png',
        '',
        'fake',
        `--${boundary}--`,
      ].join('\r\n')

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/branding/images/slot-inesistente',
        headers: {
          cookie: managerCookie,
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      })
      expect(res.statusCode).toBe(400)
      expect(res.json<{ error: string }>().error).toBe('BAD_REQUEST')
    })
  })

  // ── DELETE /api/admin/branding/images/:slot ──────────────────────────────

  describe('DELETE /api/admin/branding/images/:slot', () => {
    it('restituisce 401 senza autenticazione', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/admin/branding/images/home-funebri',
      })
      expect(res.statusCode).toBe(401)
    })

    it('restituisce 403 senza permesso branding.logo.manage', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/admin/branding/images/home-funebri',
        headers: { cookie: collaboratoreCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it('restituisce 400 per slot non valido', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/admin/branding/images/slot-inesistente',
        headers: { cookie: managerCookie },
      })
      expect(res.statusCode).toBe(400)
      expect(res.json<{ error: string }>().error).toBe('BAD_REQUEST')
    })

    it('restituisce 404 se non esiste nessun file per lo slot', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/admin/branding/images/home-funebri',
        headers: { cookie: managerCookie },
      })
      expect(res.statusCode).toBe(404)
    })
  })
})

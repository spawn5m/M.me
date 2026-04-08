import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb } from '../../test-helper'
import { SYSTEM_PERMISSIONS, type PermissionCode } from '../../lib/authorization/permissions'

interface AuthorizationPermissionRecord {
  id: string
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

describe('GET /api/admin/stats', () => {
  let app: FastifyInstance
  let cookie: string
  let collaboratoreCookie: string
  let impresarioCookie: string

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
      email: 'manager@test.com',
      password: 'password123',
      roles: ['manager']
    })
    await seedTestUser(app, {
      email: 'collab@test.com',
      password: 'password123',
      roles: ['collaboratore']
    })
    await seedTestUser(app, {
      email: 'imp@test.com',
      password: 'password123',
      roles: ['impresario_funebre']
    })

    await grantRolePermissions(app, 'manager', ['dashboard.admin.read'])

    cookie = await getAuthCookie(app, 'manager@test.com', 'password123')
    collaboratoreCookie = await getAuthCookie(app, 'collab@test.com', 'password123')
    impresarioCookie = await getAuthCookie(app, 'imp@test.com', 'password123')
  })

  it('restituisce 200 con i conteggi per un manager autenticato', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/stats',
      headers: { cookie }
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toHaveProperty('users')
    expect(body).toHaveProperty('coffins')
    expect(body).toHaveProperty('accessories')
    expect(body).toHaveProperty('marmista')
    expect(typeof body.users).toBe('number')
    expect(typeof body.coffins).toBe('number')
    expect(typeof body.accessories).toBe('number')
    expect(typeof body.marmista).toBe('number')
  })

  it('restituisce 401 senza autenticazione', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/stats'
    })
    expect(res.statusCode).toBe(401)
  })

  it('restituisce 403 senza dashboard.admin.read anche per collaboratore autenticato', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/stats',
      headers: { cookie: collaboratoreCookie }
    })
    expect(res.statusCode).toBe(403)
  })

  it('restituisce 403 per impresario autenticato', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/stats',
      headers: { cookie: impresarioCookie }
    })
    expect(res.statusCode).toBe(403)
  })
})

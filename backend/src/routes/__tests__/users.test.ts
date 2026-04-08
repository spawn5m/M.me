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

describe('Users API', () => {
  let app: FastifyInstance
  let superAdminCookie: string
  let managerCookie: string
  let collaboratoreCookie: string

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.prisma.user.updateMany({ data: { funeralPriceListId: null, marmistaPriceListId: null } })
    await app.prisma.priceListItem.deleteMany()
    await app.prisma.priceRule.deleteMany()
    await app.prisma.priceList.deleteMany()
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(async () => {
    await app.prisma.user.updateMany({ data: { funeralPriceListId: null, marmistaPriceListId: null } })
    await app.prisma.priceListItem.deleteMany()
    await app.prisma.priceRule.deleteMany()
    await app.prisma.priceList.deleteMany()
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
      email: 'collaboratore@test.com',
      password: 'password123',
      roles: ['collaboratore']
    })

    await grantRolePermissions(app, 'super_admin', [
      'users.read.team',
      'users.read.all',
      'users.create',
      'users.update.team',
      'users.update.all',
      'users.disable',
      'users.super_admin.read',
      'users.super_admin.manage',
    ])
    await grantRolePermissions(app, 'manager', [
      'users.read.team',
      'users.read.all',
      'users.create',
      'users.update.team',
      'users.update.all',
      'users.disable',
    ])
    await grantRolePermissions(app, 'collaboratore', [
      'users.read.team',
      'users.update.team',
    ])

    superAdminCookie = await getAuthCookie(app, 'superadmin@test.com', 'password123')
    managerCookie = await getAuthCookie(app, 'manager@test.com', 'password123')
    collaboratoreCookie = await getAuthCookie(app, 'collaboratore@test.com', 'password123')
  })

  describe('GET /api/users', () => {
    it('restituisce lista paginata per super_admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: { cookie: superAdminCookie }
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body).toHaveProperty('data')
      expect(body).toHaveProperty('pagination')
      expect(Array.isArray(body.data)).toBe(true)
    })

    it('non espone la password nelle risposte', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: { cookie: superAdminCookie }
      })
      const body = JSON.parse(res.body)
      for (const user of body.data) {
        expect(user).not.toHaveProperty('password')
      }
    })

    it('restituisce 401 senza autenticazione', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/users' })
      expect(res.statusCode).toBe(401)
    })

    it('filtra per role con query param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/users?role=manager',
        headers: { cookie: superAdminCookie }
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.data.every((u: { roles: { name: string }[] }) =>
        u.roles.some((r) => r.name === 'manager')
      )).toBe(true)
    })

    it('nasconde gli utenti super_admin a manager senza users.super_admin.read', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: { cookie: managerCookie }
      })

      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body) as {
        data: Array<{ email: string; roles: Array<{ name: string }> }>
      }

      expect(body.data.some((user) => user.email === 'superadmin@test.com')).toBe(false)
      expect(body.data.some((user) => user.roles.some((role) => role.name === 'super_admin'))).toBe(false)
    })

    it('usa fallback sicuri per page e pageSize non numerici', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/users?page=abc&pageSize=xyz',
        headers: { cookie: superAdminCookie }
      })

      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body) as {
        data: unknown[]
        pagination: { page: number; pageSize: number }
      }

      expect(Array.isArray(body.data)).toBe(true)
      expect(body.pagination).toMatchObject({
        page: 1,
        pageSize: 20,
      })
    })
  })

  describe('POST /api/users', () => {
    it('crea un nuovo utente (201)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { cookie: superAdminCookie },
        payload: {
          email: 'nuovo@test.com',
          password: 'password123',
          firstName: 'Nuovo',
          lastName: 'Utente',
          roleIds: []
        }
      })
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.email).toBe('nuovo@test.com')
      expect(body).not.toHaveProperty('password')
    })

    it('restituisce 400 con email invalida', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { cookie: superAdminCookie },
        payload: {
          email: 'non-una-email',
          password: 'password123',
          firstName: 'X',
          lastName: 'Y',
          roleIds: []
        }
      })
      expect(res.statusCode).toBe(400)
    })

    it('restituisce 409 con email duplicata', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { cookie: superAdminCookie },
        payload: {
          email: 'superadmin@test.com',
          password: 'password123',
          firstName: 'Dup',
          lastName: 'Lic',
          roleIds: []
        }
      })
      expect(res.statusCode).toBe(409)
    })

    it('restituisce 403 a collaboratore senza users.create', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { cookie: collaboratoreCookie },
        payload: {
          email: 'vietato@test.com',
          password: 'password123',
          firstName: 'No',
          lastName: 'Create',
          roleIds: []
        }
      })

      expect(res.statusCode).toBe(403)
      expect(JSON.parse(res.body)).toMatchObject({
        error: 'Forbidden',
        statusCode: 403,
      })
    })

    it('restituisce 400 con roleIds non validi', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { cookie: superAdminCookie },
        payload: {
          email: 'ruolo-invalido@test.com',
          password: 'password123',
          firstName: 'Ruolo',
          lastName: 'Invalido',
          roleIds: ['role-id-non-esiste']
        }
      })

      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.body)).toMatchObject({
        error: 'ValidationError',
        statusCode: 400,
      })
    })

    it('richiede users.assign_manager quando managerId viene impostato in creazione', async () => {
      const managerUser = await app.prisma.user.findUnique({ where: { email: 'manager@test.com' } })
      if (!managerUser) {
        throw new Error('Manager non trovato')
      }

      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { cookie: managerCookie },
        payload: {
          email: 'assegnato@test.com',
          password: 'password123',
          firstName: 'Assegnato',
          lastName: 'Manager',
          roleIds: [],
          managerId: managerUser.id,
        }
      })

      expect(res.statusCode).toBe(403)
      expect(JSON.parse(res.body)).toMatchObject({
        error: 'Forbidden',
        statusCode: 403,
      })
    })
  })

  describe('GET /api/users/:id', () => {
    it('restituisce 200 per utente esistente', async () => {
      const list = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: { cookie: superAdminCookie }
      })
      const { data } = JSON.parse(list.body)
      const id = data[0].id

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${id}`,
        headers: { cookie: superAdminCookie }
      })
      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body)).not.toHaveProperty('password')
    })

    it('espone i listini assegnati nella scheda utente', async () => {
      const created = await app.prisma.priceList.create({
        data: { name: 'Listino Funebre', type: 'sale', articleType: 'funeral', autoUpdate: false },
      })

      const list = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: { cookie: superAdminCookie }
      })
      const { data } = JSON.parse(list.body)
      const target = data.find((user: { roles: { name: string }[] }) =>
        user.roles.some((role) => role.name === 'manager')
      )

      await app.prisma.user.update({
        where: { id: target.id },
        data: { funeralPriceListId: created.id },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${target.id}`,
        headers: { cookie: superAdminCookie }
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body)).toMatchObject({
        funeralPriceList: {
          id: created.id,
          name: 'Listino Funebre',
          articleType: 'funeral',
        },
      })
    })

    it('restituisce 404 per ID inesistente', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/users/id-non-esiste',
        headers: { cookie: superAdminCookie }
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('PUT /api/users/:id', () => {
    it('aggiorna firstName', async () => {
      const list = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: { cookie: superAdminCookie }
      })
      const { data } = JSON.parse(list.body)
      const id = data[0].id

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${id}`,
        headers: { cookie: superAdminCookie },
        payload: { firstName: 'Aggiornato' }
      })
      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body).firstName).toBe('Aggiornato')
    })

    it('restituisce 400 con managerId non valido', async () => {
      const list = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: { cookie: superAdminCookie }
      })
      const { data } = JSON.parse(list.body)
      const target = data.find((user: { roles: { name: string }[] }) =>
        user.roles.some((role) => role.name === 'collaboratore')
      )

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${target.id}`,
        headers: { cookie: superAdminCookie },
        payload: { managerId: 'manager-id-non-esiste' }
      })

      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.body)).toMatchObject({
        error: 'ValidationError',
        statusCode: 400,
      })
    })

    it('richiede users.assign_manager quando managerId viene cambiato', async () => {
      const users = await app.prisma.user.findMany({
        where: { email: { in: ['superadmin@test.com', 'manager@test.com', 'collaboratore@test.com'] } },
        include: { userRoles: { include: { role: true } } },
      })

      const collaboratore = users.find((user) => user.email === 'collaboratore@test.com')
      const superAdmin = users.find((user) => user.email === 'superadmin@test.com')

      if (!collaboratore || !superAdmin) {
        throw new Error('Utenti di test non trovati')
      }

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${collaboratore.id}`,
        headers: { cookie: managerCookie },
        payload: { managerId: superAdmin.id }
      })

      expect(res.statusCode).toBe(403)
      expect(JSON.parse(res.body)).toMatchObject({
        error: 'Forbidden',
        statusCode: 403,
      })
    })

    it('richiede users.assign_manager quando managerId viene rimosso', async () => {
      const users = await app.prisma.user.findMany({
        where: { email: { in: ['manager@test.com', 'collaboratore@test.com'] } },
      })

      const manager = users.find((user) => user.email === 'manager@test.com')
      const collaboratore = users.find((user) => user.email === 'collaboratore@test.com')

      if (!manager || !collaboratore) {
        throw new Error('Utenti di test non trovati')
      }

      await app.prisma.userManager.create({
        data: {
          managerId: manager.id,
          userId: collaboratore.id,
        },
      })

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${collaboratore.id}`,
        headers: { cookie: managerCookie },
        payload: { managerId: null }
      })

      expect(res.statusCode).toBe(403)
      expect(JSON.parse(res.body)).toMatchObject({
        error: 'Forbidden',
        statusCode: 403,
      })
    })
  })

  describe('DELETE /api/users/:id', () => {
    it('soft delete — imposta isActive=false (204)', async () => {
      const list = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: { cookie: superAdminCookie }
      })
      const { data } = JSON.parse(list.body)
      // Usa il collaboratore per non eliminare superadmin
      const target = data.find((u: { roles: { name: string }[] }) =>
        u.roles.some((r) => r.name === 'collaboratore')
      )

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/users/${target.id}`,
        headers: { cookie: superAdminCookie }
      })
      expect(res.statusCode).toBe(204)

      const check = await app.inject({
        method: 'GET',
        url: `/api/users/${target.id}`,
        headers: { cookie: superAdminCookie }
      })
      expect(JSON.parse(check.body).isActive).toBe(false)
    })
  })

  describe('GET /api/users/me/subordinates', () => {
    it('restituisce 200 per collaboratore', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/users/me/subordinates',
        headers: { cookie: collaboratoreCookie }
      })
      expect(res.statusCode).toBe(200)
    })

    it('nasconde i subordinati super_admin senza users.super_admin.read', async () => {
      const users = await app.prisma.user.findMany({
        where: { email: { in: ['manager@test.com', 'superadmin@test.com'] } },
      })

      const manager = users.find((user) => user.email === 'manager@test.com')
      const superAdmin = users.find((user) => user.email === 'superadmin@test.com')

      if (!manager || !superAdmin) {
        throw new Error('Utenti di test non trovati')
      }

      await app.prisma.userManager.create({
        data: {
          managerId: manager.id,
          userId: superAdmin.id,
        },
      })

      const res = await app.inject({
        method: 'GET',
        url: '/api/users/me/subordinates',
        headers: { cookie: managerCookie }
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body)).toEqual([])
    })
  })
})

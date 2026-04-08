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

describe('Client API', () => {
  let app: FastifyInstance
  let impresarioCookie: string
  let marmistaCookie: string
  let plId: string
  let funeralArticleId: string
  let funeralHiddenArticleId: string
  let marmistaArticleId: string
  let marmistaPlId: string
  let marmistaHiddenArticleId: string

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.prisma.user.updateMany({ data: { funeralPriceListId: null, marmistaPriceListId: null } })
    await app.prisma.priceListItem.deleteMany()
    await app.prisma.priceRule.deleteMany()
    await app.prisma.priceList.deleteMany()
    await app.prisma.coffinArticle.deleteMany()
    await app.prisma.marmistaArticle.deleteMany()
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(async () => {
    await app.prisma.user.updateMany({ data: { funeralPriceListId: null, marmistaPriceListId: null } })
    await app.prisma.priceListItem.deleteMany()
    await app.prisma.priceRule.deleteMany()
    await app.prisma.priceList.deleteMany()
    await app.prisma.coffinArticle.deleteMany()
    await app.prisma.marmistaArticle.deleteMany()
    await cleanupTestDb(app)

    const pl = await app.prisma.priceList.create({
      data: { name: 'Test PL', type: 'sale', articleType: 'funeral', autoUpdate: false },
    })
    plId = pl.id

    const marmistaPl = await app.prisma.priceList.create({
      data: { name: 'Marmista PL', type: 'sale', articleType: 'marmista', autoUpdate: false },
    })
    marmistaPlId = marmistaPl.id

    funeralArticleId = (await app.prisma.coffinArticle.create({
      data: { code: 'COF-CLIENT', description: 'Cofano cliente' },
    })).id
    funeralHiddenArticleId = (await app.prisma.coffinArticle.create({
      data: { code: 'COF-HIDDEN', description: 'Cofano non assegnato' },
    })).id
    marmistaArticleId = (await app.prisma.marmistaArticle.create({
      data: { code: 'MAR-CLIENT', description: 'Articolo marmista cliente' },
    })).id
    marmistaHiddenArticleId = (await app.prisma.marmistaArticle.create({
      data: { code: 'MAR-HIDDEN', description: 'Articolo marmista non assegnato' },
    })).id

    await app.prisma.priceListItem.create({
      data: { priceListId: plId, coffinArticleId: funeralArticleId, price: 123 },
    })

    await app.prisma.priceListItem.create({
      data: { priceListId: marmistaPlId, marmistaArticleId, price: 456 },
    })

    const { id: impId } = await seedTestUser(app, {
      email: 'imp@test.com',
      password: 'pass1234!',
      roles: ['impresario_funebre'],
    })
    await app.prisma.user.update({ where: { id: impId }, data: { funeralPriceListId: plId } })
    impresarioCookie = await getAuthCookie(app, 'imp@test.com', 'pass1234!')

    await seedTestUser(app, {
      email: 'mar@test.com',
      password: 'pass1234!',
      roles: ['marmista'],
    })
    const marmistaUser = await app.prisma.user.findUnique({ where: { email: 'mar@test.com' } })
    if (!marmistaUser) {
      throw new Error('Utente marmista non trovato')
    }
    await app.prisma.user.update({ where: { id: marmistaUser.id }, data: { marmistaPriceListId: marmistaPlId } })

    await grantRolePermissions(app, 'impresario_funebre', [
      'client.profile.read',
      'client.password.change',
      'client.catalog.funeral.read',
    ])
    await grantRolePermissions(app, 'marmista', ['client.catalog.marmista.read'])

    marmistaCookie = await getAuthCookie(app, 'mar@test.com', 'pass1234!')
  })

  it('GET /api/client/me — restituisce listino assegnato', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/client/me',
      headers: { cookie: impresarioCookie },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('funeralPriceList')
    expect(body.funeralPriceList).toMatchObject({ id: plId, name: 'Test PL' })
  })

  it('marmista non può accedere a /catalog/funeral → 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/client/catalog/funeral',
      headers: { cookie: marmistaCookie },
    })

    expect(res.statusCode).toBe(403)
  })

  it('catalogo funebre restituisce warning se nessun listino assegnato', async () => {
    // Crea un impresario senza listino assegnato
    await seedTestUser(app, {
      email: 'imp_noprice@test.com',
      password: 'pass1234!',
      roles: ['impresario_funebre'],
    })
    const noListinoCookie = await getAuthCookie(app, 'imp_noprice@test.com', 'pass1234!')

    const res = await app.inject({
      method: 'GET',
      url: '/api/client/catalog/funeral',
      headers: { cookie: noListinoCookie },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({
      data: [],
      warning: 'Nessun listino assegnato',
    })
  })

  it('catalogo funebre restituisce solo articoli presenti nel listino assegnato', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/client/catalog/funeral',
      headers: { cookie: impresarioCookie },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      data: Array<{ id: string; code: string; price: number | null }>
      pagination: { total: number }
    }

    expect(body.data).toEqual([
      expect.objectContaining({ id: funeralArticleId, code: 'COF-CLIENT', price: 123 }),
    ])
    expect(body.pagination.total).toBe(1)
  })

  it('dettaglio catalogo funebre restituisce 404 per articolo fuori listino', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/client/catalog/funeral/${funeralHiddenArticleId}`,
      headers: { cookie: impresarioCookie },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: 'NotFound', statusCode: 404 })
  })

  it('dettaglio catalogo funebre restituisce 404 senza listino assegnato', async () => {
    await seedTestUser(app, {
      email: 'imp_detail@test.com',
      password: 'pass1234!',
      roles: ['impresario_funebre'],
    })
    const noListinoCookie = await getAuthCookie(app, 'imp_detail@test.com', 'pass1234!')

    const res = await app.inject({
      method: 'GET',
      url: `/api/client/catalog/funeral/${funeralArticleId}`,
      headers: { cookie: noListinoCookie },
    })

    expect(res.statusCode).toBe(404)
  })

  it('dettaglio catalogo marmista restituisce 404 senza listino assegnato', async () => {
    const { id } = await seedTestUser(app, {
      email: 'mar_detail@test.com',
      password: 'pass1234!',
      roles: ['marmista'],
    })
    const noListinoCookie = await getAuthCookie(app, 'mar_detail@test.com', 'pass1234!')

    await app.prisma.user.update({ where: { id }, data: { marmistaPriceListId: null } })

    const res = await app.inject({
      method: 'GET',
      url: `/api/client/catalog/marmista/${marmistaArticleId}`,
      headers: { cookie: noListinoCookie },
    })

    expect(res.statusCode).toBe(404)
  })

  it('catalogo marmista restituisce solo articoli presenti nel listino assegnato', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/client/catalog/marmista',
      headers: { cookie: marmistaCookie },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      data: Array<{ id: string; code: string; price: number | null }>
      pagination: { total: number }
    }

    expect(body.data).toEqual([
      expect.objectContaining({ id: marmistaArticleId, code: 'MAR-CLIENT', price: 456 }),
    ])
    expect(body.pagination.total).toBe(1)
  })

  it('dettaglio catalogo marmista restituisce 404 per articolo fuori listino', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/client/catalog/marmista/${marmistaHiddenArticleId}`,
      headers: { cookie: marmistaCookie },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: 'NotFound', statusCode: 404 })
  })

  it('change-password rifiuta vecchia password errata → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/client/change-password',
      headers: { cookie: impresarioCookie },
      payload: { oldPassword: 'wrongpassword!', newPassword: 'nuovapass123!' },
    })

    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('change-password aggiorna con password corretta → 200 { ok: true }', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/client/change-password',
      headers: { cookie: impresarioCookie },
      payload: { oldPassword: 'pass1234!', newPassword: 'nuovapass123!' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true })

    // Verifica che il nuovo login con la nuova password funzioni
    const newLoginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'imp@test.com', password: 'nuovapass123!' },
    })
    expect(newLoginRes.statusCode).toBe(200)
  })
})

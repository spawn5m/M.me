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

describe('Pricelists API', () => {
  let app: FastifyInstance
  let managerCookie: string
  let collaboratoreCookie: string
  let saleReaderCookie: string

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.prisma.user.updateMany({ data: { funeralPriceListId: null, marmistaPriceListId: null } })
    await app.prisma.priceListItem.deleteMany()
    await app.prisma.priceRule.deleteMany()
    await app.prisma.priceList.deleteMany()
    await app.prisma.coffinArticle.deleteMany()
    await app.prisma.coffinCategory.deleteMany()
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(async () => {
    await app.prisma.user.updateMany({ data: { funeralPriceListId: null, marmistaPriceListId: null } })
    await app.prisma.priceListItem.deleteMany()
    await app.prisma.priceRule.deleteMany()
    await app.prisma.priceList.deleteMany()
    await app.prisma.coffinArticle.deleteMany()
    await app.prisma.coffinCategory.deleteMany()
    await cleanupTestDb(app)

    await seedTestUser(app, { email: 'manager@test.com', password: 'password123', roles: ['manager'] })
    await seedTestUser(app, { email: 'collab@test.com', password: 'password123', roles: ['collaboratore'] })
    await seedTestUser(app, { email: 'sales@test.com', password: 'password123', roles: ['sales_reader'] })

    await grantRolePermissions(app, 'manager', [
      'pricelists.sale.read',
      'pricelists.sale.write',
      'pricelists.sale.delete',
      'pricelists.sale.assign',
      'pricelists.sale.preview',
      'pricelists.sale.recalculate',
      'pricelists.purchase.read',
      'pricelists.purchase.write',
      'pricelists.purchase.delete',
      'pricelists.purchase.preview',
      'pricelists.purchase.recalculate',
    ])
    await grantRolePermissions(app, 'sales_reader', ['pricelists.sale.read'])

    managerCookie = await getAuthCookie(app, 'manager@test.com', 'password123')
    collaboratoreCookie = await getAuthCookie(app, 'collab@test.com', 'password123')
    saleReaderCookie = await getAuthCookie(app, 'sales@test.com', 'password123')
  })

  it('crea listino base e imposta prezzi', async () => {
    const article = await app.prisma.coffinArticle.create({ data: { code: 'C1', description: 'Test' } })

    const pl = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Base Funebre', type: 'sale', articleType: 'funeral', autoUpdate: false },
    })
    expect(pl.statusCode).toBe(201)
    const plId = pl.json().id

    const items = await app.inject({
      method: 'POST',
      url: `/api/admin/pricelists/${plId}/items`,
      headers: { cookie: managerCookie },
      payload: { items: [{ coffinArticleId: article.id, price: 100 }] },
    })
    expect(items.statusCode).toBe(200)
    expect(items.json()).toMatchObject({ ok: true })
  })

  it('restituisce 403 a collaboratore senza permessi di lettura listini', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/pricelists',
      headers: { cookie: collaboratoreCookie },
    })

    expect(res.statusCode).toBe(403)
  })

  it('nasconde listino acquisto a chi ha solo pricelists.sale.read', async () => {
    await app.prisma.priceList.create({
      data: { name: 'Acquisto', type: 'purchase', articleType: 'funeral', autoUpdate: false },
    })
    await app.prisma.priceList.create({
      data: { name: 'Vendita', type: 'sale', articleType: 'funeral', autoUpdate: false },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/pricelists',
      headers: { cookie: saleReaderCookie },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.every((p: { type: string }) => p.type !== 'purchase')).toBe(true)
  })

  it('manager vede anche listini acquisto', async () => {
    await app.prisma.priceList.create({
      data: { name: 'Acquisto', type: 'purchase', articleType: 'funeral', autoUpdate: false },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
    })
    expect(res.json().data.some((p: { type: string }) => p.type === 'purchase')).toBe(true)
  })

  it('aggiunge regola a un listino', async () => {
    const pl = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Derivato', type: 'sale', articleType: 'funeral', autoUpdate: true },
    })
    const plId = pl.json().id

    const rule = await app.inject({
      method: 'POST',
      url: `/api/admin/pricelists/${plId}/rules`,
      headers: { cookie: managerCookie },
      payload: { filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 },
    })
    expect(rule.statusCode).toBe(201)
    expect(rule.json()).toMatchObject({ discountValue: 10 })
  })

  it('non elimina una regola che appartiene a un altro listino', async () => {
    const firstList = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Listino Uno', type: 'sale', articleType: 'funeral', autoUpdate: true },
    })
    const secondList = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Listino Due', type: 'sale', articleType: 'funeral', autoUpdate: true },
    })

    const rule = await app.inject({
      method: 'POST',
      url: `/api/admin/pricelists/${secondList.json().id}/rules`,
      headers: { cookie: managerCookie },
      payload: { filterType: null, filterValue: null, discountType: 'percentage', discountValue: 5 },
    })

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/admin/pricelists/${firstList.json().id}/rules/${rule.json().id}`,
      headers: { cookie: managerCookie },
    })

    expect(res.statusCode).toBe(404)
  })

  it('aggiorna i metadati di un listino', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Base da aggiornare', type: 'sale', articleType: 'funeral', autoUpdate: false },
    })

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/admin/pricelists/${created.json().id}`,
      headers: { cookie: managerCookie },
      payload: { name: 'Base aggiornata', type: 'sale', articleType: 'funeral', autoUpdate: false, parentId: null },
    })

    expect(updated.statusCode).toBe(200)
    expect(updated.json()).toMatchObject({ name: 'Base aggiornata' })
  })

  it('rifiuta un listino derivato con tipo diverso dal padre', async () => {
    const parent = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Padre Acquisto', type: 'purchase', articleType: 'funeral', autoUpdate: false },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Figlio Vendita', type: 'sale', articleType: 'funeral', autoUpdate: true, parentId: parent.json().id },
    })

    expect(res.statusCode).toBe(400)
  })

  it('rifiuta l aggiornamento di un listino con un padre di tipo diverso', async () => {
    const child = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Figlio Vendita', type: 'sale', articleType: 'funeral', autoUpdate: true },
    })
    const parent = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Padre Acquisto', type: 'purchase', articleType: 'funeral', autoUpdate: false },
    })

    const res = await app.inject({
      method: 'PUT',
      url: `/api/admin/pricelists/${child.json().id}`,
      headers: { cookie: managerCookie },
      payload: {
        name: 'Figlio Vendita',
        type: 'sale',
        articleType: 'funeral',
        autoUpdate: true,
        parentId: parent.json().id,
      },
    })

    expect(res.statusCode).toBe(400)
  })

  it('calcola l anteprima di un listino derivato', async () => {
    const category = await app.prisma.coffinCategory.create({ data: { code: 'CAT01', label: 'Categoria' } })
    const article = await app.prisma.coffinArticle.create({
      data: { code: 'C1', description: 'Test', categories: { connect: { id: category.id } } },
    })

    const base = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Base Funebre', type: 'sale', articleType: 'funeral', autoUpdate: false },
    })
    const baseId = base.json().id

    await app.inject({
      method: 'POST',
      url: `/api/admin/pricelists/${baseId}/items`,
      headers: { cookie: managerCookie },
      payload: { items: [{ coffinArticleId: article.id, price: 100 }] },
    })

    const derived = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Derivato', type: 'sale', articleType: 'funeral', autoUpdate: true, parentId: baseId },
    })
    const derivedId = derived.json().id

    await app.inject({
      method: 'POST',
      url: `/api/admin/pricelists/${derivedId}/rules`,
      headers: { cookie: managerCookie },
      payload: { filterType: 'category', filterValue: 'CAT01', discountType: 'percentage', discountValue: 10 },
    })

    const preview = await app.inject({
      method: 'GET',
      url: `/api/admin/pricelists/${derivedId}/preview`,
      headers: { cookie: managerCookie },
    })

    expect(preview.statusCode).toBe(200)
    expect(preview.json().previews[0]).toMatchObject({ computedPrice: 90 })
  })

  it('ricalcola lo snapshot di un listino derivato', async () => {
    const category = await app.prisma.coffinCategory.create({ data: { code: 'CAT02', label: 'Categoria 2' } })
    const article = await app.prisma.coffinArticle.create({
      data: { code: 'C2', description: 'Test 2', categories: { connect: { id: category.id } } },
    })

    const base = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Base Snapshot', type: 'sale', articleType: 'funeral', autoUpdate: false },
    })
    const baseId = base.json().id

    await app.inject({
      method: 'POST',
      url: `/api/admin/pricelists/${baseId}/items`,
      headers: { cookie: managerCookie },
      payload: { items: [{ coffinArticleId: article.id, price: 100 }] },
    })

    const derived = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Snapshot Derivato', type: 'sale', articleType: 'funeral', autoUpdate: false, parentId: baseId },
    })
    const derivedId = derived.json().id

    await app.inject({
      method: 'POST',
      url: `/api/admin/pricelists/${derivedId}/rules`,
      headers: { cookie: managerCookie },
      payload: { filterType: 'category', filterValue: 'CAT02', discountType: 'absolute', discountValue: 15 },
    })

    const recalc = await app.inject({
      method: 'POST',
      url: `/api/admin/pricelists/${derivedId}/recalculate`,
      headers: { cookie: managerCookie },
    })

    expect(recalc.statusCode).toBe(200)
    expect(recalc.json()).toMatchObject({ recalculated: 1 })

    const detail = await app.inject({
      method: 'GET',
      url: `/api/admin/pricelists/${derivedId}`,
      headers: { cookie: managerCookie },
    })

    expect(detail.statusCode).toBe(200)
    expect(detail.json().items[0]).toMatchObject({ price: 85 })
  })

  it('blocca la cancellazione se il listino ha figli', async () => {
    const base = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Base Padre', type: 'sale', articleType: 'funeral', autoUpdate: false },
    })

    await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Figlio', type: 'sale', articleType: 'funeral', autoUpdate: true, parentId: base.json().id },
    })

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/admin/pricelists/${base.json().id}`,
      headers: { cookie: managerCookie },
    })

    expect(del.statusCode).toBe(409)
  })

  it('blocca la cancellazione se il listino è assegnato a un utente', async () => {
    const { id: userId } = await seedTestUser(app, {
      email: 'assegnato@test.com', password: 'password123', roles: ['impresario_funebre'],
    })

    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/pricelists',
      headers: { cookie: managerCookie },
      payload: { name: 'Listino assegnato', type: 'sale', articleType: 'funeral', autoUpdate: false },
    })

    await app.inject({
      method: 'PUT',
      url: `/api/admin/pricelists/${created.json().id}/assign/${userId}`,
      headers: { cookie: managerCookie },
    })

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/admin/pricelists/${created.json().id}`,
      headers: { cookie: managerCookie },
    })

    expect(del.statusCode).toBe(409)
  })

  it('blocca assegnazione listino funeral a marmista', async () => {
    const { id: userId } = await seedTestUser(app, {
      email: 'marmista@test.com', password: 'password123', roles: ['marmista'],
    })
    const pl = await app.prisma.priceList.create({
      data: { name: 'Listino Funebre', type: 'sale', articleType: 'funeral', autoUpdate: false },
    })

    const res = await app.inject({
      method: 'PUT',
      url: `/api/admin/pricelists/${pl.id}/assign/${userId}`,
      headers: { cookie: managerCookie },
    })
    expect(res.statusCode).toBe(400)
  })

  it('assegna listino marmista a utente marmista', async () => {
    const { id: userId } = await seedTestUser(app, {
      email: 'marmista2@test.com', password: 'password123', roles: ['marmista'],
    })
    const pl = await app.prisma.priceList.create({
      data: { name: 'Listino Marmista', type: 'sale', articleType: 'marmista', autoUpdate: false },
    })

    const res = await app.inject({
      method: 'PUT',
      url: `/api/admin/pricelists/${pl.id}/assign/${userId}`,
      headers: { cookie: managerCookie },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true })
  })

  it('blocca assegnazione listino marmista a impresario funebre', async () => {
    const { id: userId } = await seedTestUser(app, {
      email: 'imp2@test.com', password: 'password123', roles: ['impresario_funebre'],
    })
    const pl = await app.prisma.priceList.create({
      data: { name: 'Listino Marmista', type: 'sale', articleType: 'marmista', autoUpdate: false },
    })

    const res = await app.inject({
      method: 'PUT',
      url: `/api/admin/pricelists/${pl.id}/assign/${userId}`,
      headers: { cookie: managerCookie },
    })

    expect(res.statusCode).toBe(400)
  })
})

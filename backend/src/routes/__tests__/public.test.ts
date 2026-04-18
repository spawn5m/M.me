import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb, grantUserPermissions } from '../../test-helper'

describe('Public API', () => {
  let app: FastifyInstance
  let impresarioCookie: string
  let managerCookie: string

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.prisma.user.updateMany({ data: { funeralPriceListId: null, marmistaPriceListId: null } })
    await app.prisma.priceListItem.deleteMany()
    await app.prisma.priceRule.deleteMany()
    await app.prisma.priceList.deleteMany()
    await app.prisma.coffinArticle.deleteMany()
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(async () => {
    await app.prisma.user.updateMany({ data: { funeralPriceListId: null, marmistaPriceListId: null } })
    await app.prisma.priceListItem.deleteMany()
    await app.prisma.priceRule.deleteMany()
    await app.prisma.priceList.deleteMany()
    await app.prisma.coffinArticle.deleteMany()
    await cleanupTestDb(app)

    const coffin = await app.prisma.coffinArticle.create({
      data: {
        code: 'COF-001',
        description: 'Cofano test pubblico',
      },
    })

    const baseList = await app.prisma.priceList.create({
      data: {
        name: 'Listino Base',
        type: 'sale',
        articleType: 'funeral',
        autoUpdate: false,
      },
    })

    const derivedList = await app.prisma.priceList.create({
      data: {
        name: 'Listino Promo',
        type: 'sale',
        articleType: 'funeral',
        autoUpdate: true,
        parentId: baseList.id,
      },
    })

    await app.prisma.priceList.create({
      data: {
        name: 'Listino Acquisto',
        type: 'purchase',
        articleType: 'funeral',
        autoUpdate: false,
      },
    })

    await app.prisma.priceListItem.create({
      data: {
        priceListId: baseList.id,
        coffinArticleId: coffin.id,
        price: 100,
      },
    })

    await app.prisma.priceRule.create({
      data: {
        priceListId: derivedList.id,
        filterType: null,
        filterValue: null,
        discountType: 'percentage',
        discountValue: 10,
      },
    })

    const { id: impresarioId } = await seedTestUser(app, {
      email: 'imp-public@test.com',
      password: 'pass1234!',
      roles: ['impresario_funebre'],
    })

    await grantUserPermissions(app, impresarioId, ['client.catalog.funeral.read'])

    await app.prisma.user.update({
      where: { id: impresarioId },
      data: { funeralPriceListId: derivedList.id },
    })

    const { id: managerId } = await seedTestUser(app, {
      email: 'manager-public@test.com',
      password: 'pass1234!',
      roles: ['manager'],
    })
    await grantUserPermissions(app, managerId, ['pricelists.sale.preview'])

    impresarioCookie = await getAuthCookie(app, 'imp-public@test.com', 'pass1234!')
    managerCookie = await getAuthCookie(app, 'manager-public@test.com', 'pass1234!')
  })

  it('non espone prezzi a utenti anonimi', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/coffins',
    })

    expect(res.statusCode).toBe(200)

    const [item] = res.json().data as Array<Record<string, unknown>>
    expect(item).not.toHaveProperty('price')
    expect(item).not.toHaveProperty('priceOptions')
  })

  it('mostra il prezzo del listino assegnato a un impresario loggato', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/coffins',
      headers: { cookie: impresarioCookie },
    })

    expect(res.statusCode).toBe(200)

    const [item] = res.json().data as Array<Record<string, unknown>>
    expect(item).toMatchObject({
      code: 'COF-001',
      price: 90,
    })
    expect(item).not.toHaveProperty('priceOptions')
  })

  it('mostra per un manager i prezzi dei listini vendita disponibili', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/coffins',
      headers: { cookie: managerCookie },
    })

    expect(res.statusCode).toBe(200)

    const [item] = res.json().data as Array<Record<string, unknown>>
    expect(item).not.toHaveProperty('price')
    expect(item).toMatchObject({
      code: 'COF-001',
      priceOptions: [
        { priceListName: 'Listino Base', priceListType: 'sale', price: 100 },
        { priceListName: 'Listino Promo', priceListType: 'sale', price: 90 },
      ],
    })
  })
})

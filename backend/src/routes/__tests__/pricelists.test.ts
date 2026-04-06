import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb } from '../../test-helper'

describe('Pricelists API', () => {
  let app: FastifyInstance
  let managerCookie: string
  let collaboratoreCookie: string

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.prisma.priceListItem.deleteMany()
    await app.prisma.priceRule.deleteMany()
    await app.prisma.priceList.deleteMany()
    await app.prisma.coffinArticle.deleteMany()
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(async () => {
    await app.prisma.priceListItem.deleteMany()
    await app.prisma.priceRule.deleteMany()
    await app.prisma.priceList.deleteMany()
    await app.prisma.coffinArticle.deleteMany()
    await cleanupTestDb(app)

    await seedTestUser(app, { email: 'manager@test.com', password: 'password123', roles: ['manager'] })
    await seedTestUser(app, { email: 'collab@test.com', password: 'password123', roles: ['collaboratore'] })

    managerCookie = await getAuthCookie(app, 'manager@test.com', 'password123')
    collaboratoreCookie = await getAuthCookie(app, 'collab@test.com', 'password123')
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

  it('nasconde listino acquisto a collaboratore', async () => {
    await app.prisma.priceList.create({
      data: { name: 'Acquisto', type: 'purchase', articleType: 'funeral', autoUpdate: false },
    })
    await app.prisma.priceList.create({
      data: { name: 'Vendita', type: 'sale', articleType: 'funeral', autoUpdate: false },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/pricelists',
      headers: { cookie: collaboratoreCookie },
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
})

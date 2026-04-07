import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb } from '../../test-helper'

describe('Client API', () => {
  let app: FastifyInstance
  let impresarioCookie: string
  let marmistaCookie: string
  let plId: string

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

    const pl = await app.prisma.priceList.create({
      data: { name: 'Test PL', type: 'sale', articleType: 'funeral', autoUpdate: false },
    })
    plId = pl.id

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

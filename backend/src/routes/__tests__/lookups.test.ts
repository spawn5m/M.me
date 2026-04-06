import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb } from '../../test-helper'

describe('Lookup API', () => {
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
    // Cleanup lookup tables
    await app.prisma.coffinCategory.deleteMany()

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

    managerCookie = await getAuthCookie(app, 'manager@test.com', 'password123')
    collaboratoreCookie = await getAuthCookie(app, 'collaboratore@test.com', 'password123')
  })

  it('GET /coffin-categories restituisce lista vuota per manager autenticato', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/lookups/coffin-categories',
      headers: { cookie: managerCookie }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ data: [], pagination: expect.any(Object) })
  })

  it('POST /coffin-categories crea un nuovo lookup', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/lookups/coffin-categories',
      headers: { cookie: managerCookie },
      payload: { code: 'CAT01', label: 'Categoria Test' }
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ code: 'CAT01', label: 'Categoria Test' })
  })

  it('GET con tipo non valido ritorna 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/lookups/tipo-inesistente',
      headers: { cookie: managerCookie }
    })
    expect(res.statusCode).toBe(404)
  })

  it('rifiuta ruolo non autorizzato con 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/lookups/coffin-categories',
      headers: { cookie: collaboratoreCookie }
    })
    expect(res.statusCode).toBe(403)
  })
})

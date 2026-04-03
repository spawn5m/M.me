import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb } from '../../test-helper'

describe('GET /api/admin/stats', () => {
  let app: FastifyInstance
  let cookie: string

  beforeAll(async () => {
    app = await buildTestApp()
    await cleanupTestDb(app)
    await seedTestUser(app, {
      email: 'manager@test.com',
      password: 'password123',
      roles: ['manager']
    })
    cookie = await getAuthCookie(app, 'manager@test.com', 'password123')
  })

  afterAll(async () => {
    await cleanupTestDb(app)
    await app.close()
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

  it('restituisce 403 per ruolo non autorizzato', async () => {
    await seedTestUser(app, {
      email: 'noauth@test.com',
      password: 'password123',
      roles: ['impresario']
    })
    const c = await getAuthCookie(app, 'noauth@test.com', 'password123')
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/stats',
      headers: { cookie: c }
    })
    expect(res.statusCode).toBe(403)
  })
})

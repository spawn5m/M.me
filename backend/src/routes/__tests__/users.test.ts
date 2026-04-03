import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb } from '../../test-helper'

describe('Users API', () => {
  let app: FastifyInstance
  let superAdminCookie: string
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
  })
})

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb } from '../../test-helper'

describe('Roles API', () => {
  let app: FastifyInstance
  let superAdminCookie: string
  let managerCookie: string

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

    superAdminCookie = await getAuthCookie(app, 'superadmin@test.com', 'password123')
    managerCookie = await getAuthCookie(app, 'manager@test.com', 'password123')
  })

  describe('GET /api/roles', () => {
    it('restituisce 200 per super_admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/roles',
        headers: { cookie: superAdminCookie }
      })
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(Array.isArray(body.data)).toBe(true)
    })

    it('restituisce 403 per manager', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/roles',
        headers: { cookie: managerCookie }
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('POST /api/roles', () => {
    it('crea un ruolo custom (201)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/roles',
        headers: { cookie: superAdminCookie },
        payload: { name: 'ruolo_test', label: 'Ruolo Test' }
      })
      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.name).toBe('ruolo_test')
      expect(body.isSystem).toBe(false)
    })

    it('restituisce 400 per nome con caratteri non validi', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/roles',
        headers: { cookie: superAdminCookie },
        payload: { name: 'Ruolo Invalido!', label: 'Test' }
      })
      expect(res.statusCode).toBe(400)
    })

    it('restituisce 409 per nome duplicato', async () => {
      // super_admin esiste già dal seed
      const res = await app.inject({
        method: 'POST',
        url: '/api/roles',
        headers: { cookie: superAdminCookie },
        payload: { name: 'super_admin', label: 'Duplicato' }
      })
      expect(res.statusCode).toBe(409)
    })
  })

  describe('DELETE /api/roles/:id', () => {
    it('restituisce 409 se il ruolo è di sistema', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/roles',
        headers: { cookie: superAdminCookie }
      })
      const { data } = JSON.parse(listRes.body)
      const systemRole = data.find((r: { isSystem: boolean }) => r.isSystem)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/roles/${systemRole.id}`,
        headers: { cookie: superAdminCookie }
      })
      expect(res.statusCode).toBe(409)
    })

    it('elimina un ruolo custom (204)', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/api/roles',
        headers: { cookie: superAdminCookie },
        payload: { name: 'ruolo_da_eliminare', label: 'Da eliminare' }
      })
      const { id } = JSON.parse(create.body)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/roles/${id}`,
        headers: { cookie: superAdminCookie }
      })
      expect(res.statusCode).toBe(204)
    })
  })
})

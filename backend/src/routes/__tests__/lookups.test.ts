import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb } from '../../test-helper'

describe('Lookups API', () => {
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
    await app.prisma.coffinMeasure.deleteMany()
    await app.prisma.coffinCategory.deleteMany()
    await app.prisma.coffinSubcategory.deleteMany()
    await app.prisma.essence.deleteMany()
    await app.prisma.figure.deleteMany()
    await app.prisma.color.deleteMany()
    await app.prisma.finish.deleteMany()
    await app.prisma.accessoryCategory.deleteMany()
    await app.prisma.accessorySubcategory.deleteMany()
    await app.prisma.marmistaCategory.deleteMany()
    await cleanupTestDb(app)

    await seedTestUser(app, { email: 'manager@test.com', password: 'password123', roles: ['manager'] })
    await seedTestUser(app, { email: 'collab@test.com', password: 'password123', roles: ['collaboratore'] })

    managerCookie = await getAuthCookie(app, 'manager@test.com', 'password123')
    collaboratoreCookie = await getAuthCookie(app, 'collab@test.com', 'password123')
  })

  describe('GET /api/admin/lookups/:type', () => {
    it('restituisce lista vuota per manager autenticato', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/lookups/coffin-categories',
        headers: { cookie: managerCookie },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ data: [], pagination: expect.any(Object) })
    })

    it('rifiuta ruolo non autorizzato', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/lookups/coffin-categories',
        headers: { cookie: collaboratoreCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it('restituisce 404 per tipo lookup non valido', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/lookups/tipo-inesistente',
        headers: { cookie: managerCookie },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('POST /api/admin/lookups/:type', () => {
    it('crea un nuovo elemento lookup', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/lookups/coffin-categories',
        headers: { cookie: managerCookie },
        payload: { code: 'CAT1', label: 'Categoria 1' },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({ code: 'CAT1', label: 'Categoria 1' })
    })

    it('lo ritrova in lista dopo creazione', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/admin/lookups/essences',
        headers: { cookie: managerCookie },
        payload: { code: 'NOCE', label: 'Noce' },
      })
      const list = await app.inject({
        method: 'GET',
        url: '/api/admin/lookups/essences',
        headers: { cookie: managerCookie },
      })
      expect(list.json().data).toHaveLength(1)
      expect(list.json().data[0]).toMatchObject({ code: 'NOCE' })
    })
  })

  describe('PUT /api/admin/lookups/:type/:id', () => {
    it('aggiorna un elemento esistente', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/admin/lookups/colors',
        headers: { cookie: managerCookie },
        payload: { code: 'BLU', label: 'Azzurro' },
      })
      const id = created.json().id

      const updated = await app.inject({
        method: 'PUT',
        url: `/api/admin/lookups/colors/${id}`,
        headers: { cookie: managerCookie },
        payload: { code: 'BLU', label: 'Blu' },
      })
      expect(updated.statusCode).toBe(200)
      expect(updated.json()).toMatchObject({ label: 'Blu' })
    })
  })

  describe('DELETE /api/admin/lookups/:type/:id', () => {
    it('elimina un elemento esistente', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/admin/lookups/figures',
        headers: { cookie: managerCookie },
        payload: { code: 'ANG', label: 'Angelo' },
      })
      const id = created.json().id

      const del = await app.inject({
        method: 'DELETE',
        url: `/api/admin/lookups/figures/${id}`,
        headers: { cookie: managerCookie },
      })
      expect(del.statusCode).toBe(204)

      const list = await app.inject({
        method: 'GET',
        url: '/api/admin/lookups/figures',
        headers: { cookie: managerCookie },
      })
      expect(list.json().data).toHaveLength(0)
    })
  })

  describe('CRUD /api/admin/lookups/coffin-measures', () => {
    it('crea, aggiorna ed elimina una misura', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/admin/lookups/coffin-measures',
        headers: { cookie: managerCookie },
        payload: {
          code: 'MIS-01',
          label: 'Standard',
          head: 52,
          feet: 28,
          shoulder: 58,
          height: 42,
          width: 74,
          depth: 38,
        },
      })
      expect(created.statusCode).toBe(201)
      expect(created.json()).toMatchObject({ code: 'MIS-01', label: 'Standard' })
      const id = created.json().id

      const updated = await app.inject({
        method: 'PUT',
        url: `/api/admin/lookups/coffin-measures/${id}`,
        headers: { cookie: managerCookie },
        payload: {
          code: 'MIS-01',
          label: 'Standard XL',
          head: 53,
          feet: 29,
          shoulder: 59,
          height: 43,
          width: 75,
          depth: 39,
        },
      })
      expect(updated.statusCode).toBe(200)
      expect(updated.json()).toMatchObject({ label: 'Standard XL', width: 75 })

      const list = await app.inject({
        method: 'GET',
        url: '/api/admin/lookups/coffin-measures',
        headers: { cookie: managerCookie },
      })
      expect(list.statusCode).toBe(200)
      expect(list.json().data).toHaveLength(1)

      const del = await app.inject({
        method: 'DELETE',
        url: `/api/admin/lookups/coffin-measures/${id}`,
        headers: { cookie: managerCookie },
      })
      expect(del.statusCode).toBe(204)
    })
  })
})

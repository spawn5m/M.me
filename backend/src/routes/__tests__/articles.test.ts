import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb } from '../../test-helper'

describe('Articles API', () => {
  let app: FastifyInstance
  let managerCookie: string

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(async () => {
    await app.prisma.coffinArticle.deleteMany()
    await app.prisma.accessoryArticle.deleteMany()
    await app.prisma.marmistaArticle.deleteMany()
    await app.prisma.coffinCategory.deleteMany()
    await app.prisma.accessoryCategory.deleteMany()
    await app.prisma.marmistaCategory.deleteMany()
    await cleanupTestDb(app)

    await seedTestUser(app, { email: 'manager@test.com', password: 'password123', roles: ['manager'] })
    managerCookie = await getAuthCookie(app, 'manager@test.com', 'password123')
  })

  describe('Cofani', () => {
    it('crea cofano e lo ritrova in lista', async () => {
      const cat = await app.prisma.coffinCategory.create({ data: { code: 'C1', label: 'Cat 1' } })

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/articles/coffins',
        headers: { cookie: managerCookie },
        payload: { code: 'COF001', description: 'Bara test', categoryIds: [cat.id] },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({ code: 'COF001', description: 'Bara test' })
      expect(res.json().categories).toHaveLength(1)

      const list = await app.inject({
        method: 'GET',
        url: '/api/admin/articles/coffins',
        headers: { cookie: managerCookie },
      })
      expect(list.json().data).toHaveLength(1)
    })

    it('aggiorna un cofano', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/admin/articles/coffins',
        headers: { cookie: managerCookie },
        payload: { code: 'COF002', description: 'Bara originale' },
      })
      const id = created.json().id

      const updated = await app.inject({
        method: 'PUT',
        url: `/api/admin/articles/coffins/${id}`,
        headers: { cookie: managerCookie },
        payload: { code: 'COF002', description: 'Bara aggiornata' },
      })
      expect(updated.statusCode).toBe(200)
      expect(updated.json()).toMatchObject({ description: 'Bara aggiornata' })
    })

    it('elimina un cofano', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/admin/articles/coffins',
        headers: { cookie: managerCookie },
        payload: { code: 'COF003', description: 'Da eliminare' },
      })
      const id = created.json().id

      const del = await app.inject({
        method: 'DELETE',
        url: `/api/admin/articles/coffins/${id}`,
        headers: { cookie: managerCookie },
      })
      expect(del.statusCode).toBe(204)
    })
  })

  describe('Accessori', () => {
    it('crea accessorio e lo ritrova in lista', async () => {
      const cat = await app.prisma.accessoryCategory.create({ data: { code: 'AC1', label: 'Accessorio Cat 1' } })

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/articles/accessories',
        headers: { cookie: managerCookie },
        payload: { code: 'ACC001', description: 'Accessorio test', categoryIds: [cat.id] },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({ code: 'ACC001' })

      const list = await app.inject({
        method: 'GET',
        url: '/api/admin/articles/accessories',
        headers: { cookie: managerCookie },
      })
      expect(list.json().data).toHaveLength(1)
    })
  })

  describe('Articoli Marmisti', () => {
    it('crea articolo marmista e lo ritrova in lista', async () => {
      const cat = await app.prisma.marmistaCategory.create({ data: { code: 'MC1', label: 'Marmista Cat 1' } })

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/articles/marmista',
        headers: { cookie: managerCookie },
        payload: { code: 'MAR001', description: 'Lapide test', publicPrice: 250.0, categoryIds: [cat.id] },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({ code: 'MAR001', publicPrice: 250.0 })

      const list = await app.inject({
        method: 'GET',
        url: '/api/admin/articles/marmista',
        headers: { cookie: managerCookie },
      })
      expect(list.json().data).toHaveLength(1)
    })
  })
})

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb } from '../../test-helper'
import { SYSTEM_PERMISSIONS, type PermissionCode } from '../../lib/authorization/permissions'
import * as XLSX from 'xlsx'

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

function createExcelBuffer(rows: Record<string, string | number>[]): Buffer {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, sheet, 'Import')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

function createMultipartPayload(fileName: string, fileBuffer: Buffer) {
  const boundary = `----mirigliani-${Date.now()}`
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])

  return {
    body,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': String(body.length),
    },
  }
}

describe('Articles API', () => {
  let app: FastifyInstance
  let managerCookie: string
  let impresarioCookie: string

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
    await app.prisma.coffinSubcategory.deleteMany()
    await app.prisma.coffinCategory.deleteMany()
    await app.prisma.essence.deleteMany()
    await app.prisma.figure.deleteMany()
    await app.prisma.color.deleteMany()
    await app.prisma.finish.deleteMany()
    await app.prisma.accessorySubcategory.deleteMany()
    await app.prisma.accessoryCategory.deleteMany()
    await app.prisma.marmistaCategory.deleteMany()
    await cleanupTestDb(app)

    await seedTestUser(app, { email: 'manager@test.com', password: 'password123', roles: ['manager'] })
    await seedTestUser(app, { email: 'imp@test.com', password: 'password123', roles: ['impresario_funebre'] })

    await grantRolePermissions(app, 'manager', [
      'articles.coffins.read',
      'articles.coffins.write',
      'articles.coffins.delete',
      'articles.accessories.read',
      'articles.accessories.write',
      'articles.accessories.import',
      'articles.marmista.read',
      'articles.marmista.write',
      'articles.marmista.import',
    ])

    managerCookie = await getAuthCookie(app, 'manager@test.com', 'password123')
    impresarioCookie = await getAuthCookie(app, 'imp@test.com', 'password123')
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

    it('nega la creazione di un cofano a chi non ha articles.coffins.write', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/articles/coffins',
        headers: { cookie: impresarioCookie },
        payload: { code: 'COF403', description: 'Bara negata' },
      })

      expect(res.statusCode).toBe(403)
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

    it('importa accessori da file Excel', async () => {
      await app.prisma.accessoryCategory.create({ data: { code: 'AC1', label: 'Accessorio Cat 1' } })
      await app.prisma.accessorySubcategory.create({ data: { code: 'AS1', label: 'Accessorio Sub 1' } })

      const payload = createMultipartPayload('accessori.xlsx', createExcelBuffer([
        {
          codice: 'ACC100',
          descrizione: 'Accessorio importato',
          note: 'Note import',
          categorie: 'AC1',
          sottocategorie: 'AS1',
          pagina_pdf: 42,
        },
      ]))

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/articles/accessories/import',
        headers: { cookie: managerCookie, ...payload.headers },
        payload: payload.body,
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ imported: 1, skipped: 0 })

      const article = await app.prisma.accessoryArticle.findUnique({ where: { code: 'ACC100' }, include: { categories: true, subcategories: true } })
      expect(article).toMatchObject({ description: 'Accessorio importato', pdfPage: 42 })
      expect(article?.categories).toHaveLength(1)
      expect(article?.subcategories).toHaveLength(1)
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

    it('importa articoli marmisti da file Excel', async () => {
      await app.prisma.marmistaCategory.create({ data: { code: 'MC1', label: 'Marmista Cat 1' } })
      await app.prisma.marmistaArticle.create({ data: { code: 'ACC-REF', description: 'Accessorio collegato' } })

      const payload = createMultipartPayload('marmisti.xlsx', createExcelBuffer([
        {
          codice: 'MAR100',
          descrizione: 'Marmista importato',
          note: 'Note import',
          categorie: 'MC1',
          prezzo_pubblico: 250,
          pagina_pdf: 15,
          accessorio_id: 'ACC-REF',
        },
      ]))

      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/articles/marmista/import',
        headers: { cookie: managerCookie, ...payload.headers },
        payload: payload.body,
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ imported: 1, skipped: 0 })

      const article = await app.prisma.marmistaArticle.findUnique({ where: { code: 'MAR100' }, include: { categories: true, accessory: true } })
      expect(article).toMatchObject({ description: 'Marmista importato', publicPrice: 250, pdfPage: 15 })
      expect(article?.categories).toHaveLength(1)
      expect(article?.accessory?.code).toBe('ACC-REF')
    })
  })
})

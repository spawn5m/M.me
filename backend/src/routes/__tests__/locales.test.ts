import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { FastifyInstance } from 'fastify'
import { buildTestApp, cleanupTestDb, getAuthCookie, seedTestUser } from '../../test-helper'
import { SYSTEM_PERMISSIONS, type PermissionCode } from '../../lib/authorization/permissions'

const SAMPLE_LOCALE = { nav: { home: 'Home' }, auth: { login: 'Accedi' } }

let tmpFile: string

function setLocalesPath() {
  tmpFile = path.join(os.tmpdir(), `locales-test-${Date.now()}.json`)
  fs.writeFileSync(tmpFile, JSON.stringify(SAMPLE_LOCALE))
  process.env.LOCALES_PATH = tmpFile
}

function cleanLocalesPath() {
  delete process.env.LOCALES_PATH
  if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
}

interface AuthorizationPrismaClient {
  permission: {
    upsert(args: {
      where: { code: string }
      update: object
      create: object
    }): Promise<{ id: string; code: string }>
  }
  rolePermission: {
    create(args: { data: { roleId: string; permissionId: string } }): Promise<unknown>
  }
}

async function ensurePermission(app: FastifyInstance, code: PermissionCode) {
  const definition = SYSTEM_PERMISSIONS.find((p) => p.code === code)
  if (!definition) throw new Error(`Permission ${code} non trovata`)
  const prisma = app.prisma as unknown as AuthorizationPrismaClient
  return prisma.permission.upsert({ where: { code }, update: definition, create: definition })
}

async function grantPermission(app: FastifyInstance, roleName: string, code: PermissionCode) {
  const role = await app.prisma.role.findUnique({ where: { name: roleName } })
  if (!role) throw new Error(`Ruolo ${roleName} non trovato`)
  const permission = await ensurePermission(app, code)
  const prisma = app.prisma as unknown as AuthorizationPrismaClient
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } })
}

describe('Locales routes', () => {
  let app: FastifyInstance
  let superAdminCookie: string

  beforeAll(async () => {
    setLocalesPath()
    app = await buildTestApp()
    await seedTestUser(app, {
      email: 'locales-superadmin@test.com',
      password: 'password123',
      roles: ['super_admin'],
    })
    await grantPermission(app, 'super_admin', 'locales.manage')
    superAdminCookie = await getAuthCookie(app, 'locales-superadmin@test.com', 'password123')
  })

  afterAll(async () => {
    cleanLocalesPath()
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(() => {
    fs.writeFileSync(tmpFile, JSON.stringify(SAMPLE_LOCALE))
  })

  it('GET /api/public/locales/it → 200 con il JSON del file', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/locales/it' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as unknown
    expect(body).toEqual(SAMPLE_LOCALE)
  })

  it('GET /api/public/locales/it → Cache-Control: no-store', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/locales/it' })
    expect(res.headers['cache-control']).toBe('no-store')
  })

  it('PUT /api/admin/locales senza auth → 401', async () => {
    const res = await app.inject({ method: 'PUT', url: '/api/admin/locales', payload: SAMPLE_LOCALE })
    expect(res.statusCode).toBe(401)
  })

  it('PUT /api/admin/locales con body non oggetto → 400', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/locales',
      headers: { cookie: superAdminCookie },
      payload: [1, 2, 3],
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT /api/admin/locales con chiavi mancanti → 400', async () => {
    const incompleto = { nav: { home: 'Home' } } // manca auth
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/locales',
      headers: { cookie: superAdminCookie },
      payload: incompleto,
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT /api/admin/locales con payload valido → 200 e file aggiornato', async () => {
    const updated = { nav: { home: 'Home IT' }, auth: { login: 'Entra' } }
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/locales',
      headers: { cookie: superAdminCookie },
      payload: updated,
    })
    expect(res.statusCode).toBe(200)
    const saved = JSON.parse(fs.readFileSync(tmpFile, 'utf-8')) as unknown
    expect(saved).toEqual(updated)
  })
})

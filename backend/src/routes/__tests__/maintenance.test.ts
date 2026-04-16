import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { FastifyInstance } from 'fastify'
import { buildTestApp, cleanupTestDb, getAuthCookie, seedTestUser } from '../../test-helper'
import { SYSTEM_PERMISSIONS, type PermissionCode } from '../../lib/authorization/permissions'

const SAMPLE_LOCALE = {
  nav: { home: 'Home' },
  auth: { login: 'Accedi' },
  maintenance: {
    home: 'Home maintenance',
    homeH2: 'Home maintenance H2',
    ourStory: 'Story maintenance',
    whereWeAre: 'Where maintenance',
    funeralHomes: 'Funeral maintenance',
    marmistas: 'Marmistas maintenance',
  },
}

const SAMPLE_MAINTENANCE = {
  pages: {
    home: { enabled: false },
    ourStory: { enabled: false },
    whereWeAre: { enabled: false },
    funeralHomes: { enabled: false },
    marmistas: { enabled: false },
  },
}

let tmpLocalesFile: string
let tmpMaintenanceFile: string

function setFileOverrides() {
  tmpLocalesFile = path.join(os.tmpdir(), `locales-test-${Date.now()}.json`)
  tmpMaintenanceFile = path.join(os.tmpdir(), `maintenance-test-${Date.now()}.json`)
  fs.writeFileSync(tmpLocalesFile, JSON.stringify(SAMPLE_LOCALE))
  fs.writeFileSync(tmpMaintenanceFile, JSON.stringify(SAMPLE_MAINTENANCE))
  process.env.LOCALES_PATH = tmpLocalesFile
  process.env.MAINTENANCE_PATH = tmpMaintenanceFile
}

function cleanFileOverrides() {
  delete process.env.LOCALES_PATH
  delete process.env.MAINTENANCE_PATH
  if (tmpLocalesFile && fs.existsSync(tmpLocalesFile)) fs.unlinkSync(tmpLocalesFile)
  if (tmpMaintenanceFile && fs.existsSync(tmpMaintenanceFile)) fs.unlinkSync(tmpMaintenanceFile)
}

interface AuthorizationPrismaClient {
  permission: {
    upsert(args: { where: { code: string }; update: object; create: object }): Promise<{ id: string; code: string }>
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

describe('Maintenance routes', () => {
  let app: FastifyInstance
  let superAdminCookie: string
  let collaboratorCookie: string

  beforeAll(async () => {
    setFileOverrides()
    app = await buildTestApp()
    await seedTestUser(app, {
      email: 'maintenance-superadmin@test.com',
      password: 'password123',
      roles: ['super_admin'],
    })
    await seedTestUser(app, {
      email: 'maintenance-collab@test.com',
      password: 'password123',
      roles: ['collaboratore'],
    })
    await grantPermission(app, 'super_admin', 'maintenance.manage')
    superAdminCookie = await getAuthCookie(app, 'maintenance-superadmin@test.com', 'password123')
    collaboratorCookie = await getAuthCookie(app, 'maintenance-collab@test.com', 'password123')
  })

  afterAll(async () => {
    cleanFileOverrides()
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(() => {
    fs.writeFileSync(tmpLocalesFile, JSON.stringify(SAMPLE_LOCALE))
    fs.writeFileSync(tmpMaintenanceFile, JSON.stringify(SAMPLE_MAINTENANCE))
  })

  it('GET /api/public/maintenance restituisce lo stato', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/maintenance' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual(SAMPLE_MAINTENANCE)
  })

  it('GET /api/public/maintenance imposta no-store', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/maintenance' })
    expect(res.headers['cache-control']).toBe('no-store')
  })

  it('GET /api/admin/maintenance senza auth → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/maintenance' })
    expect(res.statusCode).toBe(401)
  })

  it('PUT /api/admin/maintenance senza permesso → 403', async () => {
    const res = await app.inject({ method: 'PUT', url: '/api/admin/maintenance', headers: { cookie: collaboratorCookie }, payload: SAMPLE_MAINTENANCE })
    expect(res.statusCode).toBe(403)
  })

  it('PUT /api/admin/maintenance salva stato e messaggi', async () => {
    const payload = {
      pages: {
        home: { enabled: true, message: 'Home in manutenzione', homeH2: 'Home H2 in manutenzione' },
        ourStory: { enabled: false, message: 'Storia in manutenzione' },
        whereWeAre: { enabled: true, message: 'Dove siamo in manutenzione' },
        funeralHomes: { enabled: false, message: 'Imprese in manutenzione' },
        marmistas: { enabled: false, message: 'Marmisti in manutenzione' },
      },
    }

    const res = await app.inject({ method: 'PUT', url: '/api/admin/maintenance', headers: { cookie: superAdminCookie }, payload })
    expect(res.statusCode).toBe(200)

    const savedMaintenance = JSON.parse(fs.readFileSync(tmpMaintenanceFile, 'utf-8')) as unknown
    expect(savedMaintenance).toEqual({
      pages: {
        home: { enabled: true },
        ourStory: { enabled: false },
        whereWeAre: { enabled: true },
        funeralHomes: { enabled: false },
        marmistas: { enabled: false },
      },
    })

    const savedLocales = JSON.parse(fs.readFileSync(tmpLocalesFile, 'utf-8')) as { maintenance?: Record<string, string> }
    expect(savedLocales.maintenance?.home).toBe('Home in manutenzione')
    expect(savedLocales.maintenance?.homeH2).toBe('Home H2 in manutenzione')
    expect(savedLocales.maintenance?.whereWeAre).toBe('Dove siamo in manutenzione')
  })

  it('GET /api/admin/maintenance include homeH2 per la home', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/maintenance', headers: { cookie: superAdminCookie } })
    expect(res.statusCode).toBe(200)

    const body = res.json() as { pages: { home: { homeH2?: string } } }
    expect(body.pages.home.homeH2).toBe('Home maintenance H2')
  })

  it('PUT /api/admin/maintenance con body invalido → 400', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/maintenance',
      headers: { cookie: superAdminCookie },
      payload: { pages: { home: { enabled: true } } },
    })
    expect(res.statusCode).toBe(400)
  })
})

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { FastifyInstance } from 'fastify'
import { buildTestApp, cleanupTestDb, getAuthCookie, seedTestUser } from '../../test-helper'

const SAMPLE_MAPS = {
  offices: {
    villamar: { lat: 39.6189, lng: 9.0003 },
    sassari: { lat: 40.7259, lng: 8.5558 },
  },
}

let tmpMapsFile: string

interface AuthorizationPrismaClient {
  permission: {
    upsert(args: { where: { code: string }; update: object; create: object }): Promise<{ id: string; code: string }>
  }
  rolePermission: {
    create(args: { data: { roleId: string; permissionId: string } }): Promise<unknown>
  }
}

async function grantPermission(app: FastifyInstance, roleName: string, code: string) {
  const role = await app.prisma.role.findUnique({ where: { name: roleName } })
  if (!role) throw new Error(`Ruolo ${roleName} non trovato`)

  const prisma = app.prisma as unknown as AuthorizationPrismaClient
  const permission = await prisma.permission.upsert({
    where: { code },
    update: {
      resource: 'maps',
      action: 'manage',
      scope: null,
      label: 'Gestisci Mappe',
      description: 'Gestire le coordinate delle sedi e i link mappa pubblici.',
      isSystem: true,
    },
    create: {
      code,
      resource: 'maps',
      action: 'manage',
      scope: null,
      label: 'Gestisci Mappe',
      description: 'Gestire le coordinate delle sedi e i link mappa pubblici.',
      isSystem: true,
    },
  })

  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } })
}

describe('Maps routes', () => {
  let app: FastifyInstance
  let superAdminCookie: string
  let collaboratorCookie: string

  beforeAll(async () => {
    tmpMapsFile = path.join(os.tmpdir(), `maps-test-${Date.now()}.json`)
    fs.writeFileSync(tmpMapsFile, JSON.stringify(SAMPLE_MAPS))
    process.env.MAPS_PATH = tmpMapsFile

    app = await buildTestApp()
    await seedTestUser(app, {
      email: 'maps-superadmin@test.com',
      password: 'password123',
      roles: ['super_admin'],
    })
    await seedTestUser(app, {
      email: 'maps-collab@test.com',
      password: 'password123',
      roles: ['collaboratore'],
    })

    await grantPermission(app, 'super_admin', 'maps.manage')
    superAdminCookie = await getAuthCookie(app, 'maps-superadmin@test.com', 'password123')
    collaboratorCookie = await getAuthCookie(app, 'maps-collab@test.com', 'password123')
  })

  afterAll(async () => {
    delete process.env.MAPS_PATH
    if (tmpMapsFile && fs.existsSync(tmpMapsFile)) fs.unlinkSync(tmpMapsFile)
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(() => {
    fs.writeFileSync(tmpMapsFile, JSON.stringify(SAMPLE_MAPS))
  })

  it('GET /api/public/maps restituisce le coordinate correnti', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/maps' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual(SAMPLE_MAPS)
  })

  it('GET /api/public/maps imposta no-store', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/maps' })
    expect(res.headers['cache-control']).toBe('no-store')
  })

  it('GET /api/admin/maps senza auth restituisce 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/maps' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/admin/maps senza permesso restituisce 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/maps', headers: { cookie: collaboratorCookie } })
    expect(res.statusCode).toBe(403)
  })

  it('PUT /api/admin/maps salva le nuove coordinate', async () => {
    const payload = {
      offices: {
        villamar: { lat: 39.7, lng: 9.1 },
        sassari: { lat: 40.8, lng: 8.6 },
      },
    }

    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/maps',
      headers: { cookie: superAdminCookie },
      payload,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    expect(JSON.parse(fs.readFileSync(tmpMapsFile, 'utf-8'))).toEqual(payload)
  })

  it('PUT /api/admin/maps rifiuta coordinate fuori range', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/maps',
      headers: { cookie: superAdminCookie },
      payload: {
        offices: {
          villamar: { lat: 95, lng: 9.1 },
          sassari: { lat: 40.8, lng: 8.6 },
        },
      },
    })

    expect(res.statusCode).toBe(400)
  })
})

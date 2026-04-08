import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { FastifyInstance } from 'fastify'

import { buildTestApp, cleanupTestDb, getAuthCookie, seedTestUser } from '../../test-helper'

interface AuthorizationPermissionRecord {
  id: string
  code: string
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
  userPermission: {
    create(args: {
      data: {
        userId: string
        permissionId: string
      }
    }): Promise<unknown>
  }
}

function getAuthorizationPrisma(app: FastifyInstance): AuthorizationPrismaClient {
  return app.prisma as unknown as AuthorizationPrismaClient
}

async function ensurePermission(
  app: FastifyInstance,
  code: string,
  resource: string,
  action: string,
  scope: string | null,
): Promise<AuthorizationPermissionRecord> {
  return getAuthorizationPrisma(app).permission.upsert({
    where: { code },
    update: { resource, action, scope, label: code, description: code, isSystem: true },
    create: {
      code,
      resource,
      action,
      scope,
      label: code,
      description: code,
      isSystem: true,
    },
  })
}

describe('Auth API', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(async () => {
    await cleanupTestDb(app)
  })

  it('POST /api/auth/login returns roles and permissions', async () => {
    await seedTestUser(app, {
      email: 'manager-auth@test.com',
      password: 'password123',
      roles: ['manager'],
    })

    const managerRole = await app.prisma.role.findUnique({ where: { name: 'manager' } })
    expect(managerRole).not.toBeNull()

    const usersReadTeam = await ensurePermission(app, 'users.read.team', 'users', 'read', 'team')

    await getAuthorizationPrisma(app).rolePermission.create({
      data: {
        roleId: managerRole!.id,
        permissionId: usersReadTeam.id,
      },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'manager-auth@test.com',
        password: 'password123',
      },
    })

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body) as {
      user: { roles: string[] }
      permissions?: string[]
    }

    expect(body.user.roles).toEqual(['manager'])
    expect(body.permissions).toEqual(['users.read.team'])
  })

  it('GET /api/auth/me recalculates permissions on each request when a direct user permission is added after login', async () => {
    const user = await seedTestUser(app, {
      email: 'manager-me@test.com',
      password: 'password123',
      roles: ['manager'],
    })

    const managerRole = await app.prisma.role.findUnique({ where: { name: 'manager' } })
    expect(managerRole).not.toBeNull()

    const usersReadTeam = await ensurePermission(app, 'users.read.team', 'users', 'read', 'team')

    await getAuthorizationPrisma(app).rolePermission.create({
      data: {
        roleId: managerRole!.id,
        permissionId: usersReadTeam.id,
      },
    })

    const cookie = await getAuthCookie(app, 'manager-me@test.com', 'password123')

    const rolesManage = await ensurePermission(app, 'roles.manage', 'roles', 'manage', null)

    await getAuthorizationPrisma(app).userPermission.create({
      data: {
        userId: user.id,
        permissionId: rolesManage.id,
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        cookie,
      },
    })

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body) as {
      user: { roles: string[] }
      permissions?: string[]
    }

    expect(body.user.roles).toEqual(['manager'])
    expect(body.permissions).toEqual(['roles.manage', 'users.read.team'])
  })

  it('GET /api/auth/me rejects an existing session when the user is later disabled', async () => {
    const user = await seedTestUser(app, {
      email: 'disabled-session@test.com',
      password: 'password123',
      roles: ['manager'],
    })

    const cookie = await getAuthCookie(app, 'disabled-session@test.com', 'password123')

    await app.prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        cookie,
      },
    })

    expect(response.statusCode).toBe(401)
    expect(JSON.parse(response.body)).toMatchObject({
      error: 'Unauthorized',
      statusCode: 401,
    })
  })
})

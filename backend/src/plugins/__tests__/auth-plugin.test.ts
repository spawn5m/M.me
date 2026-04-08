import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import fastifySecureSession from '@fastify/secure-session'

import prismaPlugin from '../prisma'
import errorHandlerPlugin from '../errorHandler'
import authPlugin from '../auth'
import authRoutes from '../../routes/auth'
import { cleanupTestDb, getAuthCookie, seedTestUser } from '../../test-helper'

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

describe('auth plugin permission guards', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = Fastify({ logger: false })

    await app.register(fastifySecureSession, {
      secret: process.env.SESSION_SECRET!,
      salt: process.env.SESSION_SALT!,
      cookie: {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
      }
    })

    await app.register(prismaPlugin)
    await app.register(errorHandlerPlugin)
    await app.register(authPlugin)
    await app.register(authRoutes, { prefix: '/api/auth' })

    app.get('/guarded-by-permission', {
      preHandler: [app.authenticate, app.checkPermission('roles.read')],
    }, async (_request, reply) => {
      return reply.send({ ok: true })
    })

    await app.ready()
  })

  afterAll(async () => {
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(async () => {
    await cleanupTestDb(app)
  })

  it('loads auth context inside checkPermission when the route has no explicit loadAuthorizationContext hook', async () => {
    const user = await seedTestUser(app, {
      email: 'guard@test.com',
      password: 'password123',
      roles: ['manager'],
    })

    const rolesRead = await ensurePermission(app, 'roles.read', 'roles', 'read', null)

    await getAuthorizationPrisma(app).userPermission.create({
      data: {
        userId: user.id,
        permissionId: rolesRead.id,
      },
    })

    const cookie = await getAuthCookie(app, 'guard@test.com', 'password123')
    const response = await app.inject({
      method: 'GET',
      url: '/guarded-by-permission',
      headers: {
        cookie,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ ok: true })
  })
})

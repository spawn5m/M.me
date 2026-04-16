import Fastify, { FastifyInstance } from 'fastify'
import fastifySecureSession from '@fastify/secure-session'
import multipart from '@fastify/multipart'
import bcrypt from 'bcrypt'

import prismaPlugin from './plugins/prisma'
import errorHandlerPlugin from './plugins/errorHandler'
import authPlugin from './plugins/auth'

import authRoutes from './routes/auth'
import publicRoutes from './routes/public'
import usersRoutes from './routes/users'
import rolesRoutes from './routes/roles'
import adminRoutes from './routes/admin'
import lookupsRoutes from './routes/lookups'
import coffinsRoutes from './routes/articles/coffins'
import accessoriesRoutes from './routes/articles/accessories'
import marmistaRoutes from './routes/articles/marmista'
import pricelistsRoutes from './routes/pricelists'
import catalogRoutes from './routes/catalog'
import { mapsPublicRoutes, mapsAdminRoutes } from './routes/maps'
import clientRoutes from './routes/client'
import permissionsRoutes from './routes/permissions'
import { localesPublicRoutes, localesAdminRoutes } from './routes/locales'
import brandingAdminRoutes from './routes/branding'
import { maintenancePublicRoutes, maintenanceAdminRoutes } from './routes/maintenance'
import { MULTIPART_OPTIONS } from './lib/multipart'

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  await app.register(fastifySecureSession, {
    secret: process.env.SESSION_SECRET!,
    salt: process.env.SESSION_SALT!,
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: false
    }
  })

  await app.register(multipart, MULTIPART_OPTIONS)
  await app.register(prismaPlugin)
  await app.register(errorHandlerPlugin)
  await app.register(authPlugin)

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(publicRoutes, { prefix: '/api/public' })
  await app.register(localesPublicRoutes, { prefix: '/api/public/locales' })
  await app.register(usersRoutes, { prefix: '/api/users' })
  await app.register(rolesRoutes, { prefix: '/api/roles' })
  await app.register(permissionsRoutes, { prefix: '/api/permissions' })
  await app.register(adminRoutes, { prefix: '/api/admin' })
  await app.register(lookupsRoutes, { prefix: '/api/admin/lookups' })
  await app.register(coffinsRoutes, { prefix: '/api/admin/articles/coffins' })
  await app.register(accessoriesRoutes, { prefix: '/api/admin/articles/accessories' })
  await app.register(marmistaRoutes, { prefix: '/api/admin/articles/marmista' })
  await app.register(pricelistsRoutes, { prefix: '/api/admin/pricelists' })
  await app.register(catalogRoutes, { prefix: '/api/admin/catalog' })
  await app.register(brandingAdminRoutes, { prefix: '/api/admin/branding' })
  await app.register(mapsPublicRoutes, { prefix: '/api/public/maps' })
  await app.register(mapsAdminRoutes, { prefix: '/api/admin/maps' })
  await app.register(localesAdminRoutes, { prefix: '/api/admin/locales' })
  await app.register(maintenancePublicRoutes, { prefix: '/api/public/maintenance' })
  await app.register(maintenanceAdminRoutes, { prefix: '/api/admin/maintenance' })
  await app.register(clientRoutes, { prefix: '/api/client' })

  await app.ready()
  return app
}

interface SeedUserParams {
  email: string
  password: string
  firstName?: string
  lastName?: string
  roles?: string[]
  managerId?: string
}

export async function seedTestUser(
  app: FastifyInstance,
  params: SeedUserParams
): Promise<{ id: string; email: string }> {
  const {
    email,
    password,
    firstName = 'Test',
    lastName = 'User',
    roles = [],
    managerId
  } = params

  const hashed = await bcrypt.hash(password, 12)

  const user = await app.prisma.user.create({
    data: {
      email,
      password: hashed,
      firstName,
      lastName,
      ...(managerId
        ? { managers: { create: { managerId } } }
        : {})
    }
  })

  for (const roleName of roles) {
    let role = await app.prisma.role.findUnique({ where: { name: roleName } })
    if (!role) {
      role = await app.prisma.role.create({
        data: { name: roleName, label: roleName, isSystem: true }
      })
    }
    await app.prisma.userRole.create({
      data: { userId: user.id, roleId: role.id }
    })
  }

  return { id: user.id, email: user.email }
}

export async function getAuthCookie(
  app: FastifyInstance,
  email: string,
  password: string
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password }
  })

  if (response.statusCode !== 200) {
    throw new Error(`Login fallito: ${response.statusCode} ${response.body}`)
  }

  const setCookie = response.headers['set-cookie']
  if (!setCookie) throw new Error('Nessun cookie di sessione ricevuto')
  return Array.isArray(setCookie) ? setCookie[0] : setCookie
}

export async function cleanupTestDb(app: FastifyInstance): Promise<void> {
  await app.prisma.userPermission.deleteMany()
  await app.prisma.userRole.deleteMany()
  await app.prisma.userManager.deleteMany()
  await app.prisma.rolePermission.deleteMany()
  await app.prisma.user.deleteMany()
  await app.prisma.role.deleteMany()
  await app.prisma.permission.deleteMany()
}

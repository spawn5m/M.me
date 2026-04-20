import 'dotenv/config'
import Fastify from 'fastify'
import fastifySecureSession from '@fastify/secure-session'
import fastifyRateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { UPLOADS_ROOT } from './lib/paths'

import prismaPlugin from './plugins/prisma'
import errorHandlerPlugin from './plugins/errorHandler'
import authPlugin from './plugins/auth'

import authRoutes from './routes/auth'
import publicRoutes from './routes/public'
import usersRoutes from './routes/users'
import rolesRoutes from './routes/roles'
import lookupsRoutes from './routes/lookups'
import coffinsRoutes from './routes/articles/coffins'
import accessoriesRoutes from './routes/articles/accessories'
import marmistaRoutes from './routes/articles/marmista'
import pricelistsRoutes from './routes/pricelists'
import catalogRoutes from './routes/catalog'
import clientRoutes from './routes/client'
import permissionsRoutes from './routes/permissions'
import brandingAdminRoutes from './routes/branding'
import { mapsPublicRoutes, mapsAdminRoutes } from './routes/maps'
import { localesPublicRoutes, localesAdminRoutes } from './routes/locales'
import { maintenancePublicRoutes, maintenanceAdminRoutes } from './routes/maintenance'
import { syncSystemAuthorization } from './lib/authorization/sync-system-authorization'
import { MULTIPART_OPTIONS } from './lib/multipart'
import adminRoutes from './routes/admin'

const app = Fastify({
  bodyLimit: 350 * 1024 * 1024, // 350 MB — necessario per upload catalogo PDF
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined
  }
})

const start = async () => {
  await app.register(fastifySecureSession, {
    secret: process.env.SESSION_SECRET!,
    salt: process.env.SESSION_SALT!,
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    }
  })

  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute'
  })

  await app.register(multipart, MULTIPART_OPTIONS)
  await app.register(fastifyStatic, {
    root: UPLOADS_ROOT,
    prefix: '/uploads/',
  })
  await app.register(prismaPlugin)
  await syncSystemAuthorization(app.prisma)
  await app.register(errorHandlerPlugin)
  await app.register(authPlugin)

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(publicRoutes, { prefix: '/api/public' })
  await app.register(localesPublicRoutes, { prefix: '/api/public/locales' })
  await app.register(usersRoutes, { prefix: '/api/users' })
  await app.register(rolesRoutes, { prefix: '/api/roles' })
  await app.register(permissionsRoutes, { prefix: '/api/permissions' })
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
  await app.register(adminRoutes, { prefix: '/api/admin' })
  await app.register(clientRoutes, { prefix: '/api/client' })

  const port = Number(process.env.PORT) || 3001
  await app.listen({ port, host: '0.0.0.0' })
  app.log.info(`Backend in ascolto su http://0.0.0.0:${port}`)
}

start().catch((err) => {
  process.stderr.write(String(err) + '\n')
  process.exit(1)
})

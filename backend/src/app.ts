import 'dotenv/config'
import Fastify from 'fastify'
import fastifySecureSession from '@fastify/secure-session'
import fastifyRateLimit from '@fastify/rate-limit'

import prismaPlugin from './plugins/prisma'
import errorHandlerPlugin from './plugins/errorHandler'
import authPlugin from './plugins/auth'

import authRoutes from './routes/auth'
import publicRoutes from './routes/public'
import usersRoutes from './routes/users'
import rolesRoutes from './routes/roles'
import coffinsRoutes from './routes/articles/coffins'
import accessoriesRoutes from './routes/articles/accessories'
import marmistaRoutes from './routes/articles/marmista'
import pricelistsRoutes from './routes/pricelists'
import catalogRoutes from './routes/catalog'

const app = Fastify({
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

  await app.register(prismaPlugin)
  await app.register(errorHandlerPlugin)
  await app.register(authPlugin)

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(publicRoutes, { prefix: '/api/public' })
  await app.register(usersRoutes, { prefix: '/api/users' })
  await app.register(rolesRoutes, { prefix: '/api/roles' })
  await app.register(coffinsRoutes, { prefix: '/api/articles/coffins' })
  await app.register(accessoriesRoutes, { prefix: '/api/articles/accessories' })
  await app.register(marmistaRoutes, { prefix: '/api/articles/marmista' })
  await app.register(pricelistsRoutes, { prefix: '/api/pricelists' })
  await app.register(catalogRoutes, { prefix: '/api/catalog' })

  const port = Number(process.env.PORT) || 3001
  await app.listen({ port, host: '127.0.0.1' })
  app.log.info(`Backend in ascolto su http://127.0.0.1:${port}`)
}

start().catch((err) => {
  process.stderr.write(String(err) + '\n')
  process.exit(1)
})

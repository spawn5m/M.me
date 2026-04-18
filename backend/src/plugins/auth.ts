import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import '@fastify/secure-session'

import { getEffectivePermissions } from '../lib/authorization/get-effective-permissions'
import { hasAllPermissions, hasAnyPermission, hasPermission } from '../lib/authorization/checks'

interface AuthorizationContext {
  userId: string
  permissions: string[]
}

type AuthPreHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>

interface SessionUserRecord {
  id: string
  isActive: boolean
}

function sendUnauthorized(reply: FastifyReply) {
  return reply.status(401).send({
    error: 'Unauthorized',
    message: 'Sessione non valida o scaduta',
    statusCode: 401
  })
}

function sendForbidden(reply: FastifyReply, message: string) {
  return reply.status(403).send({
    error: 'Forbidden',
    message,
    statusCode: 403
  })
}

async function getValidSessionUser(request: FastifyRequest): Promise<SessionUserRecord | null> {
  const userId = request.session.get('userId')
  if (!userId) {
    return null
  }

  const user = await request.server.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isActive: true,
    },
  })

  if (!user || !user.isActive) {
    request.session.delete()
    return null
  }

  return user
}

async function ensureAuthorizationContext(request: FastifyRequest, reply: FastifyReply) {
  if (request.auth) {
    return true
  }

  await request.server.loadAuthorizationContext(request, reply)
  return !reply.sent
}

declare module '@fastify/secure-session' {
  interface SessionData {
    userId: string
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthorizationContext
  }

  interface FastifyInstance {
    authenticate: AuthPreHandler
    loadAuthorizationContext: AuthPreHandler
    checkPermission: (permission: string) => AuthPreHandler
    checkAnyPermission: (permissions: string[]) => AuthPreHandler
    checkAllPermissions: (permissions: string[]) => AuthPreHandler
  }
}

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorateRequest('auth', null as unknown as AuthorizationContext)

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await getValidSessionUser(request)
      if (!user) {
        return sendUnauthorized(reply)
      }
    }
  )

  fastify.decorate(
    'loadAuthorizationContext',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await getValidSessionUser(request)
      if (!user) {
        return sendUnauthorized(reply)
      }

      const { permissions } = await getEffectivePermissions(fastify.prisma, user.id)

      request.auth = {
        userId: user.id,
        permissions,
      }
    }
  )

  fastify.decorate(
    'checkPermission',
    (permission: string) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!(await ensureAuthorizationContext(request, reply))) {
          return
        }

        if (!hasPermission(request.auth.permissions, permission)) {
          return sendForbidden(reply, 'Permesso non autorizzato per questa operazione')
        }
      }
  )

  fastify.decorate(
    'checkAnyPermission',
    (permissions: string[]) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!(await ensureAuthorizationContext(request, reply))) {
          return
        }

        if (!hasAnyPermission(request.auth.permissions, permissions)) {
          return sendForbidden(reply, 'Permessi insufficienti per questa operazione')
        }
      }
  )

  fastify.decorate(
    'checkAllPermissions',
    (permissions: string[]) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!(await ensureAuthorizationContext(request, reply))) {
          return
        }

        if (!hasAllPermissions(request.auth.permissions, permissions)) {
          return sendForbidden(reply, 'Permessi insufficienti per questa operazione')
        }
      }
  )
})

export default authPlugin

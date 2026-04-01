import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import '@fastify/secure-session'

declare module '@fastify/secure-session' {
  interface SessionData {
    userId: string
    roles: string[]
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    checkRole: (allowedRoles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.session.get('userId')
      if (!userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Sessione non valida o scaduta',
          statusCode: 401
        })
      }
    }
  )

  fastify.decorate(
    'checkRole',
    (allowedRoles: string[]) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        const roles: string[] = request.session.get('roles') ?? []
        const hasRole = allowedRoles.some((r) => roles.includes(r))
        if (!hasRole) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Ruolo non autorizzato per questa operazione',
            statusCode: 403
          })
        }
      }
  )
})

export default authPlugin

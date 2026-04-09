import { FastifyPluginAsync } from 'fastify'

const NOT_IMPLEMENTED = { error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 }

const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  fastify.get('/pdf', {
    preHandler: [fastify.checkPermission('catalog.pdf.read')]
  }, async (_req, reply) => reply.status(501).send(NOT_IMPLEMENTED))

  fastify.post('/pdf', {
    preHandler: [fastify.checkPermission('catalog.pdf.write')]
  }, async (_req, reply) => reply.status(501).send(NOT_IMPLEMENTED))
}

export default catalogRoutes

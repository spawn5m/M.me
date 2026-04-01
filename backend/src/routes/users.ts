import { FastifyPluginAsync } from 'fastify'

const NOT_IMPLEMENTED = { error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 }

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin']))

  fastify.get('/', async (_req, reply) => reply.status(501).send(NOT_IMPLEMENTED))
  fastify.post('/', async (_req, reply) => reply.status(501).send(NOT_IMPLEMENTED))
  fastify.get('/:id', async (_req, reply) => reply.status(501).send(NOT_IMPLEMENTED))
  fastify.put('/:id', async (_req, reply) => reply.status(501).send(NOT_IMPLEMENTED))
  fastify.delete('/:id', async (_req, reply) => reply.status(501).send(NOT_IMPLEMENTED))
}

export default usersRoutes

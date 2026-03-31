import { FastifyPluginAsync } from 'fastify'

const publicRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() })
  })
}

export default publicRoutes

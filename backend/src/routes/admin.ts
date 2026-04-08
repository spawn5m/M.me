import { FastifyPluginAsync } from 'fastify'

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  fastify.get('/stats', {
    preHandler: [fastify.checkPermission('dashboard.admin.read')]
  }, async (_req, reply) => {
    const [users, coffins, accessories, marmista] = await Promise.all([
      fastify.prisma.user.count({ where: { isActive: true } }),
      fastify.prisma.coffinArticle.count(),
      fastify.prisma.accessoryArticle.count(),
      fastify.prisma.marmistaArticle.count()
    ])

    return reply.send({ users, coffins, accessories, marmista })
  })
}

export default adminRoutes

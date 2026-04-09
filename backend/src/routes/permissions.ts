import { FastifyPluginAsync } from 'fastify'

import { getPermissionCatalog } from '../lib/authorization/admin-permission-details'

const permissionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  fastify.get(
    '/',
    {
      preHandler: [fastify.checkPermission('roles.read')],
    },
    async (_req, reply) => {
      const permissions = await getPermissionCatalog(fastify.prisma)

      return reply.send({
        data: permissions,
        pagination: {
          page: 1,
          pageSize: permissions.length,
          total: permissions.length,
          totalPages: 1,
        },
      })
    },
  )
}

export default permissionsRoutes

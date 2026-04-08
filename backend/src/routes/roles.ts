import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const createRoleSchema = z.object({
  name: z.string().regex(/^[a-z_]+$/, 'Il nome deve contenere solo lettere minuscole e underscore'),
  label: z.string().min(1, 'Label obbligatoria')
})

const rolesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  // GET /api/roles
  fastify.get('/', {
    preHandler: [fastify.checkPermission('roles.read')]
  }, async (_req, reply) => {
    const roles = await fastify.prisma.role.findMany({
      orderBy: { name: 'asc' }
    })
    return reply.send({
      data: roles,
      pagination: {
        page: 1,
        pageSize: roles.length,
        total: roles.length,
        totalPages: 1
      }
    })
  })

  // POST /api/roles
  fastify.post('/', {
    preHandler: [fastify.checkPermission('roles.manage')]
  }, async (req, reply) => {
    const parsed = createRoleSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsed.error.errors[0].message,
        statusCode: 400
      })
    }

    const { name, label } = parsed.data

    const existing = await fastify.prisma.role.findUnique({ where: { name } })
    if (existing) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Nome ruolo già in uso',
        statusCode: 409
      })
    }

    const role = await fastify.prisma.role.create({
      data: { name, label, isSystem: false }
    })

    return reply.status(201).send(role)
  })

  // DELETE /api/roles/:id
  fastify.delete('/:id', {
    preHandler: [fastify.checkPermission('roles.manage')]
  }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const role = await fastify.prisma.role.findUnique({ where: { id } })
    if (!role) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Ruolo non trovato',
        statusCode: 404
      })
    }

    if (role.isSystem) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'I ruoli di sistema non possono essere eliminati',
        statusCode: 409
      })
    }

    await fastify.prisma.role.delete({ where: { id } })
    return reply.status(204).send()
  })
}

export default rolesRoutes

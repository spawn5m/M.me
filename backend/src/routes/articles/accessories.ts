import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const bodySchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  notes: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  pdfPage: z.number().int().optional().nullable(),
  categoryIds: z.array(z.string()).optional().default([]),
  subcategoryIds: z.array(z.string()).optional().default([]),
})

const INCLUDE = {
  categories: { select: { id: true, code: true, label: true } },
  subcategories: { select: { id: true, code: true, label: true } },
}

const accessoriesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin']))

  fastify.get<{ Querystring: { page?: string; search?: string } }>('/', async (req) => {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10))
    const pageSize = 50
    const where = req.query.search
      ? {
          OR: [
            { code: { contains: req.query.search, mode: 'insensitive' as const } },
            { description: { contains: req.query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [data, total] = await Promise.all([
      fastify.prisma.accessoryArticle.findMany({
        where, include: INCLUDE, orderBy: { code: 'asc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      fastify.prisma.accessoryArticle.count({ where }),
    ])
    return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
  })

  fastify.post<{ Body: z.infer<typeof bodySchema> }>('/', async (req, reply) => {
    const { categoryIds, subcategoryIds, ...rest } = bodySchema.parse(req.body)
    const item = await fastify.prisma.accessoryArticle.create({
      data: {
        ...rest,
        categories: { connect: categoryIds.map(id => ({ id })) },
        subcategories: { connect: subcategoryIds.map(id => ({ id })) },
      },
      include: INCLUDE,
    })
    return reply.status(201).send(item)
  })

  fastify.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const item = await fastify.prisma.accessoryArticle.findUnique({ where: { id: req.params.id }, include: INCLUDE })
    if (!item) return reply.status(404).send({ error: 'NotFound', message: 'Articolo non trovato', statusCode: 404 })
    return item
  })

  fastify.put<{ Params: { id: string }; Body: z.infer<typeof bodySchema> }>('/:id', async (req, reply) => {
    const { categoryIds, subcategoryIds, ...rest } = bodySchema.parse(req.body)
    const item = await fastify.prisma.accessoryArticle.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        categories: { set: categoryIds.map(id => ({ id })) },
        subcategories: { set: subcategoryIds.map(id => ({ id })) },
      },
      include: INCLUDE,
    })
    return item
  })

  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    await fastify.prisma.accessoryArticle.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })
}

export default accessoriesRoutes

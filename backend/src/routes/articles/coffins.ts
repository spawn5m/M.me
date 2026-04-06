import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const coffinBodySchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  notes: z.string().optional().nullable(),
  measureId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional().default([]),
  subcategoryIds: z.array(z.string()).optional().default([]),
  essenceIds: z.array(z.string()).optional().default([]),
  figureIds: z.array(z.string()).optional().default([]),
  colorIds: z.array(z.string()).optional().default([]),
  finishIds: z.array(z.string()).optional().default([]),
})

const COFFIN_INCLUDE = {
  measure: { select: { id: true, code: true, label: true } },
  categories: { select: { id: true, code: true, label: true } },
  subcategories: { select: { id: true, code: true, label: true } },
  essences: { select: { id: true, code: true, label: true } },
  figures: { select: { id: true, code: true, label: true } },
  colors: { select: { id: true, code: true, label: true } },
  finishes: { select: { id: true, code: true, label: true } },
}

const coffinsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin']))

  // GET / — lista paginata
  fastify.get<{ Querystring: { page?: string; search?: string; category?: string } }>('/', async (req) => {
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
      fastify.prisma.coffinArticle.findMany({
        where,
        include: COFFIN_INCLUDE,
        orderBy: { code: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      fastify.prisma.coffinArticle.count({ where }),
    ])

    return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
  })

  // POST / — crea
  fastify.post<{ Body: z.infer<typeof coffinBodySchema> }>('/', async (req, reply) => {
    const body = coffinBodySchema.parse(req.body)
    const { categoryIds, subcategoryIds, essenceIds, figureIds, colorIds, finishIds, measureId, ...rest } = body

    const item = await fastify.prisma.coffinArticle.create({
      data: {
        ...rest,
        ...(measureId ? { measure: { connect: { id: measureId } } } : {}),
        categories: { connect: categoryIds.map(id => ({ id })) },
        subcategories: { connect: subcategoryIds.map(id => ({ id })) },
        essences: { connect: essenceIds.map(id => ({ id })) },
        figures: { connect: figureIds.map(id => ({ id })) },
        colors: { connect: colorIds.map(id => ({ id })) },
        finishes: { connect: finishIds.map(id => ({ id })) },
      },
      include: COFFIN_INCLUDE,
    })
    return reply.status(201).send(item)
  })

  // GET /:id
  fastify.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const item = await fastify.prisma.coffinArticle.findUnique({
      where: { id: req.params.id },
      include: COFFIN_INCLUDE,
    })
    if (!item) return reply.status(404).send({ error: 'NotFound', message: 'Articolo non trovato', statusCode: 404 })
    return item
  })

  // PUT /:id
  fastify.put<{ Params: { id: string }; Body: z.infer<typeof coffinBodySchema> }>('/:id', async (req, reply) => {
    const body = coffinBodySchema.parse(req.body)
    const { categoryIds, subcategoryIds, essenceIds, figureIds, colorIds, finishIds, measureId, ...rest } = body

    const item = await fastify.prisma.coffinArticle.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        measure: measureId ? { connect: { id: measureId } } : { disconnect: true },
        categories: { set: categoryIds.map(id => ({ id })) },
        subcategories: { set: subcategoryIds.map(id => ({ id })) },
        essences: { set: essenceIds.map(id => ({ id })) },
        figures: { set: figureIds.map(id => ({ id })) },
        colors: { set: colorIds.map(id => ({ id })) },
        finishes: { set: finishIds.map(id => ({ id })) },
      },
      include: COFFIN_INCLUDE,
    })
    return item
  })

  // DELETE /:id
  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    await fastify.prisma.coffinArticle.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })
}

export default coffinsRoutes

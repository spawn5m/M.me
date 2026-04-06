import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const LOOKUP_MAP = {
  'coffin-categories': 'coffinCategory',
  'coffin-subcategories': 'coffinSubcategory',
  'essences': 'essence',
  'figures': 'figure',
  'colors': 'color',
  'finishes': 'finish',
  'accessory-categories': 'accessoryCategory',
  'accessory-subcategories': 'accessorySubcategory',
  'marmista-categories': 'marmistaCategory',
} as const

type LookupType = keyof typeof LOOKUP_MAP

const bodySchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
})

const measureBodySchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  head: z.coerce.number(),
  feet: z.coerce.number(),
  shoulder: z.coerce.number(),
  height: z.coerce.number(),
  width: z.coerce.number(),
  depth: z.coerce.number(),
})

const lookupsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin']))

  fastify.get<{ Params: { type: string } }>('/:type', async (req, reply) => {
    const model = LOOKUP_MAP[req.params.type as LookupType]
    if (!model) {
      return reply.status(404).send({ error: 'NotFound', message: 'Tipo lookup non valido', statusCode: 404 })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (fastify.prisma as any)[model].findMany({ orderBy: { code: 'asc' } })
    return { data, pagination: { page: 1, pageSize: data.length, total: data.length, totalPages: 1 } }
  })

  fastify.post<{ Params: { type: string }; Body: z.infer<typeof bodySchema> }>('/:type', async (req, reply) => {
    const model = LOOKUP_MAP[req.params.type as LookupType]
    if (!model) {
      return reply.status(404).send({ error: 'NotFound', message: 'Tipo lookup non valido', statusCode: 404 })
    }
    const body = bodySchema.parse(req.body)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await (fastify.prisma as any)[model].create({ data: body })
    return reply.status(201).send(item)
  })

  fastify.put<{ Params: { type: string; id: string }; Body: z.infer<typeof bodySchema> }>('/:type/:id', async (req, reply) => {
    const model = LOOKUP_MAP[req.params.type as LookupType]
    if (!model) {
      return reply.status(404).send({ error: 'NotFound', message: 'Tipo lookup non valido', statusCode: 404 })
    }
    const body = bodySchema.parse(req.body)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await (fastify.prisma as any)[model].update({ where: { id: req.params.id }, data: body })
    return item
  })

  fastify.delete<{ Params: { type: string; id: string } }>('/:type/:id', async (req, reply) => {
    const model = LOOKUP_MAP[req.params.type as LookupType]
    if (!model) {
      return reply.status(404).send({ error: 'NotFound', message: 'Tipo lookup non valido', statusCode: 404 })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (fastify.prisma as any)[model].delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })

  fastify.get('/coffin-measures', async (_req, reply) => {
    const data = await fastify.prisma.coffinMeasure.findMany({ orderBy: { code: 'asc' } })
    return reply.send({ data, pagination: { page: 1, pageSize: data.length, total: data.length, totalPages: 1 } })
  })

  fastify.post<{ Body: z.infer<typeof measureBodySchema> }>('/coffin-measures', async (req, reply) => {
    const body = measureBodySchema.parse(req.body)
    const item = await fastify.prisma.coffinMeasure.create({ data: body })
    return reply.status(201).send(item)
  })

  fastify.put<{ Params: { id: string }; Body: z.infer<typeof measureBodySchema> }>('/coffin-measures/:id', async (req, reply) => {
    const body = measureBodySchema.parse(req.body)
    const item = await fastify.prisma.coffinMeasure.update({ where: { id: req.params.id }, data: body })
    return item
  })

  fastify.delete<{ Params: { id: string } }>('/coffin-measures/:id', async (req, reply) => {
    await fastify.prisma.coffinMeasure.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })
}

export default lookupsRoutes

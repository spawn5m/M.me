import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { computePrice, canSeePurchaseList } from '../lib/priceEngine'
import type { PriceListNode, ArticleContext } from '../types/shared'

const priceListBodySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['purchase', 'sale']),
  articleType: z.enum(['funeral', 'marmista']),
  parentId: z.string().optional().nullable(),
  autoUpdate: z.boolean().optional().default(false),
})

const ruleSchema = z.object({
  filterType: z.enum(['category', 'subcategory']).optional().nullable(),
  filterValue: z.string().optional().nullable(),
  discountType: z.enum(['percentage', 'absolute']),
  discountValue: z.number(),
})

const itemsSchema = z.object({
  items: z.array(z.object({
    coffinArticleId: z.string().optional().nullable(),
    accessoryArticleId: z.string().optional().nullable(),
    marmistaArticleId: z.string().optional().nullable(),
    price: z.number().min(0),
  })),
})

const priceListInclude = {
  _count: { select: { items: true } },
  rules: true,
  parent: { select: { id: true, name: true } },
}

const pricelistsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin', 'collaboratore']))

  // GET / — lista listini (filtra acquisto per ruoli non autorizzati)
  fastify.get('/', async (req) => {
    const roles: string[] = req.session.get('roles') ?? []
    const canSeePurchase = canSeePurchaseList(roles)

    const where = canSeePurchase ? {} : { type: { not: 'purchase' as const } }

    const data = await fastify.prisma.priceList.findMany({
      where,
      include: priceListInclude,
      orderBy: { name: 'asc' },
    })
    return { data, pagination: { page: 1, pageSize: data.length, total: data.length, totalPages: 1 } }
  })

  // POST / — crea listino
  fastify.post<{ Body: z.infer<typeof priceListBodySchema> }>('/', async (req, reply) => {
    const body = priceListBodySchema.parse(req.body)
    const item = await fastify.prisma.priceList.create({
      data: {
        name: body.name,
        type: body.type,
        articleType: body.articleType,
        autoUpdate: body.autoUpdate,
        ...(body.parentId ? { parent: { connect: { id: body.parentId } } } : {}),
      },
      include: priceListInclude,
    })
    return reply.status(201).send(item)
  })

  // GET /:id
  fastify.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const roles: string[] = req.session.get('roles') ?? []
    const canSeePurchase = canSeePurchaseList(roles)

    const item = await fastify.prisma.priceList.findUnique({
      where: { id: req.params.id },
      include: { ...priceListInclude, items: true },
    })
    if (!item) return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    if (item.type === 'purchase' && !canSeePurchase) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Non autorizzato', statusCode: 403 })
    }
    return item
  })

  // PUT /:id
  fastify.put<{ Params: { id: string }; Body: z.infer<typeof priceListBodySchema> }>('/:id', async (req, reply) => {
    const body = priceListBodySchema.parse(req.body)
    const item = await fastify.prisma.priceList.update({
      where: { id: req.params.id },
      data: {
        name: body.name,
        type: body.type,
        articleType: body.articleType,
        autoUpdate: body.autoUpdate,
        parent: body.parentId ? { connect: { id: body.parentId } } : { disconnect: true },
      },
      include: priceListInclude,
    })
    return item
  })

  // DELETE /:id
  fastify.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    await fastify.prisma.priceList.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })

  // POST /:id/rules — aggiunge regola
  fastify.post<{ Params: { id: string }; Body: z.infer<typeof ruleSchema> }>('/:id/rules', async (req, reply) => {
    const body = ruleSchema.parse(req.body)
    const rule = await fastify.prisma.priceRule.create({
      data: { ...body, priceListId: req.params.id },
    })
    return reply.status(201).send(rule)
  })

  // DELETE /:id/rules/:ruleId
  fastify.delete<{ Params: { id: string; ruleId: string } }>('/:id/rules/:ruleId', async (req, reply) => {
    await fastify.prisma.priceRule.delete({ where: { id: req.params.ruleId } })
    return reply.status(204).send()
  })

  // POST /:id/items — sostituisce tutti i prezzi articoli
  fastify.post<{ Params: { id: string }; Body: z.infer<typeof itemsSchema> }>('/:id/items', async (req, reply) => {
    const { items } = itemsSchema.parse(req.body)
    await fastify.prisma.$transaction([
      fastify.prisma.priceListItem.deleteMany({ where: { priceListId: req.params.id } }),
      fastify.prisma.priceListItem.createMany({
        data: items.map(item => ({ priceListId: req.params.id, ...item })),
      }),
    ])
    return reply.send({ ok: true })
  })

  // GET /:id/preview — calcola prezzi senza salvare
  fastify.get<{ Params: { id: string } }>('/:id/preview', async (req, reply) => {
    const pl = await fastify.prisma.priceList.findUnique({
      where: { id: req.params.id },
      include: {
        rules: true,
        parent: { include: { rules: true, parent: { include: { rules: true } } } },
        items: {
          include: {
            coffinArticle: true,
            accessoryArticle: true,
            marmistaArticle: true,
          },
        },
      },
    })
    if (!pl) return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })

    const node = buildNode(pl)
    const previews = pl.items.map(item => {
      const article: ArticleContext = { basePrice: item.price }
      return { itemId: item.id, computedPrice: computePrice(node, article, item.price) }
    })
    return { previews }
  })

  // POST /:id/recalculate — ricalcola snapshot
  fastify.post<{ Params: { id: string } }>('/:id/recalculate', async (req, reply) => {
    const pl = await fastify.prisma.priceList.findUnique({
      where: { id: req.params.id },
      include: {
        rules: true,
        parent: { include: { rules: true, parent: { include: { rules: true } } } },
        items: true,
      },
    })
    if (!pl) return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    if (pl.autoUpdate) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Il listino è in autoUpdate — il ricalcolo non si applica', statusCode: 400 })
    }

    const node = buildNode(pl)
    await fastify.prisma.$transaction(
      pl.items.map(item =>
        fastify.prisma.priceListItem.update({
          where: { id: item.id },
          data: { price: computePrice(node, { basePrice: item.price }, item.price) },
        })
      )
    )
    return reply.send({ recalculated: pl.items.length })
  })

  // PUT /:id/assign/:userId — assegna listino a utente
  fastify.put<{ Params: { id: string; userId: string } }>('/:id/assign/:userId', async (req, reply) => {
    const pl = await fastify.prisma.priceList.findUnique({ where: { id: req.params.id } })
    if (!pl) return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })

    const user = await fastify.prisma.user.findUnique({
      where: { id: req.params.userId },
      include: { userRoles: { include: { role: true } } },
    })
    if (!user) return reply.status(404).send({ error: 'NotFound', message: 'Utente non trovato', statusCode: 404 })

    const userRoleNames = user.userRoles.map(ur => ur.role.name)
    const isMarmista = userRoleNames.includes('marmista')

    if (isMarmista && pl.articleType === 'funeral') {
      return reply.status(400).send({ error: 'BadRequest', message: 'Non si può assegnare un listino funebre a un marmista', statusCode: 400 })
    }

    const field = pl.articleType === 'funeral' ? 'funeralPriceListId' : 'marmistaPriceListId'
    await fastify.prisma.user.update({
      where: { id: req.params.userId },
      data: { [field]: pl.id },
    })
    return reply.send({ ok: true })
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildNode(pl: any): PriceListNode {
  return {
    type: pl.type,
    autoUpdate: pl.autoUpdate,
    rules: pl.rules,
    parent: pl.parent ? buildNode(pl.parent) : undefined,
  }
}

export default pricelistsRoutes

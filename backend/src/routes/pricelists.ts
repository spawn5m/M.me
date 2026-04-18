import type { Prisma } from '@prisma/client'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { hasAnyPermission, hasPermission } from '../lib/authorization/checks'
import {
  buildComputedItems,
  loadPriceListTree,
  type ComputedPriceListItem,
  type PrismaClientLike,
} from '../lib/priceListUtils'

const priceListBodySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['purchase', 'sale']),
  articleType: z.enum(['funeral', 'marmista', 'accessories']),
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

const priceListItemInclude = {
  coffinArticle: {
    select: {
      id: true,
      code: true,
      description: true,
      categories: { select: { code: true } },
      subcategories: { select: { code: true } },
    },
  },
  accessoryArticle: {
    select: {
      id: true,
      code: true,
      description: true,
      categories: { select: { code: true } },
      subcategories: { select: { code: true } },
    },
  },
  marmistaArticle: {
    select: {
      id: true,
      code: true,
      description: true,
      categories: { select: { code: true } },
    },
  },
} as const

type StoredPriceListItem = Prisma.PriceListItemGetPayload<{ include: typeof priceListItemInclude }>

function sendForbidden() {
  return {
    error: 'Forbidden',
    message: 'Permessi insufficienti per questa operazione',
    statusCode: 403,
  }
}

function canReadPriceList(permissions: readonly string[], type: 'sale' | 'purchase') {
  return hasPermission(permissions, `pricelists.${type}.read`)
}

function canWritePriceList(permissions: readonly string[], type: 'sale' | 'purchase') {
  return hasPermission(permissions, `pricelists.${type}.write`)
}

function canDeletePriceList(permissions: readonly string[], type: 'sale' | 'purchase') {
  return hasPermission(permissions, `pricelists.${type}.delete`)
}

function canPreviewPriceList(permissions: readonly string[], type: 'sale' | 'purchase') {
  return hasPermission(permissions, `pricelists.${type}.preview`)
}

function canRecalculatePriceList(permissions: readonly string[], type: 'sale' | 'purchase') {
  return hasPermission(permissions, `pricelists.${type}.recalculate`)
}

function canAssignPriceList(permissions: readonly string[], type: 'sale' | 'purchase') {
  if (type === 'sale') {
    return hasPermission(permissions, 'pricelists.sale.assign')
  }

  return hasPermission(permissions, 'pricelists.purchase.write')
}

const pricelistsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  // GET / — lista listini (filtra acquisto per ruoli non autorizzati)
  fastify.get('/', {
    preHandler: [fastify.checkAnyPermission(['pricelists.sale.read', 'pricelists.purchase.read'])]
  }, async (req) => {
    const canSeePurchase = canReadPriceList(req.auth.permissions, 'purchase')

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

    if (!canWritePriceList(req.auth.permissions, body.type)) {
      return reply.status(403).send(sendForbidden())
    }

    if (body.parentId) {
      const parent = await fastify.prisma.priceList.findUnique({ where: { id: body.parentId } })
      if (!parent) {
        return reply.status(404).send({ error: 'NotFound', message: 'Listino padre non trovato', statusCode: 404 })
      }
      if (parent.articleType !== body.articleType) {
        return reply.status(400).send({ error: 'BadRequest', message: 'Il dominio del listino padre non corrisponde', statusCode: 400 })
      }
      if (parent.type !== body.type) {
        return reply.status(400).send({ error: 'BadRequest', message: 'Il tipo del listino padre non corrisponde', statusCode: 400 })
      }
    }

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
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.checkAnyPermission(['pricelists.sale.read', 'pricelists.purchase.read'])]
  }, async (req, reply) => {
    const item = await fastify.prisma.priceList.findUnique({
      where: { id: req.params.id },
      include: { ...priceListInclude, items: true },
    })
    if (!item) return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    if (!canReadPriceList(req.auth.permissions, item.type)) {
      return reply.status(403).send(sendForbidden())
    }

    const tree = await loadPriceListTree(fastify.prisma, req.params.id)
    if (!tree) {
      return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    }

    const storedItems = await loadStoredItems(fastify.prisma, req.params.id)
    const computedItems = tree.parentId ? await buildComputedItems(fastify.prisma, tree) : []

    return {
      ...item,
      items: tree.parentId
        ? (item.autoUpdate || storedItems.length === 0
          ? computedItems.map(serializeComputedItem)
          : storedItems.map(serializeStoredItem))
        : storedItems.map(serializeStoredItem),
    }
  })

  // PUT /:id
  fastify.put<{ Params: { id: string }; Body: z.infer<typeof priceListBodySchema> }>('/:id', async (req, reply) => {
    const body = priceListBodySchema.parse(req.body)
    const existing = await fastify.prisma.priceList.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    }

    if (!canWritePriceList(req.auth.permissions, existing.type) || !canWritePriceList(req.auth.permissions, body.type)) {
      return reply.status(403).send(sendForbidden())
    }

    if (body.parentId === req.params.id) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Un listino non può avere se stesso come padre', statusCode: 400 })
    }

    if (body.parentId) {
      const parent = await fastify.prisma.priceList.findUnique({ where: { id: body.parentId } })
      if (!parent) {
        return reply.status(404).send({ error: 'NotFound', message: 'Listino padre non trovato', statusCode: 404 })
      }
      if (parent.articleType !== body.articleType) {
        return reply.status(400).send({ error: 'BadRequest', message: 'Il dominio del listino padre non corrisponde', statusCode: 400 })
      }
      if (parent.type !== body.type) {
        return reply.status(400).send({ error: 'BadRequest', message: 'Il tipo del listino padre non corrisponde', statusCode: 400 })
      }
    }

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
    const item = await fastify.prisma.priceList.findUnique({ where: { id: req.params.id } })
    if (!item) {
      return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    }
    if (!canDeletePriceList(req.auth.permissions, item.type)) {
      return reply.status(403).send(sendForbidden())
    }

    const [childrenCount, assignedUsersCount] = await Promise.all([
      fastify.prisma.priceList.count({ where: { parentId: req.params.id } }),
      fastify.prisma.user.count({
        where: {
          OR: [
            { funeralPriceListId: req.params.id },
            { marmistaPriceListId: req.params.id },
          ],
        },
      }),
    ])

    if (childrenCount > 0) {
      return reply.status(409).send({ error: 'Conflict', message: 'Il listino ha listini figli collegati', statusCode: 409 })
    }
    if (assignedUsersCount > 0) {
      return reply.status(409).send({ error: 'Conflict', message: 'Il listino è assegnato a uno o più utenti', statusCode: 409 })
    }

    await fastify.prisma.priceList.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })

  // POST /:id/rules — aggiunge regola
  fastify.post<{ Params: { id: string }; Body: z.infer<typeof ruleSchema> }>('/:id/rules', async (req, reply) => {
    const list = await fastify.prisma.priceList.findUnique({ where: { id: req.params.id } })
    if (!list) {
      return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    }
    if (!canWritePriceList(req.auth.permissions, list.type)) {
      return reply.status(403).send(sendForbidden())
    }

    const body = ruleSchema.parse(req.body)
    const rule = await fastify.prisma.priceRule.create({
      data: { ...body, priceListId: req.params.id },
    })
    return reply.status(201).send(rule)
  })

  // DELETE /:id/rules/:ruleId
  fastify.delete<{ Params: { id: string; ruleId: string } }>('/:id/rules/:ruleId', async (req, reply) => {
    const list = await fastify.prisma.priceList.findUnique({ where: { id: req.params.id } })
    if (!list) {
      return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    }
    if (!canWritePriceList(req.auth.permissions, list.type)) {
      return reply.status(403).send(sendForbidden())
    }

    const rule = await fastify.prisma.priceRule.findFirst({
      where: {
        id: req.params.ruleId,
        priceListId: req.params.id,
      },
    })
    if (!rule) {
      return reply.status(404).send({ error: 'NotFound', message: 'Regola non trovata', statusCode: 404 })
    }

    await fastify.prisma.priceRule.delete({ where: { id: req.params.ruleId } })
    return reply.status(204).send()
  })

  // POST /:id/items — sostituisce tutti i prezzi articoli
  fastify.post<{ Params: { id: string }; Body: z.infer<typeof itemsSchema> }>('/:id/items', async (req, reply) => {
    const { items } = itemsSchema.parse(req.body)
    const list = await fastify.prisma.priceList.findUnique({ where: { id: req.params.id } })
    if (!list) {
      return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    }
    if (!canWritePriceList(req.auth.permissions, list.type)) {
      return reply.status(403).send(sendForbidden())
    }
    if (list.parentId) {
      return reply.status(400).send({ error: 'BadRequest', message: 'I prezzi manuali sono disponibili solo sui listini base', statusCode: 400 })
    }

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
    const tree = await loadPriceListTree(fastify.prisma, req.params.id)
    if (!tree) return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    if (!canPreviewPriceList(req.auth.permissions, tree.type)) {
      return reply.status(403).send(sendForbidden())
    }

    const previews = await buildComputedItems(fastify.prisma, tree)
    return {
      previews: previews.map((item) => ({
        itemId: item.sourceItemId,
        computedPrice: item.computedPrice,
        coffinArticle: item.coffinArticle,
        accessoryArticle: item.accessoryArticle,
        marmistaArticle: item.marmistaArticle,
      })),
    }
  })

  // POST /:id/recalculate — ricalcola snapshot
  fastify.post<{ Params: { id: string } }>('/:id/recalculate', async (req, reply) => {
    const tree = await loadPriceListTree(fastify.prisma, req.params.id)
    if (!tree) return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    if (!canRecalculatePriceList(req.auth.permissions, tree.type)) {
      return reply.status(403).send(sendForbidden())
    }
    if (tree.autoUpdate) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Il listino è in autoUpdate — il ricalcolo non si applica', statusCode: 400 })
    }

    const computedItems = await buildComputedItems(fastify.prisma, tree)
    await fastify.prisma.$transaction([
      fastify.prisma.priceListItem.deleteMany({ where: { priceListId: req.params.id } }),
      fastify.prisma.priceListItem.createMany({
        data: computedItems.map((item) => ({
          priceListId: req.params.id,
          coffinArticleId: item.coffinArticleId,
          accessoryArticleId: item.accessoryArticleId,
          marmistaArticleId: item.marmistaArticleId,
          price: item.computedPrice,
        })),
      }),
    ])

    return reply.send({ recalculated: computedItems.length })
  })

  // PUT /:id/assign/:userId — assegna listino a utente
  fastify.put<{ Params: { id: string; userId: string } }>('/:id/assign/:userId', async (req, reply) => {
    const pl = await fastify.prisma.priceList.findUnique({ where: { id: req.params.id } })
    if (!pl) return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    if (!canAssignPriceList(req.auth.permissions, pl.type)) {
      return reply.status(403).send(sendForbidden())
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: req.params.userId },
      include: { userPermissions: { include: { permission: { select: { code: true } } } } },
    })
    if (!user) return reply.status(404).send({ error: 'NotFound', message: 'Utente non trovato', statusCode: 404 })

    const userPermCodes = user.userPermissions.map((up) => up.permission.code)
    const isMarmista = userPermCodes.includes('client.catalog.marmista.read')
    const isFuneralClient = userPermCodes.includes('client.catalog.funeral.read')

    if (isMarmista && pl.articleType === 'funeral') {
      return reply.status(400).send({ error: 'BadRequest', message: 'Non si può assegnare un listino funebre a un marmista', statusCode: 400 })
    }
    if (isFuneralClient && pl.articleType === 'marmista') {
      return reply.status(400).send({ error: 'BadRequest', message: 'Non si può assegnare un listino marmista a un impresario funebre', statusCode: 400 })
    }

    const field =
      pl.articleType === 'funeral' ? 'funeralPriceListId'
      : pl.articleType === 'marmista' ? 'marmistaPriceListId'
      : 'accessoriesPriceListId'

    await fastify.prisma.user.update({
      where: { id: req.params.userId },
      data: { [field]: pl.id },
    })
    return reply.send({ ok: true })
  })

  // GET /purchase-accessories — lista listini acquisto accessori
  fastify.get('/purchase-accessories', {
    preHandler: [fastify.checkPermission('pricelists.purchase.read')]
  }, async () => {
    const data = await fastify.prisma.priceList.findMany({
      where: { type: 'purchase', articleType: 'accessories' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return { data }
  })

  // GET /purchase-prices-accessories?priceListId=X — prezzi acquisto accessori calcolati
  fastify.get('/purchase-prices-accessories', {
    preHandler: [fastify.checkPermission('pricelists.purchase.read')]
  }, async (req, reply) => {
    const query = z.object({ priceListId: z.string().min(1) }).safeParse(req.query)
    if (!query.success) {
      return reply.status(400).send({ error: 'BadRequest', message: 'priceListId mancante', statusCode: 400 })
    }

    const pricelist = await fastify.prisma.priceList.findUnique({
      where: { id: query.data.priceListId },
      select: { type: true, articleType: true },
    })

    if (!pricelist || pricelist.type !== 'purchase' || pricelist.articleType !== 'accessories') {
      return reply.status(400).send({ error: 'BadRequest', message: 'Listino acquisto accessori non valido', statusCode: 400 })
    }

    const tree = await loadPriceListTree(fastify.prisma as PrismaClientLike, query.data.priceListId)
    if (!tree) return { prices: {} }

    const computedItems = await buildComputedItems(fastify.prisma as PrismaClientLike, tree)

    const prices: Record<string, number> = {}
    for (const item of computedItems) {
      if (item.accessoryArticleId != null) {
        prices[item.accessoryArticleId] = item.computedPrice
      }
    }
    return { prices }
  })

  // GET /purchase-marmista — lista listini acquisto marmista
  fastify.get('/purchase-marmista', {
    preHandler: [fastify.checkPermission('pricelists.purchase.read')]
  }, async () => {
    const data = await fastify.prisma.priceList.findMany({
      where: { type: 'purchase', articleType: 'marmista' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return { data }
  })

  // GET /purchase-prices-marmista?priceListId=X — prezzi acquisto marmista calcolati
  fastify.get('/purchase-prices-marmista', {
    preHandler: [fastify.checkPermission('pricelists.purchase.read')]
  }, async (req, reply) => {
    const query = z.object({ priceListId: z.string().min(1) }).safeParse(req.query)
    if (!query.success) {
      return reply.status(400).send({ error: 'BadRequest', message: 'priceListId mancante', statusCode: 400 })
    }

    const pricelist = await fastify.prisma.priceList.findUnique({
      where: { id: query.data.priceListId },
      select: { type: true, articleType: true },
    })

    if (!pricelist || pricelist.type !== 'purchase' || pricelist.articleType !== 'marmista') {
      return reply.status(400).send({ error: 'BadRequest', message: 'Listino acquisto marmista non valido', statusCode: 400 })
    }

    const tree = await loadPriceListTree(fastify.prisma as PrismaClientLike, query.data.priceListId)
    if (!tree) return { prices: {} }

    const computedItems = await buildComputedItems(fastify.prisma as PrismaClientLike, tree)

    const prices: Record<string, number> = {}
    for (const item of computedItems) {
      if (item.marmistaArticleId != null) {
        prices[item.marmistaArticleId] = item.computedPrice
      }
    }
    return { prices }
  })

  // GET /purchase-funeral — lista listini acquisto cofani (per attivazione inline nella pagina pubblica)
  fastify.get('/purchase-funeral', {
    preHandler: [fastify.checkPermission('pricelists.purchase.read')]
  }, async () => {
    const data = await fastify.prisma.priceList.findMany({
      where: { type: 'purchase', articleType: 'funeral' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return { data }
  })

  // GET /purchase-prices?priceListId=X — prezzi acquisto cofani calcolati
  fastify.get('/purchase-prices', {
    preHandler: [fastify.checkPermission('pricelists.purchase.read')]
  }, async (req, reply) => {
    const query = z.object({ priceListId: z.string().min(1) }).safeParse(req.query)
    if (!query.success) {
      return reply.status(400).send({ error: 'BadRequest', message: 'priceListId mancante', statusCode: 400 })
    }

    const pricelist = await fastify.prisma.priceList.findUnique({
      where: { id: query.data.priceListId },
      select: { type: true, articleType: true },
    })

    if (!pricelist || pricelist.type !== 'purchase' || pricelist.articleType !== 'funeral') {
      return reply.status(400).send({ error: 'BadRequest', message: 'Listino acquisto cofani non valido', statusCode: 400 })
    }

    const tree = await loadPriceListTree(fastify.prisma as PrismaClientLike, query.data.priceListId)
    if (!tree) return { prices: {} }

    const computedItems = await buildComputedItems(fastify.prisma as PrismaClientLike, tree)

    const prices: Record<string, number> = {}
    for (const item of computedItems) {
      if (item.coffinArticleId != null) {
        prices[item.coffinArticleId] = item.computedPrice
      }
    }
    return { prices }
  })
}

async function loadStoredItems(prisma: PrismaClientLike, priceListId: string): Promise<StoredPriceListItem[]> {
  return prisma.priceListItem.findMany({
    where: { priceListId },
    include: priceListItemInclude,
    orderBy: { id: 'asc' },
  })
}

function serializeStoredItem(item: StoredPriceListItem) {
  return {
    id: item.id,
    price: item.price,
    coffinArticle: item.coffinArticle ? { code: item.coffinArticle.code, description: item.coffinArticle.description } : null,
    accessoryArticle: item.accessoryArticle ? { code: item.accessoryArticle.code, description: item.accessoryArticle.description } : null,
    marmistaArticle: item.marmistaArticle ? { code: item.marmistaArticle.code, description: item.marmistaArticle.description } : null,
  }
}

function serializeComputedItem(item: ComputedPriceListItem) {
  return {
    id: item.sourceItemId,
    price: item.computedPrice,
    coffinArticle: item.coffinArticle,
    accessoryArticle: item.accessoryArticle,
    marmistaArticle: item.marmistaArticle,
  }
}

export default pricelistsRoutes

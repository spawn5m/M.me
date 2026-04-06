import type { Prisma } from '@prisma/client'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { applyRules, canSeePurchaseList } from '../lib/priceEngine'
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

const priceListTreeSelect = {
  id: true,
  name: true,
  type: true,
  articleType: true,
  parentId: true,
  autoUpdate: true,
  rules: true,
} as const

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

interface LoadedPriceListTree {
  id: string
  name: string
  type: 'purchase' | 'sale'
  articleType: 'funeral' | 'marmista'
  parentId: string | null
  autoUpdate: boolean
  rules: Array<{
    filterType: string | null
    filterValue: string | null
    discountType: 'percentage' | 'absolute'
    discountValue: number
  }>
  parent?: LoadedPriceListTree
}

interface ComputedPriceListItem {
  sourceItemId: string
  computedPrice: number
  categoryCode?: string
  subcategoryCode?: string
  coffinArticleId: string | null
  accessoryArticleId: string | null
  marmistaArticleId: string | null
  coffinArticle: { code: string; description: string } | null
  accessoryArticle: { code: string; description: string } | null
  marmistaArticle: { code: string; description: string } | null
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

    if (body.parentId) {
      const parent = await fastify.prisma.priceList.findUnique({ where: { id: body.parentId } })
      if (!parent) {
        return reply.status(404).send({ error: 'NotFound', message: 'Listino padre non trovato', statusCode: 404 })
      }
      if (parent.articleType !== body.articleType) {
        return reply.status(400).send({ error: 'BadRequest', message: 'Il dominio del listino padre non corrisponde', statusCode: 400 })
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
    const list = await fastify.prisma.priceList.findUnique({ where: { id: req.params.id } })
    if (!list) {
      return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
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
    const roles: string[] = req.session.get('roles') ?? []
    const canSeePurchase = canSeePurchaseList(roles)
    const tree = await loadPriceListTree(fastify.prisma, req.params.id)
    if (!tree) return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    if (tree.type === 'purchase' && !canSeePurchase) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Non autorizzato', statusCode: 403 })
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
    const roles: string[] = req.session.get('roles') ?? []
    const canSeePurchase = canSeePurchaseList(roles)
    const tree = await loadPriceListTree(fastify.prisma, req.params.id)
    if (!tree) return reply.status(404).send({ error: 'NotFound', message: 'Listino non trovato', statusCode: 404 })
    if (tree.type === 'purchase' && !canSeePurchase) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Non autorizzato', statusCode: 403 })
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

function buildNode(pl: LoadedPriceListTree): PriceListNode {
  return {
    type: pl.type,
    autoUpdate: pl.autoUpdate,
    rules: pl.rules.map((rule) => ({
      filterType: (rule.filterType as 'category' | 'subcategory' | null) ?? null,
      filterValue: rule.filterValue,
      discountType: rule.discountType,
      discountValue: rule.discountValue,
    })),
    parent: pl.parent ? buildNode(pl.parent) : undefined,
  }
}

async function loadPriceListTree(prisma: Prisma.TransactionClient | PrismaClientLike, id: string): Promise<LoadedPriceListTree | null> {
  const item = await prisma.priceList.findUnique({
    where: { id },
    select: priceListTreeSelect,
  })
  if (!item) return null

  const parent = item.parentId ? await loadPriceListTree(prisma, item.parentId) : undefined
  return {
    ...item,
    type: item.type,
    articleType: item.articleType,
    parentId: item.parentId,
    parent: parent ?? undefined,
  }
}

async function loadStoredItems(prisma: PrismaClientLike, priceListId: string): Promise<StoredPriceListItem[]> {
  return prisma.priceListItem.findMany({
    where: { priceListId },
    include: priceListItemInclude,
    orderBy: { id: 'asc' },
  })
}

async function buildComputedItems(prisma: PrismaClientLike, list: LoadedPriceListTree): Promise<ComputedPriceListItem[]> {
  if (!list.parent) {
    const storedItems = await loadStoredItems(prisma, list.id)
    return storedItems.map((item) => {
      const context = getArticleContext(item)
      return {
        sourceItemId: item.id,
        computedPrice: item.price,
        categoryCode: context.categoryCode,
        subcategoryCode: context.subcategoryCode,
        coffinArticleId: item.coffinArticle?.id ?? null,
        accessoryArticleId: item.accessoryArticle?.id ?? null,
        marmistaArticleId: item.marmistaArticle?.id ?? null,
        coffinArticle: item.coffinArticle ? { code: item.coffinArticle.code, description: item.coffinArticle.description } : null,
        accessoryArticle: item.accessoryArticle ? { code: item.accessoryArticle.code, description: item.accessoryArticle.description } : null,
        marmistaArticle: item.marmistaArticle ? { code: item.marmistaArticle.code, description: item.marmistaArticle.description } : null,
      }
    })
  }

  const parentItems = await buildComputedItems(prisma, list.parent)
  const rules = buildNode(list).rules

  return parentItems.map((item) => ({
    ...item,
    computedPrice: applyRules(item.computedPrice, rules, {
      categoryCode: item.categoryCode,
      subcategoryCode: item.subcategoryCode,
    }),
  }))
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

function getArticleContext(item: StoredPriceListItem): ArticleContext {
  return {
    basePrice: item.price,
    categoryCode: item.coffinArticle?.categories[0]?.code
      ?? item.accessoryArticle?.categories[0]?.code
      ?? item.marmistaArticle?.categories[0]?.code,
    subcategoryCode: item.coffinArticle?.subcategories[0]?.code
      ?? item.accessoryArticle?.subcategories[0]?.code,
  }
}

interface PrismaClientLike {
  priceList: Prisma.TransactionClient['priceList']
  priceListItem: Prisma.TransactionClient['priceListItem']
}

export default pricelistsRoutes

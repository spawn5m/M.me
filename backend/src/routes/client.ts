import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import {
  buildComputedItems,
  loadPriceListTree,
  type PrismaClientLike,
} from '../lib/priceListUtils'

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
})


const funeralCatalogQuerySchema = z.object({
  category: z.string().optional(),
  subcategory: z.string().optional(),
  essence: z.string().optional(),
  finish: z.string().optional(),
  color: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const marmistaCatalogQuerySchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

async function getPriceForArticle(
  prisma: PrismaClientLike,
  priceListId: string,
  articleId: string,
  articleType: 'coffin' | 'marmista',
): Promise<number | null> {
  const tree = await loadPriceListTree(prisma, priceListId)
  if (!tree) return null

  const items = await buildComputedItems(prisma, tree)
  const match = items.find((item) =>
    articleType === 'coffin'
      ? item.coffinArticleId === articleId
      : item.marmistaArticleId === articleId,
  )
  return match ? match.computedPrice : null
}

const clientRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  // GET /api/client/me
  fastify.get('/me', {
    preHandler: [fastify.checkPermission('client.profile.read')]
  }, async (req, reply) => {
    const userId = req.auth.userId

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      include: {
        funeralPriceList: { select: { id: true, name: true } },
        marmistaPriceList: { select: { id: true, name: true } },
        managers: {
          include: {
            manager: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    })

    if (!user) {
      return reply.status(404).send({ error: 'NotFound', message: 'Utente non trovato', statusCode: 404 })
    }

    const firstManager = user.managers[0]?.manager ?? null

    return {
      funeralPriceList: user.funeralPriceList,
      marmistaPriceList: user.marmistaPriceList,
      manager: firstManager
        ? { name: `${firstManager.firstName} ${firstManager.lastName}`, email: firstManager.email }
        : null,
    }
  })

  // GET /api/client/catalog/funeral — solo impresario_funebre
  fastify.get('/catalog/funeral', {
    preHandler: [fastify.checkPermission('client.catalog.funeral.read')],
  }, async (req, reply) => {
    const userId = req.auth.userId

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: { funeralPriceListId: true },
    })

    if (!user?.funeralPriceListId) {
      return reply.send({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        warning: 'Nessun listino assegnato',
      })
    }

    const query = funeralCatalogQuerySchema.parse(req.query)
    const { page, pageSize, category, subcategory, essence, finish, color } = query

    const tree = await loadPriceListTree(fastify.prisma as PrismaClientLike, user.funeralPriceListId)
    const computedItems = tree ? await buildComputedItems(fastify.prisma as PrismaClientLike, tree) : []
    const allowedArticleIds = computedItems.flatMap((item) => item.coffinArticleId ? [item.coffinArticleId] : [])

    const where = {
      id: { in: allowedArticleIds },
      ...(category ? { categories: { some: { code: category } } } : {}),
      ...(subcategory ? { subcategories: { some: { code: subcategory } } } : {}),
      ...(essence ? { essences: { some: { code: essence } } } : {}),
      ...(finish ? { finishes: { some: { code: finish } } } : {}),
      ...(color ? { colors: { some: { code: color } } } : {}),
    }

    const [total, articles] = await Promise.all([
      fastify.prisma.coffinArticle.count({ where }),
      fastify.prisma.coffinArticle.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { code: 'asc' },
      }),
    ])

    const data = articles.map((article) => {
      const match = computedItems.find((item) => item.coffinArticleId === article.id)
      return {
        id: article.id,
        code: article.code,
        description: article.description,
        price: match ? match.computedPrice : null,
      }
    })

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  })

  // GET /api/client/catalog/funeral/:id — solo impresario_funebre
  fastify.get<{ Params: { id: string } }>('/catalog/funeral/:id', {
    preHandler: [fastify.checkPermission('client.catalog.funeral.read')],
  }, async (req, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { funeralPriceListId: true },
    })

    if (!user?.funeralPriceListId) {
      return reply.status(404).send({ error: 'NotFound', message: 'Articolo non trovato', statusCode: 404 })
    }

    const price = await getPriceForArticle(
      fastify.prisma as PrismaClientLike,
      user.funeralPriceListId,
      req.params.id,
      'coffin',
    )

    if (price === null) {
      return reply.status(404).send({ error: 'NotFound', message: 'Articolo non trovato', statusCode: 404 })
    }

    const article = await fastify.prisma.coffinArticle.findUnique({
      where: { id: req.params.id },
      include: { measure: true, categories: true, subcategories: true, essences: true, finishes: true, colors: true },
    })

    if (!article) {
      return reply.status(404).send({ error: 'NotFound', message: 'Articolo non trovato', statusCode: 404 })
    }

    return { ...article, price }
  })

  // GET /api/client/catalog/marmista — solo marmista
  fastify.get('/catalog/marmista', {
    preHandler: [fastify.checkPermission('client.catalog.marmista.read')],
  }, async (req, reply) => {
    const userId = req.auth.userId

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: { marmistaPriceListId: true },
    })

    if (!user?.marmistaPriceListId) {
      return reply.send({
        data: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        warning: 'Nessun listino assegnato',
      })
    }

    const query = marmistaCatalogQuerySchema.parse(req.query)
    const { page, pageSize, category } = query

    const tree = await loadPriceListTree(fastify.prisma as PrismaClientLike, user.marmistaPriceListId)
    const computedItems = tree ? await buildComputedItems(fastify.prisma as PrismaClientLike, tree) : []
    const allowedArticleIds = computedItems.flatMap((item) => item.marmistaArticleId ? [item.marmistaArticleId] : [])

    const where = {
      id: { in: allowedArticleIds },
      ...(category ? { categories: { some: { code: category } } } : {}),
    }

    const [total, articles] = await Promise.all([
      fastify.prisma.marmistaArticle.count({ where }),
      fastify.prisma.marmistaArticle.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { code: 'asc' },
      }),
    ])

    const data = articles.map((article) => {
      const match = computedItems.find((item) => item.marmistaArticleId === article.id)
      return {
        id: article.id,
        code: article.code,
        description: article.description,
        price: match ? match.computedPrice : null,
      }
    })

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  })

  // GET /api/client/catalog/marmista/:id — solo marmista
  fastify.get<{ Params: { id: string } }>('/catalog/marmista/:id', {
    preHandler: [fastify.checkPermission('client.catalog.marmista.read')],
  }, async (req, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { marmistaPriceListId: true },
    })

    if (!user?.marmistaPriceListId) {
      return reply.status(404).send({ error: 'NotFound', message: 'Articolo non trovato', statusCode: 404 })
    }

    const price = await getPriceForArticle(
      fastify.prisma as PrismaClientLike,
      user.marmistaPriceListId,
      req.params.id,
      'marmista',
    )

    if (price === null) {
      return reply.status(404).send({ error: 'NotFound', message: 'Articolo non trovato', statusCode: 404 })
    }

    const article = await fastify.prisma.marmistaArticle.findUnique({
      where: { id: req.params.id },
      include: { accessories: true, categories: true },
    })

    if (!article) {
      return reply.status(404).send({ error: 'NotFound', message: 'Articolo non trovato', statusCode: 404 })
    }

    return { ...article, price }
  })

  // POST /api/client/change-password
  fastify.post<{ Body: z.infer<typeof changePasswordSchema> }>('/change-password', {
    preHandler: [fastify.checkPermission('client.password.change')]
  }, async (req, reply) => {
    const body = changePasswordSchema.parse(req.body)
    const userId = req.auth.userId

    const user = await fastify.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return reply.status(404).send({ error: 'NotFound', message: 'Utente non trovato', statusCode: 404 })
    }

    const passwordMatch = await bcrypt.compare(body.oldPassword, user.password)
    if (!passwordMatch) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Password attuale errata',
        statusCode: 401,
      })
    }

    const hashed = await bcrypt.hash(body.newPassword, 12)
    await fastify.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    })

    return { ok: true }
  })
}

export default clientRoutes

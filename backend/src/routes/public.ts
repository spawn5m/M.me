import fs from 'fs'
import path from 'path'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { sendContactEmail } from '../lib/mailer'
import {
  buildComputedItems,
  loadPriceListTree,
  type PrismaClientLike,
} from '../lib/priceListUtils'
import type { CatalogLayoutPublic } from '../types/shared'

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
})

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

// ─── Branding ─────────────────────────────────────────────────────────────────

const LOGO_DIR = path.resolve(process.cwd(), '..', 'uploads', 'images', 'logo')
const LOGO_BASES = ['logo.png', 'logo.svg']

function findLogoUrl(): string | null {
  for (const base of LOGO_BASES) {
    if (fs.existsSync(path.join(LOGO_DIR, base))) {
      return `/uploads/images/logo/${base}`
    }
  }
  return null
}

interface PublicCoffinPriceOption {
  priceListId: string
  priceListName: string
  priceListType: 'purchase' | 'sale'
  price: number
}

interface PublicPricePrisma extends PrismaClientLike {
  user: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findUnique: (args: any) => Promise<any>
  }
}

interface PublicRolePrisma extends PrismaClientLike {
  user: {
    findUnique: (args: {
      where: { id: string }
      select: {
        userRoles: {
          select: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    }) => Promise<{ userRoles: Array<{ role: { name: string } }> } | null>
  }
}

interface SessionLike {
  get: (key: string) => unknown
}

function getSessionUserId(request: { session?: SessionLike }) {
  const userId = request.session?.get('userId')
  return typeof userId === 'string' ? userId : null
}

async function loadSessionRoles(prisma: PublicRolePrisma, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  return user?.userRoles.map((entry: { role: { name: string } }) => entry.role.name) ?? []
}

function canSeeAdminFuneralPrices(roles: string[]) {
  return roles.some((role) => role === 'manager' || role === 'super_admin')
}

async function loadAssignedFuneralPriceMap(
  prisma: PublicPricePrisma,
  userId: string,
  articleIds: string[],
): Promise<Map<string, number>> {
  const articleIdSet = new Set(articleIds)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { funeralPriceListId: true },
  })

  if (!user?.funeralPriceListId) {
    return new Map<string, number>()
  }

  const tree = await loadPriceListTree(prisma, user.funeralPriceListId)
  if (!tree) {
    return new Map<string, number>()
  }

  const computedItems = await buildComputedItems(prisma, tree)
  const priceMap = new Map<string, number>()

  for (const item of computedItems) {
    if (!item.coffinArticleId || !articleIdSet.has(item.coffinArticleId)) continue
    priceMap.set(item.coffinArticleId, item.computedPrice)
  }

  return priceMap
}

async function loadAdminFuneralPriceOptions(
  prisma: PrismaClientLike,
  articleIds: string[],
): Promise<Map<string, PublicCoffinPriceOption[]>> {
  const articleIdSet = new Set(articleIds)
  const priceLists = await prisma.priceList.findMany({
    where: {
      articleType: 'funeral',
      type: 'sale',
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
    orderBy: { name: 'asc' },
  })

  const computedByList = await Promise.all(
    priceLists.map(async (priceList) => {
      const tree = await loadPriceListTree(prisma, priceList.id)
      if (!tree) return null

      const computedItems = await buildComputedItems(prisma, tree)
      return { priceList, computedItems }
    }),
  )

  const priceMap = new Map<string, PublicCoffinPriceOption[]>()

  for (const result of computedByList) {
    if (!result) continue

    for (const item of result.computedItems) {
      if (!item.coffinArticleId || !articleIdSet.has(item.coffinArticleId)) continue

      const options = priceMap.get(item.coffinArticleId) ?? []
      options.push({
        priceListId: result.priceList.id,
        priceListName: result.priceList.name,
        priceListType: result.priceList.type,
        price: item.computedPrice,
      })
      priceMap.set(item.coffinArticleId, options)
    }
  }

  return priceMap
}

async function loadAssignedAccessoryPriceMap(
  prisma: PublicPricePrisma,
  userId: string,
  articleIds: string[],
): Promise<Map<string, number>> {
  const articleIdSet = new Set(articleIds)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessoriesPriceListId: true },
  })

  if (!user?.accessoriesPriceListId) return new Map<string, number>()

  const tree = await loadPriceListTree(prisma, user.accessoriesPriceListId)
  if (!tree) return new Map<string, number>()

  const computedItems = await buildComputedItems(prisma, tree)
  const priceMap = new Map<string, number>()

  for (const item of computedItems) {
    if (!item.accessoryArticleId || !articleIdSet.has(item.accessoryArticleId)) continue
    priceMap.set(item.accessoryArticleId, item.computedPrice)
  }

  return priceMap
}

async function loadAdminMarmistaPriceOptions(
  prisma: PrismaClientLike,
  articleIds: string[],
): Promise<Map<string, PublicCoffinPriceOption[]>> {
  const articleIdSet = new Set(articleIds)
  const priceLists = await prisma.priceList.findMany({
    where: { articleType: 'marmista', type: 'sale' },
    select: { id: true, name: true, type: true },
    orderBy: { name: 'asc' },
  })

  const computedByList = await Promise.all(
    priceLists.map(async (priceList) => {
      const tree = await loadPriceListTree(prisma, priceList.id)
      if (!tree) return null
      const computedItems = await buildComputedItems(prisma, tree)
      return { priceList, computedItems }
    }),
  )

  const priceMap = new Map<string, PublicCoffinPriceOption[]>()

  for (const result of computedByList) {
    if (!result) continue
    for (const item of result.computedItems) {
      if (!item.marmistaArticleId || !articleIdSet.has(item.marmistaArticleId)) continue
      const options = priceMap.get(item.marmistaArticleId) ?? []
      options.push({
        priceListId: result.priceList.id,
        priceListName: result.priceList.name,
        priceListType: result.priceList.type,
        price: item.computedPrice,
      })
      priceMap.set(item.marmistaArticleId, options)
    }
  }

  return priceMap
}

async function loadAssignedMarmistaPrice(
  prisma: PublicPricePrisma,
  userId: string,
  articleIds: string[],
): Promise<Map<string, number>> {
  const articleIdSet = new Set(articleIds)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { marmistaPriceListId: true },
  })

  if (!user?.marmistaPriceListId) return new Map<string, number>()

  const tree = await loadPriceListTree(prisma, user.marmistaPriceListId)
  if (!tree) return new Map<string, number>()

  const computedItems = await buildComputedItems(prisma, tree)
  const priceMap = new Map<string, number>()

  for (const item of computedItems) {
    if (!item.marmistaArticleId || !articleIdSet.has(item.marmistaArticleId)) continue
    priceMap.set(item.marmistaArticleId, item.computedPrice)
  }

  return priceMap
}

async function loadAdminAccessoryPriceOptions(
  prisma: PrismaClientLike,
  articleIds: string[],
): Promise<Map<string, PublicCoffinPriceOption[]>> {
  const articleIdSet = new Set(articleIds)
  const priceLists = await prisma.priceList.findMany({
    where: { articleType: 'accessories', type: 'sale' },
    select: { id: true, name: true, type: true },
    orderBy: { name: 'asc' },
  })

  const computedByList = await Promise.all(
    priceLists.map(async (priceList) => {
      const tree = await loadPriceListTree(prisma, priceList.id)
      if (!tree) return null
      const computedItems = await buildComputedItems(prisma, tree)
      return { priceList, computedItems }
    }),
  )

  const priceMap = new Map<string, PublicCoffinPriceOption[]>()

  for (const result of computedByList) {
    if (!result) continue
    for (const item of result.computedItems) {
      if (!item.accessoryArticleId || !articleIdSet.has(item.accessoryArticleId)) continue
      const options = priceMap.get(item.accessoryArticleId) ?? []
      options.push({
        priceListId: result.priceList.id,
        priceListName: result.priceList.name,
        priceListType: result.priceList.type,
        price: item.computedPrice,
      })
      priceMap.set(item.accessoryArticleId, options)
    }
  }

  return priceMap
}

// ─── Routes ──────────────────────────────────────────────────────────────────

const publicRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Health ────────────────────────────────────────────────────────────────

  fastify.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // ── Coffins ───────────────────────────────────────────────────────────────

  fastify.get('/coffins', async (request, reply) => {
    const queryRaw = request.query as Record<string, unknown>
    const parsed = paginationSchema.extend({
      category: z.string().optional(),
      search: z.string().optional(),
    }).safeParse(queryRaw)

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Parametri di query non validi',
        statusCode: 400,
      })
    }

    const { page, limit, category, search } = parsed.data
    const skip = (page - 1) * limit

    const where = {
      ...(category ? { categories: { some: { code: category } } } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [total, articles] = await Promise.all([
      fastify.prisma.coffinArticle.count({ where }),
      fastify.prisma.coffinArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          description: true,
          notes: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
          categories: { select: { id: true, code: true, label: true } },
          subcategories: { select: { id: true, code: true, label: true } },
          essences: { select: { id: true, code: true, label: true } },
          figures: { select: { id: true, code: true, label: true } },
          colors: { select: { id: true, code: true, label: true } },
          finishes: { select: { id: true, code: true, label: true } },
        },
      }),
    ])

    const userId = getSessionUserId(request as { session?: SessionLike })
    const articleIds = articles.map((article) => article.id)
    const roles = userId ? await loadSessionRoles(fastify.prisma as unknown as PublicRolePrisma, userId) : []

    let assignedPriceMap = new Map<string, number>()
    let adminPriceOptionsMap = new Map<string, PublicCoffinPriceOption[]>()

    if (articleIds.length > 0) {
      if (canSeeAdminFuneralPrices(roles)) {
        adminPriceOptionsMap = await loadAdminFuneralPriceOptions(
          fastify.prisma as unknown as PublicPricePrisma,
          articleIds,
        )
      } else if (roles.includes('impresario_funebre') && userId) {
        assignedPriceMap = await loadAssignedFuneralPriceMap(
          fastify.prisma as unknown as PublicPricePrisma,
          userId,
          articleIds,
        )
      }
    }

    return reply.send({
      data: articles.map((article) => ({
        ...article,
        ...(roles.includes('impresario_funebre')
          ? { price: assignedPriceMap.get(article.id) ?? null }
          : {}),
        ...(canSeeAdminFuneralPrices(roles)
          ? { priceOptions: adminPriceOptionsMap.get(article.id) ?? [] }
          : {}),
      })),
      pagination: buildPagination(page, limit, total),
    })
  })

  fastify.get<{ Params: { id: string } }>('/coffins/:id', async (request, reply) => {
    const { id } = request.params

    const article = await fastify.prisma.coffinArticle.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        description: true,
        notes: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        categories: { select: { id: true, code: true, label: true } },
        subcategories: { select: { id: true, code: true, label: true } },
        essences: { select: { id: true, code: true, label: true } },
        figures: { select: { id: true, code: true, label: true } },
        colors: { select: { id: true, code: true, label: true } },
        finishes: { select: { id: true, code: true, label: true } },
        measure: {
          select: {
            id: true,
            head: true,
            feet: true,
            shoulder: true,
            height: true,
            width: true,
            depth: true,
          },
        },
      },
    })

    if (!article) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Cofano non trovato',
        statusCode: 404,
      })
    }

    return reply.send(article)
  })

  // ── Accessories ───────────────────────────────────────────────────────────

  fastify.get('/accessories', async (request, reply) => {
    const queryRaw = request.query as Record<string, unknown>
    const parsed = paginationSchema.extend({
      category: z.string().optional(),
      search: z.string().optional(),
    }).safeParse(queryRaw)

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Parametri di query non validi',
        statusCode: 400,
      })
    }

    const { page, limit, category, search } = parsed.data
    const skip = (page - 1) * limit

    const where = {
      ...(category ? { categories: { some: { code: category } } } : {}),
      ...(search ? {
        OR: [
          { code: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    }

    const [total, articles] = await Promise.all([
      fastify.prisma.accessoryArticle.count({ where }),
      fastify.prisma.accessoryArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          description: true,
          notes: true,
          imageUrl: true,
          pdfPage: true,
          createdAt: true,
          updatedAt: true,
          categories: { select: { id: true, code: true, label: true } },
          subcategories: { select: { id: true, code: true, label: true } },
        },
      }),
    ])

    const userId = getSessionUserId(request as { session?: SessionLike })
    const articleIds = articles.map((a) => a.id)
    const roles = userId ? await loadSessionRoles(fastify.prisma as unknown as PublicRolePrisma, userId) : []

    let assignedPriceMap = new Map<string, number>()
    let adminPriceOptionsMap = new Map<string, PublicCoffinPriceOption[]>()

    if (articleIds.length > 0) {
      if (canSeeAdminFuneralPrices(roles)) {
        adminPriceOptionsMap = await loadAdminAccessoryPriceOptions(
          fastify.prisma as unknown as PrismaClientLike,
          articleIds,
        )
      } else if (roles.includes('impresario_funebre') && userId) {
        assignedPriceMap = await loadAssignedAccessoryPriceMap(
          fastify.prisma as unknown as PublicPricePrisma,
          userId,
          articleIds,
        )
      }
    }

    return reply.send({
      data: articles.map((article) => ({
        ...article,
        ...(roles.includes('impresario_funebre')
          ? { price: assignedPriceMap.get(article.id) ?? null }
          : {}),
        ...(canSeeAdminFuneralPrices(roles)
          ? { priceOptions: adminPriceOptionsMap.get(article.id) ?? [] }
          : {}),
      })),
      pagination: buildPagination(page, limit, total),
    })
  })

  fastify.get<{ Params: { id: string } }>('/accessories/:id', async (request, reply) => {
    const { id } = request.params

    const article = await fastify.prisma.accessoryArticle.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        description: true,
        notes: true,
        imageUrl: true,
        pdfPage: true,
        createdAt: true,
        updatedAt: true,
        categories: { select: { id: true, code: true, label: true } },
        subcategories: { select: { id: true, code: true, label: true } },
      },
    })

    if (!article) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Accessorio non trovato',
        statusCode: 404,
      })
    }

    return reply.send(article)
  })

  // ── Marmista ──────────────────────────────────────────────────────────────

  fastify.get('/marmista', async (request, reply) => {
    const queryRaw = request.query as Record<string, unknown>
    const parsed = paginationSchema.extend({
      category: z.string().optional(),
    }).safeParse(queryRaw)

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Parametri di query non validi',
        statusCode: 400,
      })
    }

    const { page, limit, category } = parsed.data
    const skip = (page - 1) * limit

    const where = category
      ? { categories: { some: { code: category } } }
      : {}

    const [total, articles] = await Promise.all([
      fastify.prisma.marmistaArticle.count({ where }),
      fastify.prisma.marmistaArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          description: true,
          notes: true,
          pdfPage: true,
          publicPrice: true,
          createdAt: true,
          updatedAt: true,
          categories: { select: { id: true, code: true, label: true } },
        },
      }),
    ])

    const userId = getSessionUserId(request as { session?: SessionLike })
    const articleIds = articles.map((a) => a.id)
    const roles = userId ? await loadSessionRoles(fastify.prisma as unknown as PublicRolePrisma, userId) : []

    let assignedPriceMap = new Map<string, number>()
    let adminPriceOptionsMap = new Map<string, PublicCoffinPriceOption[]>()

    if (articleIds.length > 0) {
      if (canSeeAdminFuneralPrices(roles)) {
        adminPriceOptionsMap = await loadAdminMarmistaPriceOptions(
          fastify.prisma as unknown as PrismaClientLike,
          articleIds,
        )
      } else if (roles.includes('marmista') && userId) {
        assignedPriceMap = await loadAssignedMarmistaPrice(
          fastify.prisma as unknown as PublicPricePrisma,
          userId,
          articleIds,
        )
      }
    }

    return reply.send({
      data: articles.map((article) => ({
        ...article,
        ...(roles.includes('marmista')
          ? { price: assignedPriceMap.get(article.id) ?? null }
          : {}),
        ...(canSeeAdminFuneralPrices(roles)
          ? { priceOptions: adminPriceOptionsMap.get(article.id) ?? [] }
          : {}),
      })),
      pagination: buildPagination(page, limit, total),
    })
  })

  fastify.get<{ Params: { id: string } }>('/marmista/:id', async (request, reply) => {
    const { id } = request.params

    const article = await fastify.prisma.marmistaArticle.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        description: true,
        notes: true,
        pdfPage: true,
        publicPrice: true,
        createdAt: true,
        updatedAt: true,
        categories: { select: { id: true, code: true, label: true } },
        accessories: {
          select: {
            id: true,
            code: true,
            description: true,
            publicPrice: true,
          },
        },
      },
    })

    if (!article) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Articolo marmista non trovato',
        statusCode: 404,
      })
    }

    return reply.send(article)
  })

  // ── Ceabis (AccessoryArticle per la categoria ceabis) ─────────────────────
  // Ceabis sono accessori funebri — stessa struttura di AccessoryArticle.
  // Distinzione per categoria: code = 'CEABI' (o simile, filtro configurabile).
  // Se non c'è ancora una categoria dedicata nel DB, tutti gli AccessoryArticle
  // vengono restituiti (stesso comportamento di /accessories).

  const CEABIS_CATEGORY = process.env.CEABIS_CATEGORY_CODE ?? 'CEABI'

  fastify.get('/ceabis', async (request, reply) => {
    const queryRaw = request.query as Record<string, unknown>
    const parsed = paginationSchema.extend({
      category: z.string().optional(),
    }).safeParse(queryRaw)

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Parametri di query non validi',
        statusCode: 400,
      })
    }

    const { page, limit, category } = parsed.data
    const skip = (page - 1) * limit

    // Filtra prima per la categoria ceabis, poi eventualmente per sotto-categoria
    const where = {
      categories: {
        some: { code: category ?? CEABIS_CATEGORY },
      },
    }

    const [total, articles] = await Promise.all([
      fastify.prisma.accessoryArticle.count({ where }),
      fastify.prisma.accessoryArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          description: true,
          notes: true,
          imageUrl: true,
          pdfPage: true,
          createdAt: true,
          updatedAt: true,
          categories: { select: { id: true, code: true, label: true } },
          subcategories: { select: { id: true, code: true, label: true } },
        },
      }),
    ])

    return reply.send({
      data: articles,
      pagination: buildPagination(page, limit, total),
    })
  })

  fastify.get<{ Params: { id: string } }>('/ceabis/:id', async (request, reply) => {
    const { id } = request.params

    const article = await fastify.prisma.accessoryArticle.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        description: true,
        notes: true,
        imageUrl: true,
        pdfPage: true,
        createdAt: true,
        updatedAt: true,
        categories: { select: { id: true, code: true, label: true } },
        subcategories: { select: { id: true, code: true, label: true } },
      },
    })

    if (!article) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Articolo ceabi non trovato',
        statusCode: 404,
      })
    }

    return reply.send(article)
  })

  // ── Catalog PDF layout pubblico ───────────────────────────────────────────

  fastify.get<{ Params: { type: string } }>('/catalog/:type/layout', async (request, reply) => {
    const CATALOG_TYPES = ['accessories', 'marmista'] as const
    const typeParsed = z.enum(CATALOG_TYPES).safeParse(request.params.type)
    if (!typeParsed.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: `Tipo catalogo non valido. Valori accettati: ${CATALOG_TYPES.join(', ')}`,
        statusCode: 400,
      })
    }

    const catalog = await fastify.prisma.pdfCatalog.findUnique({
      where: { type: typeParsed.data },
    })

    if (!catalog || catalog.totalPdfPages === null || catalog.pagesSlug === null) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Catalogo non disponibile',
        statusCode: 404,
      })
    }

    const payload: CatalogLayoutPublic = {
      type: catalog.type as 'accessories' | 'marmista',
      slug: catalog.pagesSlug,
      totalPdfPages: catalog.totalPdfPages,
      layout: {
        offset: catalog.layoutOffset,
        firstPageType: catalog.firstPageType as 'single' | 'double',
        bodyPageType: catalog.bodyPageType as 'single' | 'double',
        lastPageType: catalog.lastPageType as 'single' | 'double',
      },
    }

    return reply.send(payload)
  })

  // ── Contact ───────────────────────────────────────────────────────────────

  fastify.post(
    '/contact',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 hour',
        },
      },
    },
    async (request, reply) => {
      const parsed = contactSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dati del modulo non validi',
          statusCode: 422,
          issues: parsed.error.errors,
        })
      }

      try {
        await sendContactEmail(parsed.data)
        return reply.status(200).send({ success: true })
      } catch (err) {
        fastify.log.error({ err }, 'Errore invio email contatto')
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Errore durante l\'invio del messaggio',
          statusCode: 500,
        })
      }
    }
  )

  // ── Branding ──────────────────────────────────────────────────────────────

  fastify.get('/branding/logo', async (_req, reply) => {
    return reply.send({ url: findLogoUrl() })
  })

}

export default publicRoutes

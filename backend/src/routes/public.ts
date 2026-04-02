import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { sendContactEmail } from '../lib/mailer'

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

    return reply.send({
      data: articles,
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

    return reply.send({
      data: articles,
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
}

export default publicRoutes

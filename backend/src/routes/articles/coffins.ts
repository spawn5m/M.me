import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { pipeline } from 'stream/promises'
import * as fs from 'fs'
import * as path from 'path'
import { parseExcelFile, splitCodes, validateImagePath } from '../../lib/excelImporter'
import type { ImportResult } from '../../types/shared'

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
  fastify.get<{ Querystring: { page?: string; pageSize?: string; search?: string; category?: string } }>('/', async (req) => {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10))
    const pageSize = Math.min(500, Math.max(1, parseInt(req.query.pageSize ?? '50', 10)))
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

  // POST /import — importa da Excel
  fastify.post('/import', async (req, reply) => {
    const data = await req.file()
    if (!data) {
      return reply.status(400).send({ error: 'BadRequest', message: 'File mancante', statusCode: 400 })
    }

    const tmpPath = `/tmp/import_coffins_${Date.now()}.xlsx`
    await pipeline(data.file, fs.createWriteStream(tmpPath))

    const rows = parseExcelFile(tmpPath)
    const result: ImportResult = { imported: 0, skipped: 0, errors: [], warnings: [] }
    const uploadsRoot = path.join(process.cwd(), '..', 'uploads', 'images')

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      if (!row.codice) {
        result.errors.push({ row: rowNum, code: '', reason: 'Colonna codice mancante' })
        continue
      }
      try {
        const categoryResult = await resolveCodes(fastify.prisma.coffinCategory, splitCodes(row.categorie ?? ''))
        if (categoryResult.missing.length) {
          result.skipped++
          result.errors.push({ row: rowNum, code: row.codice, reason: `Categorie non trovate: ${categoryResult.missing.join(', ')}` })
          continue
        }
        const subcategoryResult = await resolveCodes(fastify.prisma.coffinSubcategory, splitCodes(row.sottocategorie ?? ''))
        const essenceResult = await resolveCodes(fastify.prisma.essence, splitCodes(row.essenze ?? ''))
        const figureResult = await resolveCodes(fastify.prisma.figure, splitCodes(row.figure ?? ''))
        const colorResult = await resolveCodes(fastify.prisma.color, splitCodes(row.colori ?? ''))
        const finishResult = await resolveCodes(fastify.prisma.finish, splitCodes(row.finiture ?? ''))

        let imageUrl: string | null = null
        if (row.immagine) {
          imageUrl = validateImagePath(row.immagine, uploadsRoot)
          if (!imageUrl) {
            result.warnings.push({ row: rowNum, code: row.codice, reason: `Immagine non trovata: ${row.immagine}` })
          }
        }

        await fastify.prisma.coffinArticle.upsert({
          where: { code: row.codice },
          create: {
            code: row.codice,
            description: row.descrizione ?? '',
            notes: row.note || null,
            imageUrl,
            categories: { connect: categoryResult.ids.map(id => ({ id })) },
            subcategories: { connect: subcategoryResult.ids.map(id => ({ id })) },
            essences: { connect: essenceResult.ids.map(id => ({ id })) },
            figures: { connect: figureResult.ids.map(id => ({ id })) },
            colors: { connect: colorResult.ids.map(id => ({ id })) },
            finishes: { connect: finishResult.ids.map(id => ({ id })) },
          },
          update: {
            description: row.descrizione ?? '',
            notes: row.note || null,
            imageUrl,
            categories: { set: categoryResult.ids.map(id => ({ id })) },
            subcategories: { set: subcategoryResult.ids.map(id => ({ id })) },
            essences: { set: essenceResult.ids.map(id => ({ id })) },
            figures: { set: figureResult.ids.map(id => ({ id })) },
            colors: { set: colorResult.ids.map(id => ({ id })) },
            finishes: { set: finishResult.ids.map(id => ({ id })) },
          },
        })
        result.imported++
      } catch (e) {
        result.errors.push({ row: rowNum, code: row.codice, reason: String(e) })
      }
    }

    fs.unlinkSync(tmpPath)
    return result
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveCodes(model: any, codes: string[]): Promise<{ ids: string[]; missing: string[] }> {
  if (!codes.length) return { ids: [], missing: [] }
  const found = await model.findMany({ where: { code: { in: codes } } })
  const foundCodes = found.map((f: { code: string }) => f.code)
  return {
    ids: found.map((f: { id: string }) => f.id),
    missing: codes.filter(c => !foundCodes.includes(c)),
  }
}

export default coffinsRoutes

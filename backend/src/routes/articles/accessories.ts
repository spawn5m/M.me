import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { pipeline } from 'stream/promises'
import * as fs from 'fs'
import * as path from 'path'
import { parseExcelFile, splitCodes, validateImagePath } from '../../lib/excelImporter'
import type { ImportResult } from '../../types/shared'

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
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  fastify.get<{ Querystring: { page?: string; pageSize?: string; search?: string } }>('/', {
    preHandler: [fastify.checkPermission('articles.accessories.read')]
  }, async (req) => {
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
      fastify.prisma.accessoryArticle.findMany({
        where, include: INCLUDE, orderBy: { code: 'asc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      fastify.prisma.accessoryArticle.count({ where }),
    ])
    return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
  })

  fastify.post<{ Body: z.infer<typeof bodySchema> }>('/', {
    preHandler: [fastify.checkPermission('articles.accessories.write')]
  }, async (req, reply) => {
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

  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.checkPermission('articles.accessories.read')]
  }, async (req, reply) => {
    const item = await fastify.prisma.accessoryArticle.findUnique({ where: { id: req.params.id }, include: INCLUDE })
    if (!item) return reply.status(404).send({ error: 'NotFound', message: 'Articolo non trovato', statusCode: 404 })
    return item
  })

  fastify.put<{ Params: { id: string }; Body: z.infer<typeof bodySchema> }>('/:id', {
    preHandler: [fastify.checkPermission('articles.accessories.write')]
  }, async (req, reply) => {
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

  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.checkPermission('articles.accessories.delete')]
  }, async (req, reply) => {
    await fastify.prisma.accessoryArticle.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })

  fastify.post('/import', {
    preHandler: [fastify.checkPermission('articles.accessories.import')]
  }, async (req, reply) => {
    const data = await req.file()
    if (!data) {
      return reply.status(400).send({ error: 'BadRequest', message: 'File mancante', statusCode: 400 })
    }

    const tmpPath = `/tmp/import_accessories_${Date.now()}.xlsx`
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
        const categoryResult = await resolveCodes(fastify.prisma.accessoryCategory, splitCodes(row.categorie ?? ''))
        if (categoryResult.missing.length) {
          result.skipped++
          result.errors.push({ row: rowNum, code: row.codice, reason: `Categorie non trovate: ${categoryResult.missing.join(', ')}` })
          continue
        }

        const subcategoryResult = await resolveCodes(fastify.prisma.accessorySubcategory, splitCodes(row.sottocategorie ?? ''))
        if (subcategoryResult.missing.length) {
          result.skipped++
          result.errors.push({ row: rowNum, code: row.codice, reason: `Sottocategorie non trovate: ${subcategoryResult.missing.join(', ')}` })
          continue
        }

        let imageUrl: string | null = null
        if (row.immagine) {
          imageUrl = validateImagePath(row.immagine, uploadsRoot)
          if (!imageUrl) {
            result.warnings.push({ row: rowNum, code: row.codice, reason: `Immagine non trovata: ${row.immagine}` })
          }
        }

        await fastify.prisma.accessoryArticle.upsert({
          where: { code: row.codice },
          create: {
            code: row.codice,
            description: row.descrizione ?? '',
            notes: row.note || null,
            imageUrl,
            pdfPage: row.pagina_pdf ? parseInt(String(row.pagina_pdf), 10) : null,
            categories: { connect: categoryResult.ids.map((id) => ({ id })) },
            subcategories: { connect: subcategoryResult.ids.map((id) => ({ id })) },
          },
          update: {
            description: row.descrizione ?? '',
            notes: row.note || null,
            imageUrl,
            pdfPage: row.pagina_pdf ? parseInt(String(row.pagina_pdf), 10) : null,
            categories: { set: categoryResult.ids.map((id) => ({ id })) },
            subcategories: { set: subcategoryResult.ids.map((id) => ({ id })) },
          },
        })

        result.imported++
      } catch (error) {
        result.errors.push({ row: rowNum, code: row.codice, reason: String(error) })
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
  const foundCodes = found.map((item: { code: string }) => item.code)

  return {
    ids: found.map((item: { id: string }) => item.id),
    missing: codes.filter((code) => !foundCodes.includes(code)),
  }
}

export default accessoriesRoutes

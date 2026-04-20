import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { pipeline } from 'stream/promises'
import * as fs from 'fs'
import * as XLSX from 'xlsx'
import { parseExcelFile, splitCodes } from '../../lib/excelImporter'
import type { ImportResult } from '../../types/shared'

const bodySchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  notes: z.string().optional().nullable(),
  pdfPage: z.number().int().optional().nullable(),
  publicPrice: z.number().optional().nullable(),
  color: z.boolean().optional().default(false),
  accessoryId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional().default([]),
})

const INCLUDE = {
  categories: { select: { id: true, code: true, label: true } },
  accessory: { select: { id: true, code: true, description: true } },
}

const marmistaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  fastify.get<{ Querystring: { page?: string; pageSize?: string; search?: string } }>('/', {
    preHandler: [fastify.checkPermission('articles.marmista.read')]
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
      fastify.prisma.marmistaArticle.findMany({
        where, include: INCLUDE, orderBy: { code: 'asc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      fastify.prisma.marmistaArticle.count({ where }),
    ])
    return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
  })

  fastify.post<{ Body: z.infer<typeof bodySchema> }>('/', {
    preHandler: [fastify.checkPermission('articles.marmista.write')]
  }, async (req, reply) => {
    const { categoryIds, accessoryId, ...rest } = bodySchema.parse(req.body)
    const item = await fastify.prisma.marmistaArticle.create({
      data: {
        ...rest,
        ...(accessoryId ? { accessory: { connect: { id: accessoryId } } } : {}),
        categories: { connect: categoryIds.map(id => ({ id })) },
      },
      include: INCLUDE,
    })
    return reply.status(201).send(item)
  })

  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.checkPermission('articles.marmista.read')]
  }, async (req, reply) => {
    const item = await fastify.prisma.marmistaArticle.findUnique({ where: { id: req.params.id }, include: INCLUDE })
    if (!item) return reply.status(404).send({ error: 'NotFound', message: 'Articolo non trovato', statusCode: 404 })
    return item
  })

  fastify.put<{ Params: { id: string }; Body: z.infer<typeof bodySchema> }>('/:id', {
    preHandler: [fastify.checkPermission('articles.marmista.write')]
  }, async (req, reply) => {
    const { categoryIds, accessoryId, ...rest } = bodySchema.parse(req.body)
    const item = await fastify.prisma.marmistaArticle.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        accessory: accessoryId ? { connect: { id: accessoryId } } : { disconnect: true },
        categories: { set: categoryIds.map(id => ({ id })) },
      },
      include: INCLUDE,
    })
    return item
  })

  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: [fastify.checkPermission('articles.marmista.delete')]
  }, async (req, reply) => {
    await fastify.prisma.marmistaArticle.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })

  fastify.delete('/', {
    preHandler: [fastify.checkPermission('articles.marmista.delete')]
  }, async (_req, reply) => {
    await fastify.prisma.marmistaArticle.deleteMany({})
    return reply.status(204).send()
  })

  fastify.post('/import', {
    preHandler: [fastify.checkPermission('articles.marmista.import')]
  }, async (req, reply) => {
    const data = await req.file()
    if (!data) {
      return reply.status(400).send({ error: 'BadRequest', message: 'File mancante', statusCode: 400 })
    }

    const tmpPath = `/tmp/import_marmista_${Date.now()}.xlsx`
    await pipeline(data.file, fs.createWriteStream(tmpPath))

    const rows = parseExcelFile(tmpPath)
    const result: ImportResult = { imported: 0, skipped: 0, errors: [], warnings: [] }

    // Passata 1: upsert tutti gli articoli senza relazione accessorio
    const validRows: Array<{ row: typeof rows[number]; rowNum: number }> = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      if (!row.codice) {
        result.errors.push({ row: rowNum, code: '', reason: 'Colonna codice mancante' })
        continue
      }

      try {
        const categoryResult = await resolveCodes(fastify.prisma.marmistaCategory, splitCodes(row.categorie ?? ''))
        if (categoryResult.missing.length) {
          result.skipped++
          result.errors.push({ row: rowNum, code: row.codice, reason: `Categorie non trovate: ${categoryResult.missing.join(', ')}` })
          continue
        }

        const colorRaw = row.colore ?? row.color ?? row.COLOR ?? row.COLORE
        const colorVal = colorRaw !== undefined && colorRaw !== ''
          ? String(colorRaw).toLowerCase() === 'true' || String(colorRaw) === '1'
          : false

        await fastify.prisma.marmistaArticle.upsert({
          where: { code: row.codice },
          create: {
            code: row.codice,
            description: row.descrizione ?? '',
            notes: row.note || null,
            pdfPage: row.pagina_pdf ? parseInt(String(row.pagina_pdf), 10) : null,
            publicPrice: row.prezzo_pubblico ? parseFloat(String(row.prezzo_pubblico)) : null,
            color: colorVal,
            categories: { connect: categoryResult.ids.map((id) => ({ id })) },
          },
          update: {
            description: row.descrizione ?? '',
            notes: row.note || null,
            pdfPage: row.pagina_pdf ? parseInt(String(row.pagina_pdf), 10) : null,
            publicPrice: row.prezzo_pubblico ? parseFloat(String(row.prezzo_pubblico)) : null,
            color: colorVal,
            categories: { set: categoryResult.ids.map((id) => ({ id })) },
          },
        })

        result.imported++
        if (row.accessorio_id) validRows.push({ row, rowNum })
      } catch (error) {
        result.errors.push({ row: rowNum, code: row.codice, reason: String(error) })
      }
    }

    // Passata 2: aggiorna relazioni accessorio ora che tutti gli articoli esistono
    for (const { row, rowNum } of validRows) {
      try {
        const accessory = await fastify.prisma.marmistaArticle.findUnique({ where: { code: row.accessorio_id } })
        if (!accessory) {
          result.warnings.push({ row: rowNum, code: row.codice, reason: `Accessorio non trovato: ${row.accessorio_id}` })
          continue
        }
        await fastify.prisma.marmistaArticle.update({
          where: { code: row.codice },
          data: { accessory: { connect: { id: accessory.id } } },
        })
      } catch (error) {
        result.warnings.push({ row: rowNum, code: row.codice, reason: `Errore accessorio: ${String(error)}` })
      }
    }

    fs.unlinkSync(tmpPath)
    return result
  })

  // GET /import-template
  fastify.get('/import-template', {
    preHandler: [fastify.checkPermission('articles.marmista.import')]
  }, async (_req, reply) => {
    const headers = ['codice', 'descrizione', 'note', 'prezzo_pubblico', 'categorie', 'pagina_pdf', 'accessorio_id', 'colore']
    const ws = XLSX.utils.aoa_to_sheet([headers])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Marmisti')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="template-marmisti.xlsx"')
      .send(buffer)
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

export default marmistaRoutes

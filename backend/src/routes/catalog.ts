import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { pipeline } from 'stream/promises'
import * as fs from 'fs'
import * as path from 'path'
import { PDF_MAX_FILE_SIZE_BYTES, PDF_MAX_FILE_SIZE_MB } from '../lib/multipart'
import { slugify, countSplitPages, deleteSlugPages, runSplit } from '../lib/splitPdfService'
import type { CatalogStatus } from '../types/shared'

const UPLOADS_PDF = path.resolve(process.cwd(), '..', 'uploads', 'pdf')

const CATALOG_TYPES = ['accessories', 'marmista'] as const

const typeParamSchema = z.enum(CATALOG_TYPES)

const layoutSchema = z.object({
  layoutOffset: z.number().int().min(0),
  firstPageType: z.enum(['single', 'double']),
  bodyPageType: z.enum(['single', 'double']),
  lastPageType: z.enum(['single', 'double']),
})

function toCatalogStatus(
  catalog: {
    type: string
    fileName: string
    uploadedAt: Date
    totalPdfPages: number | null
    pagesSlug: string | null
    layoutOffset: number
    firstPageType: string
    bodyPageType: string
    lastPageType: string
  },
): CatalogStatus {
  const slug = catalog.pagesSlug ?? slugify(catalog.fileName)
  const splitPages = countSplitPages(slug)
  const totalPdfPages = catalog.totalPdfPages ?? null
  return {
    type: catalog.type as 'accessories' | 'marmista',
    fileName: catalog.fileName,
    uploadedAt: catalog.uploadedAt.toISOString(),
    totalPdfPages,
    splitPages,
    isComplete: totalPdfPages !== null && splitPages === totalPdfPages,
    slug,
    layout: {
      offset: catalog.layoutOffset,
      firstPageType: catalog.firstPageType as 'single' | 'double',
      bodyPageType: catalog.bodyPageType as 'single' | 'double',
      lastPageType: catalog.lastPageType as 'single' | 'double',
    },
  }
}

const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  // GET / — lista cataloghi con stato split
  fastify.get('/', {
    preHandler: [fastify.checkPermission('catalog.pdf.read')],
  }, async (_req, reply) => {
    const catalogs = await fastify.prisma.pdfCatalog.findMany({
      orderBy: { uploadedAt: 'desc' },
    })
    const data: CatalogStatus[] = catalogs.map(toCatalogStatus)
    return reply.send({ data })
  })

  // POST / — carica PDF + configurazione layout, avvia split in background
  fastify.post('/', {
    preHandler: [fastify.checkPermission('catalog.pdf.write')],
  }, async (req, reply) => {
    const parts = req.parts({ limits: { fileSize: PDF_MAX_FILE_SIZE_BYTES } })

    const fields: Record<string, string> = {}
    let tmpPath: string | null = null
    let savedFileName: string | null = null
    let fileMimetype: string | null = null
    let fileTruncated = false

    // Consuma tutti i parts: salva file in tmp, raccoglie campi
    fs.mkdirSync(UPLOADS_PDF, { recursive: true })

    for await (const part of parts) {
      if (part.type === 'file') {
        const tmp = path.join(UPLOADS_PDF, `tmp-${Date.now()}.pdf`)
        try {
          await pipeline(part.file, fs.createWriteStream(tmp))
        } catch (err) {
          fs.rmSync(tmp, { force: true })
          throw err
        }
        tmpPath = tmp
        savedFileName = part.filename
        fileMimetype = part.mimetype
        fileTruncated = part.file.truncated
      } else {
        fields[part.fieldname] = part.value as string
      }
    }

    if (!tmpPath || !savedFileName) {
      return reply.status(400).send({ error: 'BadRequest', message: 'File PDF mancante', statusCode: 400 })
    }

    // Valida tipo MIME
    if (fileMimetype !== 'application/pdf') {
      fs.rmSync(tmpPath, { force: true })
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Solo file PDF sono accettati.',
        statusCode: 400,
      })
    }

    // Valida dimensione
    if (fileTruncated) {
      fs.rmSync(tmpPath, { force: true })
      return reply.status(413).send({
        error: 'FileTooLarge',
        message: `Il file supera il limite di ${PDF_MAX_FILE_SIZE_MB} MB.`,
        statusCode: 413,
      })
    }

    // Valida tipo catalogo
    const typeParsed = typeParamSchema.safeParse(fields.type)
    if (!typeParsed.success) {
      fs.rmSync(tmpPath, { force: true })
      return reply.status(400).send({
        error: 'BadRequest',
        message: `Tipo catalogo non valido. Valori accettati: ${CATALOG_TYPES.join(', ')}`,
        statusCode: 400,
      })
    }

    // Valida layout
    const layoutParsed = layoutSchema.safeParse({
      layoutOffset: Number(fields.layoutOffset ?? '0'),
      firstPageType: fields.firstPageType ?? 'single',
      bodyPageType: fields.bodyPageType ?? 'double',
      lastPageType: fields.lastPageType ?? 'single',
    })
    if (!layoutParsed.success) {
      fs.rmSync(tmpPath, { force: true })
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Parametri layout non validi.',
        statusCode: 400,
      })
    }

    const catalogType = typeParsed.data
    const layout = layoutParsed.data
    const slug = slugify(savedFileName)

    // Pulisci vecchio catalogo se esiste
    const existing = await fastify.prisma.pdfCatalog.findUnique({
      where: { type: catalogType },
    })
    if (existing) {
      if (existing.pagesSlug) deleteSlugPages(existing.pagesSlug)
      if (existing.filePath && fs.existsSync(existing.filePath)) {
        fs.rmSync(existing.filePath, { force: true })
      }
    }

    // Sposta file tmp nella destinazione finale
    const filePath = path.join(UPLOADS_PDF, `${catalogType}-${Date.now()}.pdf`)
    fs.renameSync(tmpPath, filePath)

    // Upsert DB
    const catalog = await fastify.prisma.pdfCatalog.upsert({
      where: { type: catalogType },
      update: {
        filePath,
        fileName: savedFileName,
        uploadedAt: new Date(),
        layoutOffset: layout.layoutOffset,
        firstPageType: layout.firstPageType,
        bodyPageType: layout.bodyPageType,
        lastPageType: layout.lastPageType,
        totalPdfPages: null,
        pagesSlug: slug,
      },
      create: {
        type: catalogType,
        filePath,
        fileName: savedFileName,
        layoutOffset: layout.layoutOffset,
        firstPageType: layout.firstPageType,
        bodyPageType: layout.bodyPageType,
        lastPageType: layout.lastPageType,
        pagesSlug: slug,
      },
    })

    // Avvia split in background (fire-and-forget)
    runSplit({
      catalogId: catalog.id,
      filePath,
      slug,
      prisma: fastify.prisma,
      log: req.log,
    }).catch((err: unknown) => {
      req.log.error({ err, catalogId: catalog.id }, 'Errore durante split PDF')
    })

    return reply.status(202).send(toCatalogStatus(catalog))
  })

  // GET /:type/status — polling stato split
  fastify.get<{ Params: { type: string } }>('/:type/status', {
    preHandler: [fastify.checkPermission('catalog.pdf.read')],
  }, async (req, reply) => {
    const typeParsed = typeParamSchema.safeParse(req.params.type)
    if (!typeParsed.success) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: `Tipo catalogo non valido. Valori accettati: ${CATALOG_TYPES.join(', ')}`,
        statusCode: 400,
      })
    }

    const catalog = await fastify.prisma.pdfCatalog.findUnique({
      where: { type: typeParsed.data },
    })
    if (!catalog) {
      return reply.status(404).send({ error: 'NotFound', message: 'Catalogo non trovato', statusCode: 404 })
    }

    return reply.send(toCatalogStatus(catalog))
  })

  // PUT /:type/layout — aggiorna layout senza re-upload
  fastify.put<{ Params: { type: string } }>('/:type/layout', {
    preHandler: [fastify.checkPermission('catalog.pdf.write')],
  }, async (req, reply) => {
    const typeParsed = typeParamSchema.safeParse(req.params.type)
    if (!typeParsed.success) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: `Tipo catalogo non valido. Valori accettati: ${CATALOG_TYPES.join(', ')}`,
        statusCode: 400,
      })
    }

    const bodyParsed = layoutSchema.safeParse(req.body)
    if (!bodyParsed.success) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Parametri layout non validi.',
        statusCode: 400,
      })
    }

    const catalog = await fastify.prisma.pdfCatalog.findUnique({
      where: { type: typeParsed.data },
    })
    if (!catalog) {
      return reply.status(404).send({ error: 'NotFound', message: 'Catalogo non trovato', statusCode: 404 })
    }

    const updated = await fastify.prisma.pdfCatalog.update({
      where: { type: typeParsed.data },
      data: {
        layoutOffset: bodyParsed.data.layoutOffset,
        firstPageType: bodyParsed.data.firstPageType,
        bodyPageType: bodyParsed.data.bodyPageType,
        lastPageType: bodyParsed.data.lastPageType,
      },
    })

    return reply.send(toCatalogStatus(updated))
  })

  // DELETE /:type — rimuove catalogo e pagine splittate
  fastify.delete<{ Params: { type: string } }>('/:type', {
    preHandler: [fastify.checkPermission('catalog.pdf.write')],
  }, async (req, reply) => {
    const typeParsed = typeParamSchema.safeParse(req.params.type)
    if (!typeParsed.success) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: `Tipo catalogo non valido. Valori accettati: ${CATALOG_TYPES.join(', ')}`,
        statusCode: 400,
      })
    }

    const catalog = await fastify.prisma.pdfCatalog.findUnique({
      where: { type: typeParsed.data },
    })
    if (!catalog) {
      return reply.status(404).send({ error: 'NotFound', message: 'Catalogo non trovato', statusCode: 404 })
    }

    if (catalog.pagesSlug) deleteSlugPages(catalog.pagesSlug)

    if (catalog.filePath && fs.existsSync(catalog.filePath)) {
      fs.rmSync(catalog.filePath, { force: true })
    }

    await fastify.prisma.pdfCatalog.delete({ where: { type: typeParsed.data } })

    return reply.status(204).send()
  })
}

export default catalogRoutes

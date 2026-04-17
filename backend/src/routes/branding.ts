import { FastifyPluginAsync } from 'fastify'
import fs from 'fs'
import path from 'path'
import { UPLOADS_ROOT } from '../lib/paths'
import sharp from 'sharp'

const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const RIFF_BYTES = Buffer.from([0x52, 0x49, 0x46, 0x46])
const WEBP_BYTES = Buffer.from([0x57, 0x45, 0x42, 0x50])

const LOGO_DIR = path.join(UPLOADS_ROOT, 'images', 'logo')
const PNG_MIMES = new Set(['image/png'])
// SVG può arrivare con MIME diversi a seconda del browser/OS
const SVG_MIMES = new Set(['image/svg+xml', 'text/xml', 'text/plain', 'application/xml', 'application/octet-stream'])
const WEBP_MIMES = new Set(['image/webp'])
const ALLOWED_MIMES = new Set([...PNG_MIMES, ...SVG_MIMES, ...WEBP_MIMES])
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const MAX_DIM = 512

const BRANDING_IMG_DIR = path.join(UPLOADS_ROOT, 'images', 'branding')
const VALID_SLOTS = new Set(['home-funebri', 'home-marmisti', 'home-altri', 'storia-narrativa'])
const IMG_ALLOWED_MIMES = new Set([
  'image/png',
  'image/webp',
  'image/svg+xml',
  'text/xml',
  'text/plain',
  'application/xml',
  'application/octet-stream',
])
const IMG_EXTS = ['png', 'webp', 'svg'] as const
const MAX_IMG_SIZE = 5 * 1024 * 1024 // 5 MB

// Dimensioni target e colore di letterbox per slot
// fit: 'contain' → l'intera immagine è visibile, i bordi liberi vengono riempiti con bg
interface SlotSpec {
  w: number
  h: number
  bg: { r: number; g: number; b: number }
}

const SLOT_SPEC: Record<string, SlotSpec> = {
  'home-funebri':     { w: 1920, h: 1280, bg: { r: 7,  g: 19, b: 37 } },  // #071325
  'home-marmisti':    { w: 1920, h: 1280, bg: { r: 7,  g: 19, b: 37 } },
  'home-altri':       { w: 1920, h: 1280, bg: { r: 7,  g: 19, b: 37 } },
  'storia-narrativa': { w: 800,  h: 1000, bg: { r: 26, g: 43, b: 74 } },  // #1A2B4A
}

async function fitToSlot(buf: Buffer, spec: SlotSpec, format: 'png' | 'webp'): Promise<Buffer> {
  const instance = sharp(buf).resize(spec.w, spec.h, {
    fit: 'contain',
    background: { ...spec.bg, alpha: 1 },
  })
  return format === 'webp' ? instance.webp().toBuffer() : instance.png().toBuffer()
}

function deleteExistingSlotImage(slot: string) {
  for (const ext of IMG_EXTS) {
    const p = path.join(BRANDING_IMG_DIR, `${slot}.${ext}`)
    if (fs.existsSync(p)) fs.rmSync(p)
  }
}

/** Legge width e height dall'header IHDR di un PNG (no dipendenze esterne). */
function getPngDimensions(buffer: Buffer): { width: number; height: number } {
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  return { width, height }
}

/** Rimuove tutti i file logo esistenti (logo.png, logo.svg, logo.webp). */
function deleteExistingLogo() {
  for (const base of ['logo.png', 'logo.svg', 'logo.webp']) {
    const p = path.join(LOGO_DIR, base)
    if (fs.existsSync(p)) fs.rmSync(p)
  }
}

const brandingAdminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  // POST /api/admin/branding/logo — carica un nuovo logo
  fastify.post('/logo', {
    preHandler: [fastify.checkPermission('branding.logo.manage')],
  }, async (req, reply) => {
    const data = await req.file()
    if (!data) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Nessun file caricato.', statusCode: 400 })
    }

    const mime = data.mimetype
    const originalName = (data.filename ?? '').toLowerCase()
    const isSvgByExt = originalName.endsWith('.svg')
    const isPngByExt = originalName.endsWith('.png')
    const isWebpByExt = originalName.endsWith('.webp')

    if (!ALLOWED_MIMES.has(mime) && !isSvgByExt && !isPngByExt && !isWebpByExt) {
      data.file.resume()
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Formato non supportato. Usa PNG, WebP o SVG.', statusCode: 400 })
    }

    const chunks: Buffer[] = []
    let totalSize = 0
    for await (const chunk of data.file) {
      totalSize += chunk.length
      if (totalSize > MAX_FILE_SIZE) {
        data.file.resume()
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'File troppo grande (max 2 MB).', statusCode: 400 })
      }
      chunks.push(chunk as Buffer)
    }
    const buffer = Buffer.concat(chunks)

    if (isPngByExt || PNG_MIMES.has(mime)) {
      if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_MAGIC_BYTES)) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'File PNG non valido.', statusCode: 400 })
      }
      const { width, height } = getPngDimensions(buffer)
      if (width > MAX_DIM || height > MAX_DIM) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: `Immagine troppo grande: ${width}×${height}px. Massimo ${MAX_DIM}×${MAX_DIM}px.`,
          statusCode: 400,
        })
      }
    }

    if (isWebpByExt || WEBP_MIMES.has(mime)) {
      if (buffer.length < 12 || !buffer.subarray(0, 4).equals(RIFF_BYTES) || !buffer.subarray(8, 12).equals(WEBP_BYTES)) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'File WebP non valido.', statusCode: 400 })
      }
    }

    const ext =
      isSvgByExt || mime === 'image/svg+xml'
        ? 'svg'
        : isWebpByExt || WEBP_MIMES.has(mime)
          ? 'webp'
          : 'png'
    const filename = `logo.${ext}`

    fs.mkdirSync(LOGO_DIR, { recursive: true })
    deleteExistingLogo()

    const targetPath = path.join(LOGO_DIR, filename)
    fs.writeFileSync(targetPath, buffer)

    req.log.info(`Logo caricato: ${filename}`)
    return reply.status(200).send({ url: `/uploads/images/logo/${filename}` })
  })

  // DELETE /api/admin/branding/logo — rimuove il logo corrente
  fastify.delete('/logo', {
    preHandler: [fastify.checkPermission('branding.logo.manage')],
  }, async (req, reply) => {
    const hadLogo = ['logo.png', 'logo.svg', 'logo.webp'].some((base) =>
      fs.existsSync(path.join(LOGO_DIR, base))
    )
    if (!hadLogo) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Nessun logo da eliminare.', statusCode: 404 })
    }
    deleteExistingLogo()

    req.log.info('Logo eliminato')
    return reply.status(200).send({ message: 'Logo eliminato.' })
  })

  // POST /api/admin/branding/images/:slot — carica immagine per slot
  fastify.post<{ Params: { slot: string } }>('/images/:slot', {
    preHandler: [fastify.checkPermission('branding.logo.manage')],
  }, async (req, reply) => {
    const { slot } = req.params

    if (!VALID_SLOTS.has(slot)) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: `Slot non valido. Valori accettati: ${[...VALID_SLOTS].join(', ')}.`,
        statusCode: 400,
      })
    }

    const data = await req.file()
    if (!data) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Nessun file caricato.', statusCode: 400 })
    }

    const mime = data.mimetype
    const originalName = (data.filename ?? '').toLowerCase()
    const isSvgByExt = originalName.endsWith('.svg')
    const isPngByExt = originalName.endsWith('.png')
    const isWebpByExt = originalName.endsWith('.webp')

    if (!IMG_ALLOWED_MIMES.has(mime) && !isSvgByExt && !isPngByExt && !isWebpByExt) {
      data.file.resume()
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Formato non supportato. Usa PNG, WebP o SVG.',
        statusCode: 400,
      })
    }

    const chunks: Buffer[] = []
    let totalSize = 0
    for await (const chunk of data.file) {
      totalSize += chunk.length
      if (totalSize > MAX_IMG_SIZE) {
        data.file.resume()
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'File troppo grande (max 5 MB).',
          statusCode: 400,
        })
      }
      chunks.push(chunk as Buffer)
    }
    const buffer = Buffer.concat(chunks)

    if (isPngByExt || PNG_MIMES.has(mime)) {
      if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_MAGIC_BYTES)) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'File PNG non valido.', statusCode: 400 })
      }
    }

    if (isWebpByExt || WEBP_MIMES.has(mime)) {
      if (buffer.length < 12 || !buffer.subarray(0, 4).equals(RIFF_BYTES) || !buffer.subarray(8, 12).equals(WEBP_BYTES)) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'File WebP non valido.', statusCode: 400 })
      }
    }

    const ext =
      isSvgByExt || mime === 'image/svg+xml'
        ? 'svg'
        : isWebpByExt || mime === 'image/webp'
          ? 'webp'
          : 'png'

    const spec = SLOT_SPEC[slot] ?? { w: 1920, h: 1280, bg: { r: 7, g: 19, b: 37 } }
    const finalBuffer = ext !== 'svg'
      ? await fitToSlot(buffer, spec, ext)
      : buffer

    fs.mkdirSync(BRANDING_IMG_DIR, { recursive: true })
    deleteExistingSlotImage(slot)

    const filename = `${slot}.${ext}`
    fs.writeFileSync(path.join(BRANDING_IMG_DIR, filename), finalBuffer)

    req.log.info(`Immagine branding caricata: ${filename}`)
    return reply.status(200).send({ url: `/uploads/images/branding/${filename}` })
  })

  // DELETE /api/admin/branding/images/:slot — rimuove immagine per slot
  fastify.delete<{ Params: { slot: string } }>('/images/:slot', {
    preHandler: [fastify.checkPermission('branding.logo.manage')],
  }, async (req, reply) => {
    const { slot } = req.params

    if (!VALID_SLOTS.has(slot)) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: `Slot non valido. Valori accettati: ${[...VALID_SLOTS].join(', ')}.`,
        statusCode: 400,
      })
    }

    const hadImage = IMG_EXTS.some((ext) => fs.existsSync(path.join(BRANDING_IMG_DIR, `${slot}.${ext}`)))

    if (!hadImage) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Nessuna immagine da eliminare per questo slot.',
        statusCode: 404,
      })
    }

    deleteExistingSlotImage(slot)

    req.log.info(`Immagine branding eliminata: slot ${slot}`)
    return reply.status(200).send({ message: 'Immagine eliminata.' })
  })
}

export default brandingAdminRoutes

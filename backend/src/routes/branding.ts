import { FastifyPluginAsync } from 'fastify'
import fs from 'fs'
import path from 'path'

const LOGO_DIR = path.resolve(process.cwd(), '..', 'uploads', 'images', 'logo')
const PNG_MIMES = new Set(['image/png'])
// SVG può arrivare con MIME diversi a seconda del browser/OS
const SVG_MIMES = new Set(['image/svg+xml', 'text/xml', 'text/plain', 'application/xml', 'application/octet-stream'])
const WEBP_MIMES = new Set(['image/webp'])
const ALLOWED_MIMES = new Set([...PNG_MIMES, ...SVG_MIMES, ...WEBP_MIMES])
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const MAX_DIM = 512

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
      const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
      if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_MAGIC)) {
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
    const hadLogo = ['logo.png', 'logo.svg', 'logo.webp'].some((base) => {
      const p = path.join(LOGO_DIR, base)
      if (fs.existsSync(p)) { fs.rmSync(p); return true }
      return false
    })

    if (!hadLogo) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Nessun logo da eliminare.', statusCode: 404 })
    }

    req.log.info('Logo eliminato')
    return reply.status(200).send({ message: 'Logo eliminato.' })
  })
}

export default brandingAdminRoutes

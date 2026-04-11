import { FastifyPluginAsync } from 'fastify'
import fs from 'fs'
import path from 'path'

// Sovrascrivibile via env per i test (usa un file temporaneo)
function getLocalesPath(): string {
  return process.env.LOCALES_PATH ?? path.resolve(process.cwd(), '..', 'frontend', 'src', 'locales', 'it.json')
}

// For backward compatibility with code that might import LOCALES_PATH directly
export const LOCALES_PATH = {
  toString() {
    return getLocalesPath()
  }
}

export function readLocales(): Record<string, unknown> {
  const filePath = getLocalesPath()
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as Record<string, unknown>
}

export function writeLocalesAtomic(data: Record<string, unknown>): void {
  const filePath = getLocalesPath()
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  fs.renameSync(tmp, filePath)
}

// Plugin pubblico: montato su /api/public/locales
export const localesPublicRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { lng: string } }>('/:lng', async (req, reply) => {
    const { lng } = req.params
    if (lng !== 'it') {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Lingua non supportata.', statusCode: 404 })
    }
    let data: Record<string, unknown>
    try {
      data = readLocales()
    } catch {
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Impossibile leggere il file locale.', statusCode: 500 })
    }
    return reply.header('Cache-Control', 'no-store').send(data)
  })
}

// Plugin admin: montato su /api/admin/locales
export const localesAdminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  fastify.put('/', {
    preHandler: [fastify.checkPermission('locales.manage')],
  }, async (req, reply) => {
    const body = req.body

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Il body deve essere un oggetto JSON.', statusCode: 400 })
    }

    let existing: Record<string, unknown>
    try {
      existing = readLocales()
    } catch {
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Impossibile leggere il file locale.', statusCode: 500 })
    }

    const incoming = body as Record<string, unknown>
    const missingKeys = Object.keys(existing).filter((k) => !(k in incoming))
    if (missingKeys.length > 0) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: `Chiavi mancanti: ${missingKeys.join(', ')}. Non è possibile rimuovere sezioni esistenti.`,
        statusCode: 400,
      })
    }

    try {
      writeLocalesAtomic(incoming)
    } catch {
      return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Impossibile scrivere il file locale.', statusCode: 500 })
    }

    req.log.info('Locale it.json aggiornato')
    return reply.send({ ok: true })
  })
}

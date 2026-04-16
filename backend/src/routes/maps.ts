import fs from 'fs'
import path from 'path'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { AdminMapsResponse, MapCoordinates, PublicMapsResponse } from '../types/shared'

const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

const adminPayloadSchema = z.object({
  offices: z.object({
    villamar: coordinatesSchema,
    sassari: coordinatesSchema,
  }),
})

const DEFAULT_MAPS: PublicMapsResponse = {
  offices: {
    villamar: { lat: 39.6189, lng: 9.0003 },
    sassari: { lat: 40.7259, lng: 8.5558 },
  },
}

function getMapsPath(): string {
  return process.env.MAPS_PATH ?? path.resolve(process.cwd(), 'maps.json')
}

function cloneDefaultMapsConfig(): PublicMapsResponse {
  return {
    offices: {
      villamar: { ...DEFAULT_MAPS.offices.villamar },
      sassari: { ...DEFAULT_MAPS.offices.sassari },
    },
  }
}

function toCoordinates(value: unknown, fallback: MapCoordinates): MapCoordinates {
  if (typeof value !== 'object' || value === null) return { ...fallback }

  const candidate = value as Partial<MapCoordinates>
  return {
    lat: typeof candidate.lat === 'number' ? candidate.lat : fallback.lat,
    lng: typeof candidate.lng === 'number' ? candidate.lng : fallback.lng,
  }
}

function readMapsConfig(): PublicMapsResponse {
  const filePath = getMapsPath()
  try {
    if (!fs.existsSync(filePath)) return cloneDefaultMapsConfig()

    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<PublicMapsResponse>
    return {
      offices: {
        villamar: toCoordinates(parsed.offices?.villamar, DEFAULT_MAPS.offices.villamar),
        sassari: toCoordinates(parsed.offices?.sassari, DEFAULT_MAPS.offices.sassari),
      },
    }
  } catch {
    return cloneDefaultMapsConfig()
  }
}

function writeMapsConfigAtomic(data: AdminMapsResponse): void {
  const filePath = getMapsPath()
  const tmpPath = `${filePath}.tmp`
  fs.writeFileSync(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
  fs.renameSync(tmpPath, filePath)
}

export const mapsPublicRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_req, reply) => {
    return reply.header('Cache-Control', 'no-store').send(readMapsConfig())
  })
}

export const mapsAdminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  fastify.get('/', {
    preHandler: [fastify.checkPermission('maps.manage')],
  }, async (_req, reply) => {
    return reply.header('Cache-Control', 'no-store').send(readMapsConfig())
  })

  fastify.put('/', {
    preHandler: [fastify.checkPermission('maps.manage')],
  }, async (req, reply) => {
    const parsed = adminPayloadSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Payload mappe non valido.',
        statusCode: 400,
      })
    }

    try {
      writeMapsConfigAtomic(parsed.data)
    } catch {
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Impossibile salvare le mappe.',
        statusCode: 500,
      })
    }

    return reply.send({ ok: true })
  })
}

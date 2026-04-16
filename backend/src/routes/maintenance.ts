import fs from 'fs'
import path from 'path'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  type AdminMaintenanceResponse,
  type MaintenancePageKey,
  type PublicMaintenanceResponse,
} from '../types/shared'
import { readLocales, writeLocalesAtomic } from './locales'

const MAINTENANCE_KEYS: MaintenancePageKey[] = ['home', 'ourStory', 'whereWeAre', 'funeralHomes', 'marmistas']

const DEFAULT_MESSAGES: Record<MaintenancePageKey, string> = {
  home: 'Il sito è temporaneamente in manutenzione.',
  ourStory: 'Questa pagina è temporaneamente in manutenzione.',
  whereWeAre: 'Questa pagina è temporaneamente in manutenzione.',
  funeralHomes: 'Questa pagina è temporaneamente in manutenzione.',
  marmistas: 'Questa pagina è temporaneamente in manutenzione.',
}

const adminPageSchema = z.object({
  enabled: z.boolean(),
  message: z.string().min(1).max(5000),
})

const adminHomePageSchema = adminPageSchema.extend({
  homeH2: z.string().max(5000).optional().default(''),
})

const adminPayloadSchema = z.object({
  pages: z.object({
    home: adminHomePageSchema,
    ourStory: adminPageSchema,
    whereWeAre: adminPageSchema,
    funeralHomes: adminPageSchema,
    marmistas: adminPageSchema,
  }),
})

function getMaintenancePath(): string {
  return process.env.MAINTENANCE_PATH ?? path.resolve(process.cwd(), 'maintenance.json')
}

function cloneDefaultState(): PublicMaintenanceResponse {
  return {
    pages: {
      home: { enabled: false },
      ourStory: { enabled: false },
      whereWeAre: { enabled: false },
      funeralHomes: { enabled: false },
      marmistas: { enabled: false },
    },
  }
}

function readMaintenanceState(): PublicMaintenanceResponse {
  const filePath = getMaintenancePath()
  try {
    if (!fs.existsSync(filePath)) {
      return cloneDefaultState()
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<PublicMaintenanceResponse>
    const pages: Partial<PublicMaintenanceResponse['pages']> = parsed.pages ?? {}
    return {
      pages: {
        home: { enabled: pages.home?.enabled ?? false },
        ourStory: { enabled: pages.ourStory?.enabled ?? false },
        whereWeAre: { enabled: pages.whereWeAre?.enabled ?? false },
        funeralHomes: { enabled: pages.funeralHomes?.enabled ?? false },
        marmistas: { enabled: pages.marmistas?.enabled ?? false },
      },
    }
  } catch {
    return cloneDefaultState()
  }
}

function writeMaintenanceStateAtomic(data: PublicMaintenanceResponse): void {
  const filePath = getMaintenancePath()
  const tmp = `${filePath}.tmp`
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
  fs.renameSync(tmp, filePath)
}

function readMaintenanceMessages(): { pages: Record<MaintenancePageKey, string>; homeH2: string } {
  const locales = readLocales()
  const maintenance = (locales.maintenance ?? {}) as Partial<Record<MaintenancePageKey | 'homeH2', unknown>>

  return {
    pages: {
      home: typeof maintenance.home === 'string' ? maintenance.home : DEFAULT_MESSAGES.home,
      ourStory: typeof maintenance.ourStory === 'string' ? maintenance.ourStory : DEFAULT_MESSAGES.ourStory,
      whereWeAre: typeof maintenance.whereWeAre === 'string' ? maintenance.whereWeAre : DEFAULT_MESSAGES.whereWeAre,
      funeralHomes: typeof maintenance.funeralHomes === 'string' ? maintenance.funeralHomes : DEFAULT_MESSAGES.funeralHomes,
      marmistas: typeof maintenance.marmistas === 'string' ? maintenance.marmistas : DEFAULT_MESSAGES.marmistas,
    },
    homeH2: typeof maintenance.homeH2 === 'string' ? maintenance.homeH2 : '',
  }
}

function setNestedValue(target: Record<string, unknown>, key: string, value: string): Record<string, unknown> {
  const parts = key.split('.')
  const clone: Record<string, unknown> = Array.isArray(target) ? [...target] as unknown as Record<string, unknown> : { ...target }
  let current: Record<string, unknown> = clone
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]
    const next = current[part]
    if (typeof next !== 'object' || next === null || Array.isArray(next)) {
      current[part] = {}
    } else {
      current[part] = { ...next }
    }
    current = current[part] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
  return clone
}

function buildAdminResponse(): AdminMaintenanceResponse {
  const state = readMaintenanceState()
  const messages = readMaintenanceMessages()

  return {
      pages: {
        home: { enabled: state.pages.home.enabled, message: messages.pages.home, homeH2: messages.homeH2 },
        ourStory: { enabled: state.pages.ourStory.enabled, message: messages.pages.ourStory },
        whereWeAre: { enabled: state.pages.whereWeAre.enabled, message: messages.pages.whereWeAre },
        funeralHomes: { enabled: state.pages.funeralHomes.enabled, message: messages.pages.funeralHomes },
        marmistas: { enabled: state.pages.marmistas.enabled, message: messages.pages.marmistas },
      },
    }
}

export const maintenancePublicRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_req, reply) => {
    return reply.header('Cache-Control', 'no-store').send(readMaintenanceState())
  })
}

export const maintenanceAdminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  fastify.get('/', {
    preHandler: [fastify.checkPermission('maintenance.manage')],
  }, async (_req, reply) => {
    return reply.header('Cache-Control', 'no-store').send(buildAdminResponse())
  })

  fastify.put('/', {
    preHandler: [fastify.checkPermission('maintenance.manage')],
  }, async (req, reply) => {
    const parsed = adminPayloadSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Payload manutenzione non valido.',
        statusCode: 400,
      })
    }

    const state: PublicMaintenanceResponse = {
      pages: {
        home: { enabled: parsed.data.pages.home.enabled },
        ourStory: { enabled: parsed.data.pages.ourStory.enabled },
        whereWeAre: { enabled: parsed.data.pages.whereWeAre.enabled },
        funeralHomes: { enabled: parsed.data.pages.funeralHomes.enabled },
        marmistas: { enabled: parsed.data.pages.marmistas.enabled },
      },
    }

    try {
      writeMaintenanceStateAtomic(state)

      const locales = readLocales()
      let updatedLocales = { ...locales }
      for (const key of MAINTENANCE_KEYS) {
        updatedLocales = setNestedValue(updatedLocales, `maintenance.${key}`, parsed.data.pages[key].message)
      }
      updatedLocales = setNestedValue(updatedLocales, 'maintenance.homeH2', parsed.data.pages.home.homeH2)
      writeLocalesAtomic(updatedLocales)
    } catch {
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Impossibile salvare lo stato di manutenzione.',
        statusCode: 500,
      })
    }

    req.log.info('Stato manutenzione aggiornato')
    return reply.send({ ok: true })
  })
}

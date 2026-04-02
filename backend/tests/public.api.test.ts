/**
 * Test degli endpoint pubblici — usa Fastify inject() per evitare connessioni di rete.
 * Prisma e il mailer sono mockati: i test non richiedono un DB attivo.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'

// ─── Mock mailer ─────────────────────────────────────────────────────────────
// Il mock viene dichiarato PRIMA dell'import delle route così vi.mock() lo
// sostituisce correttamente grazie all'hoisting di Vitest.

const mockSendContactEmail = vi.fn().mockResolvedValue(undefined)

vi.mock('../src/lib/mailer', () => ({
  sendContactEmail: mockSendContactEmail,
  setTransporter: vi.fn(),
  getTransporter: vi.fn(),
}))

// ─── Helper: build di un'istanza Fastify isolata ─────────────────────────────

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  // Mock prisma — decorazione diretta senza plugin per semplicità nei test
  const prismaMock: Partial<PrismaClient> = {
    coffinArticle: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    accessoryArticle: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    marmistaArticle: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  }

  // Registra il decoratore prisma come il plugin originale farebbe
  app.decorate('prisma', prismaMock)

  // Importa le route direttamente
  const { default: publicRoutes } = await import('../src/routes/public')
  await app.register(publicRoutes, { prefix: '/api/public' })

  await app.ready()
  return app
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/public/health', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('risponde con status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/health' })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ status: string }>()
    expect(body.status).toBe('ok')
  })
})

describe('GET /api/public/coffins', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('risponde con { data: [], pagination: {...} } quando il DB è vuoto', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/coffins' })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[]; pagination: Record<string, number> }>()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.pagination).toBeDefined()
    expect(body.pagination).toHaveProperty('page')
    expect(body.pagination).toHaveProperty('limit')
    expect(body.pagination).toHaveProperty('total')
    expect(body.pagination).toHaveProperty('totalPages')
  })

  it('NON espone purchasePrice nella risposta', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/coffins' })
    const text = res.body
    expect(text).not.toContain('purchasePrice')
  })

  it('accetta parametri di paginazione', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/coffins?page=2&limit=5' })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ pagination: Record<string, number> }>()
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.limit).toBe(5)
  })
})

describe('GET /api/public/accessories', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('risponde con { data: [], pagination: {...} }', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/accessories' })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[]; pagination: Record<string, number> }>()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.pagination).toBeDefined()
  })

  it('NON espone purchasePrice nella risposta', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/accessories' })
    expect(res.body).not.toContain('purchasePrice')
  })
})

describe('GET /api/public/marmista', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('risponde con { data: [], pagination: {...} }', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/marmista' })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[]; pagination: Record<string, number> }>()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.pagination).toBeDefined()
  })

  it('NON espone purchasePrice nella risposta', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/marmista' })
    expect(res.body).not.toContain('purchasePrice')
  })
})

describe('POST /api/public/contact', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })
  beforeEach(() => { vi.clearAllMocks() })

  it('accetta dati validi e risponde 200', async () => {
    mockSendContactEmail.mockResolvedValue(undefined)

    const res = await app.inject({
      method: 'POST',
      url: '/api/public/contact',
      headers: { 'content-type': 'application/json' },
      payload: {
        name: 'Mario Rossi',
        email: 'mario@test.com',
        message: 'Ciao, sono interessato ai vostri prodotti.',
      },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ success: boolean }>()
    expect(body.success).toBe(true)
    expect(mockSendContactEmail).toHaveBeenCalledOnce()
  })

  it('restituisce 422 con nome troppo corto', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/public/contact',
      headers: { 'content-type': 'application/json' },
      payload: {
        name: 'M', // min 2 caratteri
        email: 'mario@test.com',
        message: 'Ciao, sono interessato ai vostri prodotti.',
      },
    })
    expect(res.statusCode).toBe(422)
    expect(mockSendContactEmail).not.toHaveBeenCalled()
  })

  it('restituisce 422 con email non valida', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/public/contact',
      headers: { 'content-type': 'application/json' },
      payload: {
        name: 'Mario Rossi',
        email: 'non-una-email',
        message: 'Ciao, sono interessato ai vostri prodotti.',
      },
    })
    expect(res.statusCode).toBe(422)
    expect(mockSendContactEmail).not.toHaveBeenCalled()
  })

  it('restituisce 422 con messaggio troppo corto', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/public/contact',
      headers: { 'content-type': 'application/json' },
      payload: {
        name: 'Mario Rossi',
        email: 'mario@test.com',
        message: 'Ciao', // min 10 caratteri
      },
    })
    expect(res.statusCode).toBe(422)
    expect(mockSendContactEmail).not.toHaveBeenCalled()
  })

  it('restituisce 500 se sendContactEmail lancia un errore', async () => {
    mockSendContactEmail.mockRejectedValue(new Error('SMTP down'))

    const res = await app.inject({
      method: 'POST',
      url: '/api/public/contact',
      headers: { 'content-type': 'application/json' },
      payload: {
        name: 'Mario Rossi',
        email: 'mario@test.com',
        message: 'Ciao, sono interessato ai vostri prodotti.',
      },
    })
    expect(res.statusCode).toBe(500)
  })
})

# Fase 5 — Area Clienti: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementare l'area clienti per Impresario Funebre e Marmista — catalogo con prezzi listino assegnato, dashboard personale, PDF viewer, modifica password.

**Architecture:** Endpoint `/api/client/*` dedicati che leggono il listino dalla sessione server. Frontend `/client/*` con `AdminLayout variant="client"`. Redirect post-login basato su ruolo.

**Tech Stack:** Fastify v5, Prisma, React 19, react-pdf, Tailwind CSS v4, Zod, Vitest

---

## File Map

**Create:**
- `backend/src/lib/priceListUtils.ts` — `loadPriceListTree`, `buildComputedItems` estratti da `pricelists.ts`
- `backend/src/routes/client.ts` — tutti gli endpoint `/api/client/*`
- `backend/src/routes/__tests__/client.test.ts`
- `frontend/src/lib/api/client.ts`
- `frontend/src/components/client/PdfViewer.tsx`
- `frontend/src/pages/client/ClientDashboard.tsx`
- `frontend/src/pages/client/FuneralCatalogPage.tsx`
- `frontend/src/pages/client/FuneralDetailPage.tsx`
- `frontend/src/pages/client/MarmistaClientCatalogPage.tsx`
- `frontend/src/pages/client/MarmistaClientDetailPage.tsx`
- `frontend/src/pages/client/ChangePasswordPage.tsx`

**Modify:**
- `backend/src/routes/pricelists.ts` — import da `priceListUtils`
- `backend/src/routes/auth.ts` — aggiungere `funeralPriceList`/`marmistaPriceList` a `/me`
- `backend/src/app.ts` — registrare `clientRoutes`
- `frontend/src/components/admin/AdminLayout.tsx` — prop `variant`
- `frontend/src/components/admin/AdminSidebar.tsx` — prop `variant` + voci client
- `frontend/src/pages/LoginPage.tsx` — redirect per ruolo
- `frontend/src/App.tsx` — route `/client/*`

---

## Task 1 — Estrai utility listini in `priceListUtils.ts`

**Files:** Create `backend/src/lib/priceListUtils.ts`, Modify `backend/src/routes/pricelists.ts`

- [ ] Crea `backend/src/lib/priceListUtils.ts` spostando le funzioni `loadPriceListTree`, `buildComputedItems`, `getArticleContext`, `buildNode` e l'interfaccia `LoadedPriceListTree` da `pricelists.ts`:

```ts
// backend/src/lib/priceListUtils.ts
import type { Prisma } from '@prisma/client'
import { applyRules } from './priceEngine'
import type { PriceListNode } from '../types/shared'

export interface LoadedPriceListTree {
  id: string; name: string; type: 'purchase' | 'sale'
  articleType: 'funeral' | 'marmista'; parentId: string | null
  autoUpdate: boolean
  rules: Array<{ filterType: string | null; filterValue: string | null; discountType: 'percentage' | 'absolute'; discountValue: number }>
  parent?: LoadedPriceListTree
}

export interface PrismaClientLike {
  priceList: Prisma.TransactionClient['priceList']
  priceListItem: Prisma.TransactionClient['priceListItem']
}

// (copia le 4 funzioni da pricelists.ts invariate)
export async function loadPriceListTree(...) { ... }
export async function buildComputedItems(...) { ... }
export function buildNode(...) { ... }
export function getArticleContext(...) { ... }
```

- [ ] In `pricelists.ts` rimuovi le funzioni duplicate e aggiungi `import { loadPriceListTree, buildComputedItems, buildNode, getArticleContext, LoadedPriceListTree, PrismaClientLike } from '../lib/priceListUtils'`
- [ ] Esegui `cd backend && npx tsc --noEmit` — atteso: 0 errori
- [ ] `git commit -m "refactor: estrai priceListUtils da pricelists.ts"`

---

## Task 2 — Aggiorna `/api/auth/me`

**Files:** Modify `backend/src/routes/auth.ts`

- [ ] In `auth.ts`, nella query `findUnique` di `/me` aggiungi l'include:

```ts
include: {
  funeralPriceList: { select: { id: true, name: true } },
  marmistaPriceList: { select: { id: true, name: true } },
}
```

- [ ] Aggiungi i campi alla risposta:

```ts
return reply.send({
  user: {
    id: user.id, email: user.email,
    firstName: user.firstName, lastName: user.lastName,
    roles, isActive: user.isActive,
    funeralPriceList: user.funeralPriceList ?? null,
    marmistaPriceList: user.marmistaPriceList ?? null,
  }
})
```

- [ ] `git commit -m "feat: aggiungi priceList a /api/auth/me"`

---

## Task 3 — Backend `routes/client.ts`

**Files:** Create `backend/src/routes/client.ts`, Modify `backend/src/app.ts`

- [ ] Crea `backend/src/routes/client.ts`:

```ts
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { loadPriceListTree, buildComputedItems } from '../lib/priceListUtils'

const clientRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['impresario_funebre', 'marmista']))

  // GET /api/client/me
  fastify.get('/me', async (req) => {
    const userId = req.session.get('userId')!
    const user = await fastify.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        funeralPriceList: { select: { id: true, name: true } },
        marmistaPriceList: { select: { id: true, name: true } },
        managers: { include: { manager: { select: { firstName: true, lastName: true, email: true } } } },
      },
    })
    const mgr = user.managers[0]?.manager ?? null
    return {
      funeralPriceList: user.funeralPriceList,
      marmistaPriceList: user.marmistaPriceList,
      manager: mgr ? { name: `${mgr.firstName} ${mgr.lastName}`, email: mgr.email } : null,
    }
  })

  // GET /api/client/catalog/funeral
  fastify.get('/catalog/funeral', async (req, reply) => {
    const userId = req.session.get('userId')!
    const user = await fastify.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { funeralPriceListId: true } })
    if (!user.funeralPriceListId) return { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 }, warning: 'Nessun listino assegnato' }

    const q = req.query as Record<string, string>
    const page = parseInt(q.page ?? '1'), pageSize = parseInt(q.pageSize ?? '20')

    const where: Record<string, unknown> = {}
    if (q.category) where.categories = { some: { code: q.category } }
    if (q.subcategory) where.subcategories = { some: { code: q.subcategory } }
    if (q.essence) where.essences = { some: { code: q.essence } }
    if (q.finish) where.finishes = { some: { code: q.finish } }
    if (q.color) where.colors = { some: { code: q.color } }

    const [total, articles] = await Promise.all([
      fastify.prisma.coffinArticle.count({ where }),
      fastify.prisma.coffinArticle.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { code: 'asc' } }),
    ])

    const tree = await loadPriceListTree(fastify.prisma, user.funeralPriceListId)
    const computed = tree ? await buildComputedItems(fastify.prisma, tree) : []
    const priceMap = new Map(computed.map(i => [i.coffinArticleId ?? i.accessoryArticleId, i.computedPrice]))

    return {
      data: articles.map(a => ({ id: a.id, code: a.code, description: a.description, price: priceMap.get(a.id) ?? null })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    }
  })

  // GET /api/client/catalog/funeral/:id
  fastify.get<{ Params: { id: string } }>('/catalog/funeral/:id', async (req, reply) => {
    const userId = req.session.get('userId')!
    const user = await fastify.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { funeralPriceListId: true } })
    const article = await fastify.prisma.coffinArticle.findUnique({
      where: { id: req.params.id },
      include: { measures: true, images: true },
    })
    if (!article) return reply.status(404).send({ error: 'NotFound', message: 'Articolo non trovato', statusCode: 404 })

    let price: number | null = null
    if (user.funeralPriceListId) {
      const tree = await loadPriceListTree(fastify.prisma, user.funeralPriceListId)
      if (tree) {
        const computed = await buildComputedItems(fastify.prisma, tree)
        price = computed.find(i => i.coffinArticleId === article.id)?.computedPrice ?? null
      }
    }
    return { ...article, price }
  })

  // GET /api/client/catalog/marmista
  fastify.get('/catalog/marmista', async (req) => {
    const userId = req.session.get('userId')!
    const user = await fastify.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { marmistaPriceListId: true } })
    if (!user.marmistaPriceListId) return { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 }, warning: 'Nessun listino assegnato' }

    const q = req.query as Record<string, string>
    const page = parseInt(q.page ?? '1'), pageSize = parseInt(q.pageSize ?? '20')
    const where = q.category ? { categories: { some: { code: q.category } } } : {}

    const [total, articles] = await Promise.all([
      fastify.prisma.marmistaArticle.count({ where }),
      fastify.prisma.marmistaArticle.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { code: 'asc' } }),
    ])
    const tree = await loadPriceListTree(fastify.prisma, user.marmistaPriceListId)
    const computed = tree ? await buildComputedItems(fastify.prisma, tree) : []
    const priceMap = new Map(computed.map(i => [i.marmistaArticleId, i.computedPrice]))

    return {
      data: articles.map(a => ({ id: a.id, code: a.code, description: a.description, price: priceMap.get(a.id) ?? null })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    }
  })

  // GET /api/client/catalog/marmista/:id
  fastify.get<{ Params: { id: string } }>('/catalog/marmista/:id', async (req, reply) => {
    const userId = req.session.get('userId')!
    const user = await fastify.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { marmistaPriceListId: true } })
    const article = await fastify.prisma.marmistaArticle.findUnique({
      where: { id: req.params.id },
      include: { accessories: true },
    })
    if (!article) return reply.status(404).send({ error: 'NotFound', message: 'Articolo non trovato', statusCode: 404 })

    let price: number | null = null
    if (user.marmistaPriceListId) {
      const tree = await loadPriceListTree(fastify.prisma, user.marmistaPriceListId)
      if (tree) {
        const computed = await buildComputedItems(fastify.prisma, tree)
        price = computed.find(i => i.marmistaArticleId === article.id)?.computedPrice ?? null
      }
    }
    return { ...article, price }
  })

  // POST /api/client/change-password
  fastify.post('/change-password', async (req, reply) => {
    const { oldPassword, newPassword } = z.object({
      oldPassword: z.string().min(1),
      newPassword: z.string().min(8),
    }).parse(req.body)

    const userId = req.session.get('userId')!
    const user = await fastify.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const valid = await bcrypt.compare(oldPassword, user.password)
    if (!valid) return reply.status(401).send({ error: 'Unauthorized', message: 'Password attuale errata', statusCode: 401 })

    const hash = await bcrypt.hash(newPassword, 12)
    await fastify.prisma.user.update({ where: { id: userId }, data: { password: hash } })
    return { ok: true }
  })
}

export default clientRoutes
```

- [ ] In `app.ts` aggiungi `import clientRoutes from './routes/client'` e `await app.register(clientRoutes, { prefix: '/api/client' })`
- [ ] `npx tsc --noEmit` — 0 errori
- [ ] `git commit -m "feat: route /api/client — catalogo, me, change-password"`

---

## Task 4 — Test backend `/api/client/`

**Files:** Create `backend/src/routes/__tests__/client.test.ts`

- [ ] Crea il file di test:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb } from '../../test-helper'

describe('Client API', () => {
  let app: any
  let impresarioCookie: string
  let marmistaCookie: string
  let plId: string

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await cleanupTestDb(app); await app.close() })

  beforeEach(async () => {
    await cleanupTestDb(app)
    await app.prisma.priceList.deleteMany()

    const pl = await app.prisma.priceList.create({
      data: { name: 'Test PL', type: 'sale', articleType: 'funeral', autoUpdate: false }
    })
    plId = pl.id

    const { id: uid } = await seedTestUser(app, { email: 'imp@test.com', password: 'pass1234!', roles: ['impresario_funebre'] })
    await app.prisma.user.update({ where: { id: uid }, data: { funeralPriceListId: plId } })
    impresarioCookie = await getAuthCookie(app, 'imp@test.com', 'pass1234!')

    await seedTestUser(app, { email: 'mar@test.com', password: 'pass1234!', roles: ['marmista'] })
    marmistaCookie = await getAuthCookie(app, 'mar@test.com', 'pass1234!')
  })

  it('GET /api/client/me — restituisce listino assegnato', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/client/me', headers: { cookie: impresarioCookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json().funeralPriceList).toMatchObject({ id: plId })
  })

  it('marmista non può accedere a /catalog/funeral', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/client/catalog/funeral', headers: { cookie: marmistaCookie } })
    expect(res.statusCode).toBe(403)
  })

  it('catalogo restituisce warning se nessun listino assegnato', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/client/catalog/marmista', headers: { cookie: marmistaCookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json().warning).toBe('Nessun listino assegnato')
  })

  it('change-password rifiuta vecchia password errata', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/client/change-password',
      headers: { cookie: impresarioCookie },
      payload: { oldPassword: 'sbagliata', newPassword: 'nuova1234!' }
    })
    expect(res.statusCode).toBe(401)
  })

  it('change-password aggiorna con password corretta', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/client/change-password',
      headers: { cookie: impresarioCookie },
      payload: { oldPassword: 'pass1234!', newPassword: 'nuova5678!' }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true })
  })
})
```

- [ ] `cd backend && npx vitest run src/routes/__tests__/client.test.ts` — 5/5 pass
- [ ] `git commit -m "test: client API — catalogo, me, change-password"`

---

## Task 5 — Frontend: `AdminLayout` variant + sidebar client

**Files:** Modify `AdminLayout.tsx`, `AdminSidebar.tsx`

- [ ] In `AdminLayout.tsx` aggiungi prop `variant: 'admin' | 'client' = 'admin'` e passala ad `AdminSidebar`:

```tsx
export default function AdminLayout({ variant = 'admin' }: { variant?: 'admin' | 'client' }) {
  // ...
  return (
    <div className="min-h-screen bg-[#FAF9F6] lg:flex">
      <AdminSidebar variant={variant} />
      {/* header invariato */}
    </div>
  )
}
```

- [ ] In `AdminSidebar.tsx` aggiungi prop `variant` e voci client:

```tsx
const CLIENT_NAV: NavItem[] = [
  { kind: 'leaf', to: '/client/dashboard', label: 'Dashboard', roles: null },
  { kind: 'leaf', to: '/client/catalog/funeral', label: 'Catalogo Funebre', roles: ['impresario_funebre'] },
  { kind: 'leaf', to: '/client/catalog/marmista', label: 'Catalogo Marmisti', roles: ['marmista'] },
  { kind: 'leaf', to: '/client/change-password', label: 'Cambia Password', roles: null },
]

export default function AdminSidebar({ variant = 'admin' }: { variant?: 'admin' | 'client' }) {
  const items = variant === 'client' ? CLIENT_NAV : NAV_ITEMS
  // resto invariato, usa `items` invece di `NAV_ITEMS`
}
```

- [ ] `git commit -m "feat: AdminLayout/Sidebar variant client"`

---

## Task 6 — Frontend: redirect post-login + route `/client/*`

**Files:** Modify `LoginPage.tsx`, `App.tsx`

- [ ] In `LoginPage.tsx`, dopo login successo:

```tsx
const roles: string[] = data.user?.roles ?? []
const isClient = roles.includes('impresario_funebre') || roles.includes('marmista')
navigate(isClient ? '/client/dashboard' : '/admin/dashboard', { replace: true })
```

- [ ] In `App.tsx` aggiungi import lazy per le pagine client e le route:

```tsx
const ClientLayout = lazy(() => import('./components/admin/AdminLayout').then(m => ({ default: () => <m.default variant="client" /> })))
const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'))
const FuneralCatalogPage = lazy(() => import('./pages/client/FuneralCatalogPage'))
const FuneralDetailPage = lazy(() => import('./pages/client/FuneralDetailPage'))
const MarmistaClientCatalogPage = lazy(() => import('./pages/client/MarmistaClientCatalogPage'))
const MarmistaClientDetailPage = lazy(() => import('./pages/client/MarmistaClientDetailPage'))
const ChangePasswordPage = lazy(() => import('./pages/client/ChangePasswordPage'))

// nelle Routes:
<Route path="/client" element={<ProtectedRoute requiredRoles={['impresario_funebre','marmista']}><ClientLayout /></ProtectedRoute>}>
  <Route path="dashboard" element={<ClientDashboard />} />
  <Route path="catalog/funeral" element={<ProtectedRoute requiredRoles={['impresario_funebre']}><FuneralCatalogPage /></ProtectedRoute>} />
  <Route path="catalog/funeral/:id" element={<ProtectedRoute requiredRoles={['impresario_funebre']}><FuneralDetailPage /></ProtectedRoute>} />
  <Route path="catalog/marmista" element={<ProtectedRoute requiredRoles={['marmista']}><MarmistaClientCatalogPage /></ProtectedRoute>} />
  <Route path="catalog/marmista/:id" element={<ProtectedRoute requiredRoles={['marmista']}><MarmistaClientDetailPage /></ProtectedRoute>} />
  <Route path="change-password" element={<ChangePasswordPage />} />
</Route>
```

- [ ] `git commit -m "feat: routing /client/* + redirect post-login per ruolo"`

---

## Task 7 — Frontend: API client + pagine client

**Files:** Create `frontend/src/lib/api/client.ts` + tutte le pagine client

- [ ] Crea `frontend/src/lib/api/client.ts`:

```ts
const BASE = '/api/client'
const req = (url: string, opts?: RequestInit) => fetch(url, { credentials: 'include', ...opts }).then(r => r.json())

export const clientApi = {
  me: () => req(`${BASE}/me`),
  catalog: {
    funeral: (params?: Record<string, string>) => req(`${BASE}/catalog/funeral?${new URLSearchParams(params)}`),
    funeralDetail: (id: string) => req(`${BASE}/catalog/funeral/${id}`),
    marmista: (params?: Record<string, string>) => req(`${BASE}/catalog/marmista?${new URLSearchParams(params)}`),
    marmistaDetail: (id: string) => req(`${BASE}/catalog/marmista/${id}`),
  },
  changePassword: (oldPassword: string, newPassword: string) =>
    req(`${BASE}/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword, newPassword }) }),
}
```

- [ ] Crea `ClientDashboard.tsx` — chiama `clientApi.me()`, mostra nome listino e dati manager
- [ ] Crea `FuneralCatalogPage.tsx` — griglia con filtri, chiama `clientApi.catalog.funeral()`
- [ ] Crea `FuneralDetailPage.tsx` — scheda cofano, misure, immagine, prezzo
- [ ] Crea `MarmistaClientCatalogPage.tsx` — griglia con filtro categoria
- [ ] Crea `MarmistaClientDetailPage.tsx` — accessori collegati, prezzo, link PDF
- [ ] Crea `ChangePasswordPage.tsx` — form 3 campi, chiama `clientApi.changePassword()`
- [ ] `git commit -m "feat: pagine client — dashboard, catalogo, dettaglio, cambio password"`

---

## Task 8 — PdfViewer

**Files:** Create `frontend/src/components/client/PdfViewer.tsx`

- [ ] `cd frontend && npm install react-pdf`
- [ ] Crea il componente:

```tsx
import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export default function PdfViewer({ url, initialPage = 1 }: { url: string; initialPage?: number }) {
  const [page, setPage] = useState(initialPage)
  const [total, setTotal] = useState(0)
  return (
    <div className="flex flex-col items-center gap-4">
      <Document file={url} onLoadSuccess={({ numPages }) => setTotal(numPages)}>
        <Page pageNumber={page} width={600} />
      </Document>
      <div className="flex items-center gap-4 text-sm text-[#6B7280]">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="border border-[#E5E0D8] px-3 py-1 disabled:opacity-40">‹</button>
        <span>Pagina {page} di {total}</span>
        <button onClick={() => setPage(p => Math.min(total, p + 1))} disabled={page >= total} className="border border-[#E5E0D8] px-3 py-1 disabled:opacity-40">›</button>
      </div>
    </div>
  )
}
```

- [ ] Usa `<PdfViewer url="/uploads/pdf/catalogo.pdf" initialPage={article.paginaPdf ?? 1} />` in `MarmistaClientDetailPage` e `FuneralDetailPage`
- [ ] `git commit -m "feat: PdfViewer react-pdf con navigazione pagina"`

---

## Task 9 — Smoke test finale

- [ ] `cd backend && npx vitest run` — tutti i test passano (inclusi client.test.ts)
- [ ] Avvia backend + frontend, accedi come Impresario Funebre → redirect a `/client/dashboard`
- [ ] Verifica che `/client/catalog/funeral` mostri prezzi del listino assegnato
- [ ] Verifica che accedere a `/client/catalog/marmista` come Impresario Funebre mostri 403
- [ ] Verifica che il PDF viewer apra alla pagina corretta
- [ ] `git commit -m "feat: Fase 5 — Area Clienti completa"`

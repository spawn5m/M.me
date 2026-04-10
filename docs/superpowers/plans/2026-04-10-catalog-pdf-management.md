# Catalog PDF Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementare la gestione completa dei cataloghi PDF: upload via UI admin, configurazione layout pagine singole/doppie, split automatico in background, e viewer clienti che usa le pagine splittate con numerazione corretta.

**Architecture:** Upload multipart → backend salva PDF + metadati layout su DB → split PDF in background con pdf-lib → frontend admin fa polling ogni 2s per mostrare progresso → viewer clienti usa `catalogPageToPdfFile()` per caricare la singola pagina splittata invece del PDF intero.

**Tech Stack:** Fastify v5, Prisma v7, pdf-lib, React 19, Tailwind CSS v4, Vitest, Zod.

---

## File Map

| File | Azione | Responsabilità |
|------|--------|----------------|
| `backend/prisma/schema.prisma` | Modifica | Aggiungi `PageType` enum + 5 campi a `PdfCatalog` |
| `backend/prisma/migrations/…` | Crea | Migration automatica Prisma |
| `backend/src/lib/catalogPageMap.ts` | Crea | Funzioni pure di mapping pagine catalogo ↔ file PDF |
| `backend/src/lib/__tests__/catalogPageMap.test.ts` | Crea | Test Vitest per catalogPageMap |
| `backend/src/lib/splitPdfService.ts` | Crea | Servizio split PDF chiamabile dal backend |
| `backend/src/lib/multipart.ts` | Modifica | Aggiungi costante limite PDF (100 MB) |
| `backend/src/types/shared.ts` | Modifica | Aggiungi tipi `CatalogLayout`, `CatalogStatus` |
| `backend/src/routes/catalog.ts` | Riscrivi | Implementa i 5 endpoint admin catalogo |
| `backend/src/routes/public.ts` | Modifica | Aggiungi `GET /catalog/:type/layout` |
| `backend/src/routes/__tests__/catalog.test.ts` | Modifica | Aggiorna test per nuovi endpoint |
| `frontend/src/lib/api/catalog.ts` | Crea | API client frontend per catalogo |
| `frontend/src/pages/admin/CatalogPdfPage.tsx` | Riscrivi | UI admin completa con due card |
| `frontend/src/components/catalog/AccessoriesView.tsx` | Modifica | Viewer usa pagine splittate + etichette corrette |

---

## Task 1: Schema DB — PageType enum + campi PdfCatalog

**Files:**
- Modify: `backend/prisma/schema.prisma` (righe 288-301)

- [ ] **Step 1.1: Aggiorna schema.prisma**

Sostituisci il blocco `PdfCatalog` esistente con:

```prisma
// ─── PDF Catalogo ─────────────────────────────────────────────────────────────

enum PdfCatalogType {
  accessories
  marmista
}

enum PageType {
  single
  double
}

model PdfCatalog {
  id            String         @id @default(cuid())
  filePath      String
  fileName      String
  type          PdfCatalogType @unique
  uploadedAt    DateTime       @default(now())
  layoutOffset  Int            @default(0)
  firstPageType PageType       @default(single)
  bodyPageType  PageType       @default(double)
  lastPageType  PageType       @default(single)
  totalPdfPages Int?
  pagesSlug     String?
}
```

- [ ] **Step 1.2: Crea e applica la migration**

```bash
cd backend
npx prisma migrate dev --name add_catalog_layout_fields
```

Output atteso: `The following migration(s) have been created and applied from new schema changes: migrations/…_add_catalog_layout_fields`

- [ ] **Step 1.3: Rigenera Prisma Client**

```bash
cd backend
npx prisma generate
```

- [ ] **Step 1.4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add PageType enum and layout fields to PdfCatalog"
```

---

## Task 2: catalogPageMap.ts — funzioni pure di mapping (TDD)

**Files:**
- Create: `backend/src/lib/catalogPageMap.ts`
- Create: `backend/src/lib/__tests__/catalogPageMap.test.ts`

- [ ] **Step 2.1: Scrivi i test (failing)**

Crea `backend/src/lib/__tests__/catalogPageMap.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { catalogPageToPdfFile, pdfFileToDisplayLabel } from '../catalogPageMap'
import type { CatalogLayout } from '../catalogPageMap'

// Layout helper
const lay = (overrides: Partial<CatalogLayout> = {}): CatalogLayout => ({
  offset: 0,
  firstPageType: 'single',
  bodyPageType: 'double',
  lastPageType: 'single',
  totalPdfPages: 111,
  ...overrides,
})

describe('catalogPageToPdfFile', () => {
  it('tutto singolo — pag.N → file N', () => {
    const layout = lay({ bodyPageType: 'single', totalPdfPages: 220 })
    expect(catalogPageToPdfFile(1, layout)).toBe(1)
    expect(catalogPageToPdfFile(42, layout)).toBe(42)
    expect(catalogPageToPdfFile(220, layout)).toBe(220)
  })

  it('tutto doppio — pag.1,2 → file 1, pag.3,4 → file 2', () => {
    const layout = lay({ firstPageType: 'double', bodyPageType: 'double', totalPdfPages: 110 })
    expect(catalogPageToPdfFile(1, layout)).toBe(1)
    expect(catalogPageToPdfFile(2, layout)).toBe(1)
    expect(catalogPageToPdfFile(3, layout)).toBe(2)
    expect(catalogPageToPdfFile(4, layout)).toBe(2)
    expect(catalogPageToPdfFile(5, layout)).toBe(3)
  })

  it('first=single body=double — copertina singola, resto spread', () => {
    const layout = lay()
    expect(catalogPageToPdfFile(1, layout)).toBe(1)   // copertina
    expect(catalogPageToPdfFile(2, layout)).toBe(2)   // spread 2-3
    expect(catalogPageToPdfFile(3, layout)).toBe(2)   // spread 2-3
    expect(catalogPageToPdfFile(4, layout)).toBe(3)   // spread 4-5
    expect(catalogPageToPdfFile(5, layout)).toBe(3)
    expect(catalogPageToPdfFile(220, layout)).toBe(111)
  })

  it('offset=2 — i primi 2 file PDF non sono numerati', () => {
    const layout = lay({ offset: 2, totalPdfPages: 113 })
    expect(catalogPageToPdfFile(1, layout)).toBe(3)   // base = 2+1 = 3
    expect(catalogPageToPdfFile(2, layout)).toBe(4)   // spread 2-3
    expect(catalogPageToPdfFile(3, layout)).toBe(4)
    expect(catalogPageToPdfFile(4, layout)).toBe(5)
  })

  it('first=double body=single — cover doppia, pagine singole', () => {
    const layout = lay({ firstPageType: 'double', bodyPageType: 'single', totalPdfPages: 219 })
    expect(catalogPageToPdfFile(1, layout)).toBe(1)
    expect(catalogPageToPdfFile(2, layout)).toBe(1)
    expect(catalogPageToPdfFile(3, layout)).toBe(2)
    expect(catalogPageToPdfFile(4, layout)).toBe(3)
    expect(catalogPageToPdfFile(100, layout)).toBe(99)
  })
})

describe('pdfFileToDisplayLabel', () => {
  it('first=single — file 1 è "p. 1"', () => {
    expect(pdfFileToDisplayLabel(1, lay())).toBe('p. 1')
  })

  it('body=double — file 2 è "pp. 2–3"', () => {
    expect(pdfFileToDisplayLabel(2, lay())).toBe('pp. 2–3')
    expect(pdfFileToDisplayLabel(3, lay())).toBe('pp. 4–5')
    expect(pdfFileToDisplayLabel(110, lay())).toBe('pp. 218–219')
  })

  it('last=single — ultimo file è pagina singola', () => {
    expect(pdfFileToDisplayLabel(111, lay())).toBe('p. 220')
  })

  it('first=double — file 1 è "pp. 1–2"', () => {
    const layout = lay({ firstPageType: 'double', totalPdfPages: 110 })
    expect(pdfFileToDisplayLabel(1, layout)).toBe('pp. 1–2')
    expect(pdfFileToDisplayLabel(2, layout)).toBe('pp. 3–4')
  })

  it('body=single — ogni file è pagina singola', () => {
    const layout = lay({ bodyPageType: 'single', totalPdfPages: 220 })
    expect(pdfFileToDisplayLabel(1, layout)).toBe('p. 1')
    expect(pdfFileToDisplayLabel(42, layout)).toBe('p. 42')
  })

  it('offset=2 — file prima del base restituisce "File N"', () => {
    const layout = lay({ offset: 2, totalPdfPages: 113 })
    expect(pdfFileToDisplayLabel(1, layout)).toBe('File 1')
    expect(pdfFileToDisplayLabel(2, layout)).toBe('File 2')
    expect(pdfFileToDisplayLabel(3, layout)).toBe('p. 1')  // base=3
  })
})
```

- [ ] **Step 2.2: Verifica che i test falliscano**

```bash
cd backend
npx vitest run src/lib/__tests__/catalogPageMap.test.ts
```

Output atteso: `FAIL … Cannot find module '../catalogPageMap'`

- [ ] **Step 2.3: Implementa catalogPageMap.ts**

Crea `backend/src/lib/catalogPageMap.ts`:

```typescript
export interface CatalogLayout {
  offset: number
  firstPageType: 'single' | 'double'
  bodyPageType: 'single' | 'double'
  lastPageType: 'single' | 'double'
  totalPdfPages: number
}

/**
 * Data la pagina del catalogo fisico (1-based, dalla prima pagina numerata),
 * restituisce l'indice del file PDF splittato (1-based).
 */
export function catalogPageToPdfFile(catalogPage: number, layout: CatalogLayout): number {
  const { offset, firstPageType, bodyPageType } = layout
  const base = offset + 1
  const stride = bodyPageType === 'single' ? 1 : 2

  if (firstPageType === 'single') {
    if (catalogPage === 1) return base
    return base + Math.ceil((catalogPage - 1) / stride)
  } else {
    if (catalogPage <= 2) return base
    return base + Math.ceil((catalogPage - 2) / stride)
  }
}

/**
 * Dato l'indice di un file PDF splittato (1-based), restituisce l'etichetta
 * leggibile delle pagine catalogo coperte (es. "pp. 4–5", "p. 1").
 */
export function pdfFileToDisplayLabel(pdfFileIndex: number, layout: CatalogLayout): string {
  const { offset, firstPageType, bodyPageType, lastPageType, totalPdfPages } = layout
  const base = offset + 1

  if (pdfFileIndex < base) return `File ${pdfFileIndex}`

  const relativeIndex = pdfFileIndex - base

  if (relativeIndex === 0) {
    return firstPageType === 'single' ? 'p. 1' : 'pp. 1–2'
  }

  const firstPagesCount = firstPageType === 'single' ? 1 : 2
  const bodyStride = bodyPageType === 'single' ? 1 : 2
  const bodyFileOffset = relativeIndex - 1
  const catalogPageStart = firstPagesCount + bodyFileOffset * bodyStride + 1

  const isLast = pdfFileIndex === totalPdfPages

  if (isLast && lastPageType === 'single') {
    return `p. ${catalogPageStart}`
  }

  if (bodyPageType === 'single') {
    return `p. ${catalogPageStart}`
  }

  return `pp. ${catalogPageStart}–${catalogPageStart + 1}`
}
```

- [ ] **Step 2.4: Verifica che i test passino**

```bash
cd backend
npx vitest run src/lib/__tests__/catalogPageMap.test.ts
```

Output atteso: `✓ … 11 tests passed`

- [ ] **Step 2.5: Commit**

```bash
git add backend/src/lib/catalogPageMap.ts backend/src/lib/__tests__/catalogPageMap.test.ts
git commit -m "feat(lib): add catalogPageMap with page mapping utilities"
```

---

## Task 3: splitPdfService.ts — split in background

**Files:**
- Create: `backend/src/lib/splitPdfService.ts`

- [ ] **Step 3.1: Crea splitPdfService.ts**

```typescript
import fs from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'
import type { FastifyBaseLogger } from 'fastify'
import type { PrismaClient } from '@prisma/client'

const UPLOADS_PDF = path.resolve(process.cwd(), '..', 'uploads', 'pdf')
const PAGES_DIR = path.join(UPLOADS_PDF, 'pages')

export function slugify(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function countSplitPages(slug: string): number {
  const dir = path.join(PAGES_DIR, slug)
  if (!fs.existsSync(dir)) return 0
  return fs.readdirSync(dir).filter((f) => f.endsWith('.pdf')).length
}

export function deleteSlugPages(slug: string): void {
  const dir = path.join(PAGES_DIR, slug)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

export async function runSplit(params: {
  catalogId: string
  filePath: string
  slug: string
  prisma: PrismaClient
  log: FastifyBaseLogger
}): Promise<void> {
  const { catalogId, filePath, slug, prisma, log } = params

  const outDir = path.join(PAGES_DIR, slug)
  fs.mkdirSync(outDir, { recursive: true })

  const bytes = fs.readFileSync(filePath)
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const total = srcDoc.getPageCount()

  await prisma.pdfCatalog.update({
    where: { id: catalogId },
    data: { totalPdfPages: total },
  })

  log.info({ slug, total }, 'Split PDF avviato')

  for (let i = 0; i < total; i++) {
    const pageNum = i + 1
    const outPath = path.join(outDir, `${pageNum}.pdf`)

    if (fs.existsSync(outPath)) continue

    const pageDoc = await PDFDocument.create()
    const [copied] = await pageDoc.copyPages(srcDoc, [i])
    pageDoc.addPage(copied)
    const pageBytes = await pageDoc.save()
    fs.writeFileSync(outPath, pageBytes)
  }

  log.info({ slug }, 'Split PDF completato')
}
```

- [ ] **Step 3.2: Commit**

```bash
git add backend/src/lib/splitPdfService.ts
git commit -m "feat(lib): add splitPdfService for background PDF splitting"
```

---

## Task 4: Tipi condivisi + costante PDF multipart

**Files:**
- Modify: `backend/src/lib/multipart.ts`
- Modify: `backend/src/types/shared.ts`

- [ ] **Step 4.1: Aggiungi costante PDF a multipart.ts**

Leggi il file attuale, poi aggiungi in fondo:

```typescript
export const PDF_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024   // 100 MB
export const PDF_MAX_FILE_SIZE_MB = PDF_MAX_FILE_SIZE_BYTES / (1024 * 1024)
```

- [ ] **Step 4.2: Aggiungi tipi condivisi in shared.ts**

Aggiungi in fondo a `backend/src/types/shared.ts`:

```typescript
// ─── Catalog PDF ──────────────────────────────────────────────────────────────

export interface CatalogLayout {
  offset: number
  firstPageType: 'single' | 'double'
  bodyPageType: 'single' | 'double'
  lastPageType: 'single' | 'double'
}

export interface CatalogStatus {
  type: 'accessories' | 'marmista'
  fileName: string
  uploadedAt: string
  totalPdfPages: number | null
  splitPages: number
  isComplete: boolean
  slug: string
  layout: CatalogLayout
}

export interface CatalogLayoutPublic {
  type: 'accessories' | 'marmista'
  slug: string
  totalPdfPages: number
  layout: CatalogLayout
}
```

- [ ] **Step 4.3: Commit**

```bash
git add backend/src/lib/multipart.ts backend/src/types/shared.ts
git commit -m "feat(types): add CatalogLayout and CatalogStatus shared types"
```

---

## Task 5: catalog.ts — implementa i 5 endpoint admin

**Files:**
- Rewrite: `backend/src/routes/catalog.ts`
- Modify: `backend/src/routes/__tests__/catalog.test.ts`

- [ ] **Step 5.1: Aggiorna i test esistenti + aggiungi nuovi test**

Riscrivi `backend/src/routes/__tests__/catalog.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import {
  buildTestApp,
  cleanupTestDb,
  getAuthCookie,
  seedTestUser,
} from '../../test-helper'
import { SYSTEM_PERMISSIONS, type PermissionCode } from '../../lib/authorization/permissions'

interface AuthorizationPermissionRecord {
  id: string
  code: string
}

interface AuthorizationPrismaClient {
  permission: {
    upsert(args: {
      where: { code: string }
      update: Record<string, unknown>
      create: {
        code: string
        resource: string
        action: string
        scope?: string | null
        label: string
        description: string
        isSystem: boolean
      }
    }): Promise<AuthorizationPermissionRecord>
  }
  rolePermission: {
    create(args: { data: { roleId: string; permissionId: string } }): Promise<unknown>
  }
}

function getAuthorizationPrisma(app: FastifyInstance): AuthorizationPrismaClient {
  return app.prisma as unknown as AuthorizationPrismaClient
}

async function ensurePermission(app: FastifyInstance, code: PermissionCode) {
  const definition = SYSTEM_PERMISSIONS.find((p) => p.code === code)
  if (!definition) throw new Error(`Permission ${code} non trovata`)
  return getAuthorizationPrisma(app).permission.upsert({
    where: { code },
    update: definition,
    create: definition,
  })
}

async function grantRolePermissions(
  app: FastifyInstance,
  roleName: string,
  permissionCodes: PermissionCode[],
) {
  const role = await app.prisma.role.findUnique({ where: { name: roleName } })
  if (!role) throw new Error(`Ruolo ${roleName} non trovato`)
  for (const code of permissionCodes) {
    const permission = await ensurePermission(app, code)
    await getAuthorizationPrisma(app).rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    })
  }
}

describe('Catalog routes', () => {
  let app: FastifyInstance
  let superAdminCookie: string
  let managerCookie: string

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(async () => {
    await cleanupTestDb(app)
    await seedTestUser(app, {
      email: 'catalog-superadmin@test.com',
      password: 'password123',
      roles: ['super_admin'],
    })
    await seedTestUser(app, {
      email: 'catalog-manager@test.com',
      password: 'password123',
      roles: ['manager'],
    })
    await grantRolePermissions(app, 'super_admin', ['catalog.pdf.read', 'catalog.pdf.write'])
    superAdminCookie = await getAuthCookie(app, 'catalog-superadmin@test.com', 'password123')
    managerCookie = await getAuthCookie(app, 'catalog-manager@test.com', 'password123')
  })

  describe('GET / — lista cataloghi', () => {
    it('nega senza catalog.pdf.read', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/catalog',
        headers: { cookie: managerCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it('ritorna lista vuota se nessun catalogo', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/catalog',
        headers: { cookie: superAdminCookie },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ data: [] })
    })
  })

  describe('GET /:type/status', () => {
    it('ritorna 404 se tipo non esiste', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/catalog/accessories/status',
        headers: { cookie: superAdminCookie },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('PUT /:type/layout', () => {
    it('ritorna 404 se catalogo non esiste', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/admin/catalog/accessories/layout',
        headers: { cookie: superAdminCookie, 'content-type': 'application/json' },
        payload: {
          layoutOffset: 0,
          firstPageType: 'single',
          bodyPageType: 'double',
          lastPageType: 'single',
        },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('DELETE /:type', () => {
    it('nega senza catalog.pdf.write', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/admin/catalog/accessories',
        headers: { cookie: managerCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it('ritorna 404 se catalogo non esiste', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/admin/catalog/accessories',
        headers: { cookie: superAdminCookie },
      })
      expect(res.statusCode).toBe(404)
    })
  })
})
```

- [ ] **Step 5.2: Esegui i test — devono fallire**

```bash
cd backend
npx vitest run src/routes/__tests__/catalog.test.ts
```

Output atteso: test falliscono perché le route ritornano 501.

- [ ] **Step 5.3: Implementa catalog.ts**

Riscrivi `backend/src/routes/catalog.ts`:

```typescript
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { pipeline } from 'stream/promises'
import * as fs from 'fs'
import * as path from 'path'
import { slugify, countSplitPages, deleteSlugPages, runSplit } from '../lib/splitPdfService'
import { PDF_MAX_FILE_SIZE_BYTES, PDF_MAX_FILE_SIZE_MB } from '../lib/multipart'

const UPLOADS_PDF = path.resolve(process.cwd(), '..', 'uploads', 'pdf')

const PDF_MIME_TYPE = 'application/pdf'

const layoutSchema = z.object({
  layoutOffset: z.coerce.number().int().min(0).default(0),
  firstPageType: z.enum(['single', 'double']).default('single'),
  bodyPageType: z.enum(['single', 'double']).default('double'),
  lastPageType: z.enum(['single', 'double']).default('single'),
})

const typeParamSchema = z.object({
  type: z.enum(['accessories', 'marmista']),
})

function isFileTooLarge(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'FST_REQ_FILE_TOO_LARGE'
}

const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  // GET / — lista cataloghi con stato split
  fastify.get('/', {
    preHandler: [fastify.checkPermission('catalog.pdf.read')],
  }, async (_req, reply) => {
    const catalogs = await fastify.prisma.pdfCatalog.findMany({
      orderBy: { type: 'asc' },
    })

    const data = catalogs.map((cat) => ({
      id: cat.id,
      type: cat.type,
      fileName: cat.fileName,
      uploadedAt: cat.uploadedAt.toISOString(),
      totalPdfPages: cat.totalPdfPages,
      splitPages: cat.pagesSlug ? countSplitPages(cat.pagesSlug) : 0,
      isComplete: cat.pagesSlug
        ? countSplitPages(cat.pagesSlug) === cat.totalPdfPages && cat.totalPdfPages !== null
        : false,
      slug: cat.pagesSlug ?? '',
      layout: {
        offset: cat.layoutOffset,
        firstPageType: cat.firstPageType,
        bodyPageType: cat.bodyPageType,
        lastPageType: cat.lastPageType,
      },
    }))

    return reply.send({ data })
  })

  // POST / — upload PDF + layout → avvia split in background
  fastify.post('/', {
    preHandler: [fastify.checkPermission('catalog.pdf.write')],
  }, async (req, reply) => {
    const parts = req.parts({ limits: { fileSize: PDF_MAX_FILE_SIZE_BYTES } })

    let filePart: Awaited<ReturnType<typeof req.file>> | null = null
    const fields: Record<string, string> = {}

    for await (const part of parts) {
      if (part.type === 'file') {
        filePart = part
        // Consuma lo stream salvando su disco dopo la validazione
      } else {
        fields[part.fieldname] = String(part.value)
      }
    }

    if (!filePart) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Nessun file PDF inviato.',
        statusCode: 400,
      })
    }

    if (filePart.mimetype !== PDF_MIME_TYPE) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Formato non supportato. Invia un file PDF.',
        statusCode: 400,
      })
    }

    const typeResult = typeParamSchema.safeParse({ type: fields['type'] })
    if (!typeResult.success) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Campo "type" non valido. Usa "accessories" o "marmista".',
        statusCode: 400,
      })
    }

    const layoutResult = layoutSchema.safeParse(fields)
    if (!layoutResult.success) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Dati layout non validi.',
        statusCode: 400,
      })
    }

    const { type } = typeResult.data
    const layout = layoutResult.data
    const fileName = filePart.filename
    const slug = slugify(fileName)

    // Cancella pagine del vecchio catalogo se esiste
    const existing = await fastify.prisma.pdfCatalog.findUnique({ where: { type } })
    if (existing?.pagesSlug) {
      deleteSlugPages(existing.pagesSlug)
    }
    if (existing?.filePath && existing.filePath !== path.join(UPLOADS_PDF, fileName)) {
      fs.rmSync(existing.filePath, { force: true })
    }

    // Salva il file su disco
    fs.mkdirSync(UPLOADS_PDF, { recursive: true })
    const filePath = path.join(UPLOADS_PDF, fileName)

    try {
      await pipeline(filePart.file, fs.createWriteStream(filePath))
    } catch (error) {
      fs.rmSync(filePath, { force: true })
      if (isFileTooLarge(error)) {
        return reply.status(413).send({
          error: 'PayloadTooLarge',
          message: `File troppo grande. Dimensione massima ${PDF_MAX_FILE_SIZE_MB} MB.`,
          statusCode: 413,
        })
      }
      throw error
    }

    if (filePart.file.truncated) {
      fs.rmSync(filePath, { force: true })
      return reply.status(413).send({
        error: 'PayloadTooLarge',
        message: `File troppo grande. Dimensione massima ${PDF_MAX_FILE_SIZE_MB} MB.`,
        statusCode: 413,
      })
    }

    // Salva/aggiorna su DB
    const catalog = await fastify.prisma.pdfCatalog.upsert({
      where: { type },
      create: {
        type,
        fileName,
        filePath,
        pagesSlug: slug,
        layoutOffset: layout.layoutOffset,
        firstPageType: layout.firstPageType as 'single' | 'double',
        bodyPageType: layout.bodyPageType as 'single' | 'double',
        lastPageType: layout.lastPageType as 'single' | 'double',
      },
      update: {
        fileName,
        filePath,
        pagesSlug: slug,
        totalPdfPages: null,
        uploadedAt: new Date(),
        layoutOffset: layout.layoutOffset,
        firstPageType: layout.firstPageType as 'single' | 'double',
        bodyPageType: layout.bodyPageType as 'single' | 'double',
        lastPageType: layout.lastPageType as 'single' | 'double',
      },
    })

    // Avvia split in background (non awaited)
    void runSplit({
      catalogId: catalog.id,
      filePath,
      slug,
      prisma: fastify.prisma,
      log: fastify.log,
    })

    return reply.status(202).send({
      id: catalog.id,
      type: catalog.type,
      status: 'splitting',
    })
  })

  // GET /:type/status — stato split corrente
  fastify.get('/:type/status', {
    preHandler: [fastify.checkPermission('catalog.pdf.read')],
  }, async (req, reply) => {
    const paramResult = typeParamSchema.safeParse(req.params)
    if (!paramResult.success) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Tipo non valido.',
        statusCode: 400,
      })
    }

    const { type } = paramResult.data
    const catalog = await fastify.prisma.pdfCatalog.findUnique({ where: { type } })

    if (!catalog) {
      return reply.status(404).send({
        error: 'NotFound',
        message: `Nessun catalogo di tipo "${type}" trovato.`,
        statusCode: 404,
      })
    }

    const splitPages = catalog.pagesSlug ? countSplitPages(catalog.pagesSlug) : 0
    const isComplete =
      catalog.totalPdfPages !== null && splitPages === catalog.totalPdfPages

    return reply.send({
      type: catalog.type,
      fileName: catalog.fileName,
      uploadedAt: catalog.uploadedAt.toISOString(),
      totalPdfPages: catalog.totalPdfPages,
      splitPages,
      isComplete,
      slug: catalog.pagesSlug ?? '',
      layout: {
        offset: catalog.layoutOffset,
        firstPageType: catalog.firstPageType,
        bodyPageType: catalog.bodyPageType,
        lastPageType: catalog.lastPageType,
      },
    })
  })

  // PUT /:type/layout — aggiorna layout senza re-upload
  fastify.put('/:type/layout', {
    preHandler: [fastify.checkPermission('catalog.pdf.write')],
  }, async (req, reply) => {
    const paramResult = typeParamSchema.safeParse(req.params)
    if (!paramResult.success) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Tipo non valido.', statusCode: 400 })
    }

    const bodyResult = layoutSchema.safeParse(req.body)
    if (!bodyResult.success) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Dati layout non validi.', statusCode: 400 })
    }

    const { type } = paramResult.data
    const layout = bodyResult.data

    const catalog = await fastify.prisma.pdfCatalog.findUnique({ where: { type } })
    if (!catalog) {
      return reply.status(404).send({
        error: 'NotFound',
        message: `Nessun catalogo di tipo "${type}" trovato.`,
        statusCode: 404,
      })
    }

    const updated = await fastify.prisma.pdfCatalog.update({
      where: { type },
      data: {
        layoutOffset: layout.layoutOffset,
        firstPageType: layout.firstPageType as 'single' | 'double',
        bodyPageType: layout.bodyPageType as 'single' | 'double',
        lastPageType: layout.lastPageType as 'single' | 'double',
      },
    })

    return reply.send({
      type: updated.type,
      layout: {
        offset: updated.layoutOffset,
        firstPageType: updated.firstPageType,
        bodyPageType: updated.bodyPageType,
        lastPageType: updated.lastPageType,
      },
    })
  })

  // DELETE /:type — rimuove catalogo e pagine splittate
  fastify.delete('/:type', {
    preHandler: [fastify.checkPermission('catalog.pdf.write')],
  }, async (req, reply) => {
    const paramResult = typeParamSchema.safeParse(req.params)
    if (!paramResult.success) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Tipo non valido.', statusCode: 400 })
    }

    const { type } = paramResult.data
    const catalog = await fastify.prisma.pdfCatalog.findUnique({ where: { type } })

    if (!catalog) {
      return reply.status(404).send({
        error: 'NotFound',
        message: `Nessun catalogo di tipo "${type}" trovato.`,
        statusCode: 404,
      })
    }

    if (catalog.pagesSlug) deleteSlugPages(catalog.pagesSlug)
    if (catalog.filePath) fs.rmSync(catalog.filePath, { force: true })

    await fastify.prisma.pdfCatalog.delete({ where: { type } })

    return reply.status(204).send()
  })
}

export default catalogRoutes
```

- [ ] **Step 5.4: Esegui i test**

```bash
cd backend
npx vitest run src/routes/__tests__/catalog.test.ts
```

Output atteso: tutti i test passano.

- [ ] **Step 5.5: Commit**

```bash
git add backend/src/routes/catalog.ts backend/src/routes/__tests__/catalog.test.ts
git commit -m "feat(routes): implement catalog PDF admin endpoints"
```

---

## Task 6: public.ts — endpoint layout pubblico

**Files:**
- Modify: `backend/src/routes/public.ts`

- [ ] **Step 6.1: Aggiungi import e route in fondo a public.ts**

Cerca la riga `export default publicRoutes` e inserisci prima di essa:

```typescript
  // GET /catalog/:type/layout — dati layout pubblici per il viewer clienti
  fastify.get('/catalog/:type/layout', async (req, reply) => {
    const typeParam = (req.params as { type?: string }).type
    if (typeParam !== 'accessories' && typeParam !== 'marmista') {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Tipo non valido.',
        statusCode: 400,
      })
    }

    const catalog = await fastify.prisma.pdfCatalog.findUnique({
      where: { type: typeParam },
    })

    if (!catalog || !catalog.pagesSlug || catalog.totalPdfPages === null) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Catalogo non disponibile.',
        statusCode: 404,
      })
    }

    return reply.send({
      type: catalog.type,
      slug: catalog.pagesSlug,
      totalPdfPages: catalog.totalPdfPages,
      layout: {
        offset: catalog.layoutOffset,
        firstPageType: catalog.firstPageType,
        bodyPageType: catalog.bodyPageType,
        lastPageType: catalog.lastPageType,
      },
    })
  })
```

- [ ] **Step 6.2: Esegui i test public**

```bash
cd backend
npx vitest run src/routes/__tests__/public.test.ts
```

Output atteso: nessun test regredisce.

- [ ] **Step 6.3: Commit**

```bash
git add backend/src/routes/public.ts
git commit -m "feat(routes): add public catalog layout endpoint"
```

---

## Task 7: Frontend — API client catalogo

**Files:**
- Create: `frontend/src/lib/api/catalog.ts`

- [ ] **Step 7.1: Crea il client API**

```typescript
import api from '../api'
import type { CatalogStatus, CatalogLayoutPublic, CatalogLayout } from '../../../../backend/src/types/shared'

export interface CatalogListResponse {
  data: CatalogStatus[]
}

export const catalogApi = {
  list: () =>
    api.get<CatalogListResponse>('/admin/catalog').then((r) => r.data),

  status: (type: 'accessories' | 'marmista') =>
    api.get<CatalogStatus>(`/admin/catalog/${type}/status`).then((r) => r.data),

  upload: (
    type: 'accessories' | 'marmista',
    file: File,
    layout: CatalogLayout & { layoutOffset: number },
  ) => {
    const form = new FormData()
    form.append('file', file)
    form.append('type', type)
    form.append('layoutOffset', String(layout.layoutOffset))
    form.append('firstPageType', layout.firstPageType)
    form.append('bodyPageType', layout.bodyPageType)
    form.append('lastPageType', layout.lastPageType)
    return api.post<{ id: string; type: string; status: string }>('/admin/catalog', form).then((r) => r.data)
  },

  updateLayout: (
    type: 'accessories' | 'marmista',
    layout: CatalogLayout & { layoutOffset: number },
  ) =>
    api
      .put<{ type: string; layout: CatalogLayout }>(`/admin/catalog/${type}/layout`, {
        layoutOffset: layout.layoutOffset,
        firstPageType: layout.firstPageType,
        bodyPageType: layout.bodyPageType,
        lastPageType: layout.lastPageType,
      })
      .then((r) => r.data),

  remove: (type: 'accessories' | 'marmista') =>
    api.delete(`/admin/catalog/${type}`),

  publicLayout: (type: 'accessories' | 'marmista') =>
    api.get<CatalogLayoutPublic>(`/public/catalog/${type}/layout`).then((r) => r.data),
}
```

- [ ] **Step 7.2: Commit**

```bash
git add frontend/src/lib/api/catalog.ts
git commit -m "feat(frontend): add catalog API client"
```

---

## Task 8: CatalogPdfPage.tsx — UI admin completa

**Files:**
- Rewrite: `frontend/src/pages/admin/CatalogPdfPage.tsx`

- [ ] **Step 8.1: Riscrivi CatalogPdfPage.tsx**

```tsx
import { useState, useEffect, useRef } from 'react'
import { catalogApi } from '../../lib/api/catalog'
import type { CatalogStatus } from '../../../../backend/src/types/shared'

interface LayoutForm {
  layoutOffset: number
  firstPageType: 'single' | 'double'
  bodyPageType: 'single' | 'double'
  lastPageType: 'single' | 'double'
}

const DEFAULT_LAYOUT: LayoutForm = {
  layoutOffset: 0,
  firstPageType: 'single',
  bodyPageType: 'double',
  lastPageType: 'single',
}

interface CatalogCardProps {
  type: 'accessories' | 'marmista'
  title: string
}

function CatalogCard({ type, title }: CatalogCardProps) {
  const [status, setStatus] = useState<CatalogStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<LayoutForm>(DEFAULT_LAYOUT)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isEditingLayout, setIsEditingLayout] = useState(false)
  const [editForm, setEditForm] = useState<LayoutForm>(DEFAULT_LAYOUT)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const fetchStatus = async () => {
    try {
      const s = await catalogApi.status(type)
      setStatus(s)
      if (s.isComplete) stopPolling()
    } catch {
      // 404 = nessun catalogo
      setStatus(null)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchStatus().finally(() => setLoading(false))
    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  useEffect(() => {
    if (status && !status.isComplete && !pollingRef.current) {
      pollingRef.current = setInterval(() => void fetchStatus(), 2000)
    }
    if (status?.isComplete) stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.isComplete])

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      setUploadError('Seleziona un file PDF.')
      return
    }
    setSelectedFile(file)
    setUploadError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setUploadError(null)
    try {
      await catalogApi.upload(type, selectedFile, form)
      setSelectedFile(null)
      await fetchStatus()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Errore durante il caricamento.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpdateLayout = async () => {
    try {
      await catalogApi.updateLayout(type, editForm)
      await fetchStatus()
      setIsEditingLayout(false)
    } catch {
      // errore silenzioso — mostrato nel form
    }
  }

  const handleDelete = async () => {
    if (!confirm('Eliminare il catalogo e tutte le pagine splittate?')) return
    try {
      await catalogApi.remove(type)
      setStatus(null)
      stopPolling()
    } catch {
      // noop
    }
  }

  const progressPercent =
    status && status.totalPdfPages
      ? Math.round((status.splitPages / status.totalPdfPages) * 100)
      : 0

  // Riepilogo mapping (prime 3 + ultima riga)
  const mappingPreview = (() => {
    if (!status?.isComplete || !status.totalPdfPages) return []
    const { catalogApi: _unused, ..._ } = { catalogApi: null }
    void _unused
    // Importa le funzioni dal modulo shared (non disponibile in frontend diretto)
    // Mostriamo solo info base dal layout
    const { layout, totalPdfPages } = status
    const rows: { file: number; label: string }[] = []
    const stride = layout.bodyPageType === 'single' ? 1 : 2
    const base = layout.offset + 1

    const getLabel = (fileIdx: number): string => {
      const rel = fileIdx - base
      if (rel < 0) return `File ${fileIdx}`
      if (rel === 0) return layout.firstPageType === 'single' ? 'p. 1' : 'pp. 1–2'
      const fp = layout.firstPageType === 'single' ? 1 : 2
      const start = fp + (rel - 1) * stride + 1
      const isLast = fileIdx === totalPdfPages
      if (isLast && layout.lastPageType === 'single') return `p. ${start}`
      if (layout.bodyPageType === 'single') return `p. ${start}`
      return `pp. ${start}–${start + 1}`
    }

    for (let i = base; i <= Math.min(base + 2, totalPdfPages); i++) {
      rows.push({ file: i, label: getLabel(i) })
    }
    if (totalPdfPages > base + 2) {
      rows.push({ file: totalPdfPages, label: getLabel(totalPdfPages) })
    }
    return rows
  })()

  const LayoutFields = ({
    value,
    onChange,
    readonly = false,
  }: {
    value: LayoutForm
    onChange?: (v: LayoutForm) => void
    readonly?: boolean
  }) => (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B7280] mb-1">
          Pagine senza numero (offset)
        </label>
        {readonly ? (
          <p className="text-sm text-[#1A2B4A] font-mono">{value.layoutOffset}</p>
        ) : (
          <input
            type="number"
            min={0}
            value={value.layoutOffset}
            onChange={(e) => onChange?.({ ...value, layoutOffset: parseInt(e.target.value) || 0 })}
            className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm text-[#1A2B4A] focus:border-[#C9A96E] focus:outline-none"
          />
        )}
      </div>
      {(['firstPageType', 'bodyPageType', 'lastPageType'] as const).map((field) => {
        const labels: Record<typeof field, string> = {
          firstPageType: 'Prima pagina',
          bodyPageType: 'Pagine corpo',
          lastPageType: 'Ultima pagina',
        }
        return (
          <div key={field}>
            <label className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#6B7280] mb-1">
              {labels[field]}
            </label>
            {readonly ? (
              <p className="text-sm text-[#1A2B4A] capitalize">{value[field]}</p>
            ) : (
              <select
                value={value[field]}
                onChange={(e) =>
                  onChange?.({ ...value, [field]: e.target.value as 'single' | 'double' })
                }
                className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm text-[#1A2B4A] focus:border-[#C9A96E] focus:outline-none"
              >
                <option value="single">Singola</option>
                <option value="double">Doppia (spread)</option>
              </select>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="bg-white border border-[#E5E0D8] shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
      {/* Header card */}
      <div className="px-6 py-4 border-b border-[#E5E0D8] flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-[0.16em] text-[#1A2B4A]">{title}</h3>
        {status && (
          <button
            onClick={() => void handleDelete()}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Elimina
          </button>
        )}
      </div>

      <div className="p-6 space-y-5">
        {loading && (
          <p className="text-sm text-[#6B7280]">Caricamento…</p>
        )}

        {/* ── STATO VUOTO ── */}
        {!loading && !status && (
          <>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded cursor-pointer flex flex-col items-center justify-center py-10 transition-colors ${
                isDragging ? 'border-[#C9A96E] bg-[#FAF9F6]' : 'border-[#E5E0D8] hover:border-[#C9A96E]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
              />
              <svg className="w-8 h-8 text-[#C9A96E] mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              {selectedFile ? (
                <p className="text-sm font-medium text-[#1A2B4A]">{selectedFile.name}</p>
              ) : (
                <>
                  <p className="text-sm text-[#6B7280]">Trascina il PDF qui oppure</p>
                  <p className="text-xs text-[#C9A96E] font-medium mt-1">clicca per selezionare</p>
                </>
              )}
            </div>

            {/* Layout form */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#031634] mb-3">
                Configurazione layout pagine
              </p>
              <LayoutFields value={form} onChange={setForm} />
            </div>

            {uploadError && (
              <p className="text-xs text-red-600">{uploadError}</p>
            )}

            <button
              disabled={!selectedFile || isUploading}
              onClick={() => void handleUpload()}
              className="w-full py-3 bg-[#031634] text-white text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#1A2B4A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Caricamento in corso…' : 'Carica e avvia split'}
            </button>
          </>
        )}

        {/* ── SPLIT IN CORSO ── */}
        {!loading && status && !status.isComplete && (
          <>
            <div>
              <p className="text-xs font-medium text-[#1A2B4A] truncate">{status.fileName}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5">
                Caricato il {new Date(status.uploadedAt).toLocaleDateString('it-IT')}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#6B7280]">
                  Split in corso…
                </p>
                <span className="font-mono text-xs text-[#1A2B4A]">
                  {status.splitPages}/{status.totalPdfPages ?? '?'} ({progressPercent}%)
                </span>
              </div>
              <div className="h-1.5 bg-[#E5E0D8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C9A96E] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#031634] mb-2">
                Layout configurato
              </p>
              <LayoutFields value={{
                layoutOffset: status.layout.offset,
                firstPageType: status.layout.firstPageType,
                bodyPageType: status.layout.bodyPageType,
                lastPageType: status.layout.lastPageType,
              }} readonly />
            </div>
          </>
        )}

        {/* ── SPLIT COMPLETATO ── */}
        {!loading && status && status.isComplete && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#1A2B4A] truncate">{status.fileName}</p>
                <p className="text-[10px] text-[#6B7280] mt-0.5">
                  {status.totalPdfPages} pagine · {new Date(status.uploadedAt).toLocaleDateString('it-IT')}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 border border-green-200 bg-green-50 px-2 py-1">
                ✓ Pronto
              </span>
            </div>

            {/* Layout con modifica */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#031634]">
                  Layout pagine
                </p>
                {!isEditingLayout && (
                  <button
                    onClick={() => {
                      setEditForm({
                        layoutOffset: status.layout.offset,
                        firstPageType: status.layout.firstPageType,
                        bodyPageType: status.layout.bodyPageType,
                        lastPageType: status.layout.lastPageType,
                      })
                      setIsEditingLayout(true)
                    }}
                    className="text-xs text-[#C9A96E] hover:underline"
                  >
                    Modifica
                  </button>
                )}
              </div>
              {isEditingLayout ? (
                <>
                  <LayoutFields value={editForm} onChange={setEditForm} />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => void handleUpdateLayout()}
                      className="px-4 py-2 bg-[#031634] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#1A2B4A] transition-colors"
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => setIsEditingLayout(false)}
                      className="px-4 py-2 border border-[#E5E0D8] text-xs text-[#6B7280] hover:text-[#031634] transition-colors"
                    >
                      Annulla
                    </button>
                  </div>
                </>
              ) : (
                <LayoutFields value={{
                  layoutOffset: status.layout.offset,
                  firstPageType: status.layout.firstPageType,
                  bodyPageType: status.layout.bodyPageType,
                  lastPageType: status.layout.lastPageType,
                }} readonly />
              )}
            </div>

            {/* Riepilogo mapping */}
            {mappingPreview.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#031634] mb-2">
                  Anteprima mapping
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#6B7280] border-b border-[#E5E0D8]">
                      <th className="text-left py-1 font-medium">File PDF</th>
                      <th className="text-left py-1 font-medium">Pagine catalogo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappingPreview.map((row, i) => (
                      <tr key={row.file} className={`border-b border-[#F4F3F0] ${i === mappingPreview.length - 1 && mappingPreview.length > 3 ? 'opacity-50 italic' : ''}`}>
                        <td className="py-1 font-mono text-[#C9A96E]">{row.file}.pdf</td>
                        <td className="py-1 text-[#1A2B4A]">{row.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ricarica PDF */}
            <div className="border-t border-[#E5E0D8] pt-4">
              <p className="text-[10px] text-[#6B7280] mb-2">Sostituisci il catalogo attuale:</p>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  id={`reload-${type}`}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                />
                <label
                  htmlFor={`reload-${type}`}
                  className="px-4 py-2 border border-[#031634] text-xs font-semibold uppercase tracking-[0.14em] text-[#031634] hover:bg-[#031634] hover:text-white transition-colors cursor-pointer"
                >
                  Seleziona nuovo PDF
                </label>
                {selectedFile && (
                  <button
                    onClick={() => void handleUpload()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-[#031634] text-white text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#1A2B4A] transition-colors disabled:opacity-50"
                  >
                    {isUploading ? '…' : 'Carica'}
                  </button>
                )}
              </div>
              {selectedFile && !isUploading && (
                <p className="text-[10px] text-[#6B7280] mt-1">{selectedFile.name}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function CatalogPdfPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">Gestione</p>
        <h2 className="text-2xl text-[#031634]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Catalogo PDF
        </h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          Carica i cataloghi PDF, configura il layout pagine e avvia lo split automatico.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CatalogCard type="accessories" title="Catalogo Accessori" />
        <CatalogCard type="marmista" title="Catalogo Marmista" />
      </div>
    </div>
  )
}
```

- [ ] **Step 8.2: Verifica visiva — apri il browser**

```bash
cd frontend && npm run dev
```

Naviga su `http://localhost:5173/admin/catalog`. Verifica:
- Appaiono due card affiancate (Accessori / Marmista)
- La card mostra il form di upload se nessun catalogo è presente
- I 4 campi layout sono visibili e interagibili

- [ ] **Step 8.3: Commit**

```bash
git add frontend/src/pages/admin/CatalogPdfPage.tsx
git commit -m "feat(admin): implement catalog PDF management page with upload and progress polling"
```

---

## Task 9: AccessoriesView.tsx — viewer con pagine splittate

**Files:**
- Modify: `frontend/src/components/catalog/AccessoriesView.tsx`

- [ ] **Step 9.1: Aggiungi import e stato layout**

In cima al file, aggiungi l'import:

```typescript
import { catalogApi } from '../../lib/api/catalog'
import type { CatalogLayoutPublic } from '../../../../backend/src/types/shared'
import { catalogPageToPdfFile, pdfFileToDisplayLabel } from '../../../../backend/src/lib/catalogPageMap'
```

Nota: le funzioni pure `catalogPageToPdfFile` e `pdfFileToDisplayLabel` sono importabili direttamente dal backend perché sono puro TypeScript senza dipendenze Node.js.

- [ ] **Step 9.2: Aggiungi stato layout nel componente**

Subito dopo le `useState` esistenti in `AccessoriesView`, aggiungi:

```typescript
const [catalogLayoutData, setCatalogLayoutData] = useState<CatalogLayoutPublic | null>(null)

useEffect(() => {
  catalogApi.publicLayout('accessories')
    .then((data) => setCatalogLayoutData(data))
    .catch(() => setCatalogLayoutData(null))
}, [])
```

- [ ] **Step 9.3: Aggiorna il calcolo di pdfSrc e l'etichetta**

Sostituisci:

```typescript
const pdfSrc = activeItem?.pdfPage
  ? `${catalogPdfUrl}#page=${activeItem.pdfPage}`
  : catalogPdfUrl
```

Con:

```typescript
const pdfSrc = (() => {
  if (!activeItem?.pdfPage) return catalogPdfUrl
  if (catalogLayoutData?.slug && catalogLayoutData.totalPdfPages) {
    const layout = {
      offset: catalogLayoutData.layout.offset,
      firstPageType: catalogLayoutData.layout.firstPageType,
      bodyPageType: catalogLayoutData.layout.bodyPageType,
      lastPageType: catalogLayoutData.layout.lastPageType,
      totalPdfPages: catalogLayoutData.totalPdfPages,
    }
    const fileIdx = catalogPageToPdfFile(activeItem.pdfPage, layout)
    return `/uploads/pdf/pages/${catalogLayoutData.slug}/${fileIdx}.pdf`
  }
  return `${catalogPdfUrl}#page=${activeItem.pdfPage}`
})()

const pdfPageLabel = (() => {
  if (!activeItem?.pdfPage) return null
  if (catalogLayoutData?.slug && catalogLayoutData.totalPdfPages) {
    const layout = {
      offset: catalogLayoutData.layout.offset,
      firstPageType: catalogLayoutData.layout.firstPageType,
      bodyPageType: catalogLayoutData.layout.bodyPageType,
      lastPageType: catalogLayoutData.layout.lastPageType,
      totalPdfPages: catalogLayoutData.totalPdfPages,
    }
    const fileIdx = catalogPageToPdfFile(activeItem.pdfPage, layout)
    return pdfFileToDisplayLabel(fileIdx, layout)
  }
  return `p. ${activeItem.pdfPage}`
})()
```

- [ ] **Step 9.4: Aggiorna l'etichetta nella barra info**

Trova il rendering dell'etichetta pagina PDF:

```tsx
{activeItem.pdfPage !== undefined && (
  <span className="font-mono text-[10px] text-[#6B7280] shrink-0">
    {t('catalog.pdfPage')} {activeItem.pdfPage}
  </span>
)}
```

Sostituisci con:

```tsx
{pdfPageLabel !== null && (
  <span className="font-mono text-[10px] text-[#6B7280] shrink-0">
    {pdfPageLabel}
  </span>
)}
```

- [ ] **Step 9.5: Verifica visiva**

Naviga sulla pagina accessori clienti. Verifica:
- Se il catalogo accessori ha pagine splittate: l'iframe carica `/uploads/pdf/pages/{slug}/N.pdf`
- La barra in alto mostra "pp. 4–5" invece di "Pagina 3"
- Se nessun catalogo è configurato: fallback a `#page=N` sul PDF intero

- [ ] **Step 9.6: Commit**

```bash
git add frontend/src/components/catalog/AccessoriesView.tsx
git commit -m "feat(viewer): use split pages and correct catalog page labels in accessories viewer"
```

---

## Task 10: Test suite finale

- [ ] **Step 10.1: Esegui tutti i test backend**

```bash
cd backend
npx vitest run
```

Output atteso: nessun test fallisce.

- [ ] **Step 10.2: Build frontend**

```bash
cd frontend
npm run build
```

Output atteso: nessun errore TypeScript.

- [ ] **Step 10.3: Commit finale**

```bash
git add -A
git commit -m "feat: complete catalog PDF management system with split and viewer"
```

---

## Self-Review checklist

- [x] **Schema DB** → Task 1
- [x] **catalogPageMap pure functions** → Task 2 (TDD completo)
- [x] **splitPdfService** → Task 3
- [x] **multipart limit 100MB** → Task 4 (costante aggiunta)
- [x] **5 endpoint admin catalog** → Task 5
- [x] **endpoint pubblico layout** → Task 6
- [x] **Frontend API client** → Task 7
- [x] **Admin page con 3 stati** → Task 8
- [x] **Viewer usa split pages + etichette** → Task 9
- [x] **Polling ogni 2s** → Task 8 (useEffect + setInterval)
- [x] **Cancellazione vecchie pagine** → Task 5 (deleteSlugPages prima dell'upload)
- [x] **MIME validation** → Task 5 (application/pdf check)
- [x] **Fallback se layout non disponibile** → Task 9 (fallback a #page=N)

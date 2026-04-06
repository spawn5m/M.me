# Fase 4 Backend — Articoli, Lookup e Listini

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementare CRUD completo per lookup, articoli (+ import Excel) e listini prezzi con motore di calcolo.

**Architecture:** Backend-first per layer. Schema Prisma → Lookup API → Articoli API → Listini API. Ogni layer testato prima di procedere. priceEngine.ts esistente integrato nelle route listini.

**Tech Stack:** Fastify v5, Prisma v6, PostgreSQL 16, Zod, Vitest, xlsx (parsing Excel), multer (upload file)

---

## File Structure

**Nuovi file:**
- `backend/src/routes/lookups.ts` — CRUD generico lookup
- `backend/src/routes/articles/coffins.ts`
- `backend/src/routes/articles/accessories.ts`
- `backend/src/routes/articles/marmista.ts`
- `backend/src/lib/excelImporter.ts` — parsing + validazione Excel
- `backend/src/routes/__tests__/lookups.test.ts`
- `backend/src/routes/__tests__/articles.test.ts`
- `backend/src/routes/__tests__/pricelists.test.ts`

**File modificati:**
- `backend/prisma/schema.prisma` — enum ArticleType, campi User, campo PriceList
- `backend/src/app.ts` — registra nuove route
- `backend/src/routes/pricelists.ts` — implementazione completa
- `backend/src/types/shared.ts` — nuovi tipi Admin*

---

### Task 1: Migration Prisma

**Files:**
- Modify: `backend/prisma/schema.prisma`
- New migration via `prisma migrate dev`

- [ ] Aggiungi enum e campi in schema.prisma:

```prisma
enum ArticleType {
  funeral
  marmista
}

// In model PriceList — aggiungere:
articleType ArticleType

// In model User — aggiungere:
funeralPriceListId  String?
marmistaPriceListId String?
funeralPriceList    PriceList? @relation("UserFuneralPL", fields: [funeralPriceListId], references: [id])
marmistaPriceList   PriceList? @relation("UserMarmistaPL", fields: [marmistaPriceListId], references: [id])
```

- [ ] Esegui migration:
```bash
cd backend && npx prisma migrate dev --name fase4-articletype-and-user-pricelists
```
Atteso: migration applicata senza errori.

- [ ] Verifica con `npx prisma studio` o query diretta che i campi esistano.

- [ ] Commit:
```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: migration — ArticleType enum + User price list assignment"
```

---

### Task 2: Tipi condivisi

**Files:**
- Modify: `backend/src/types/shared.ts`

- [ ] Aggiungi in fondo al file:

```ts
export type ArticleType = 'funeral' | 'marmista'

export interface AdminLookup { id: string; code: string; label: string }

export interface AdminCoffinArticle {
  id: string; code: string; description: string; notes: string | null
  imageUrl: string | null; measure: AdminLookup | null
  categories: AdminLookup[]; subcategories: AdminLookup[]
  essences: AdminLookup[]; figures: AdminLookup[]
  colors: AdminLookup[]; finishes: AdminLookup[]
}

export interface AdminAccessoryArticle {
  id: string; code: string; description: string; notes: string | null
  imageUrl: string | null; pdfPage: number | null
  categories: AdminLookup[]; subcategories: AdminLookup[]
}

export interface AdminMarmistaArticle {
  id: string; code: string; description: string; notes: string | null
  pdfPage: number | null; publicPrice: number | null
  accessory: AdminLookup | null; categories: AdminLookup[]
}

export interface AdminPriceList {
  id: string; name: string; type: PriceListType; articleType: ArticleType
  parentId: string | null; autoUpdate: boolean; _count: { items: number }
}

export interface ImportResult {
  imported: number; skipped: number
  errors: Array<{ row: number; code: string; reason: string }>
  warnings: Array<{ row: number; code: string; reason: string }>
}
```

- [ ] Commit:
```bash
git add backend/src/types/shared.ts
git commit -m "feat: tipi condivisi Fase 4 — AdminLookup, AdminArticle*, AdminPriceList, ImportResult"
```

---

### Task 3: Lookup API

**Files:**
- Create: `backend/src/routes/lookups.ts`
- Create: `backend/src/routes/__tests__/lookups.test.ts`
- Modify: `backend/src/app.ts`

- [ ] Scrivi il test prima:

```ts
// backend/src/routes/__tests__/lookups.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { buildTestApp } from '../testHelper'

describe('GET /api/admin/lookups/coffin-categories', () => {
  it('restituisce lista vuota per manager autenticato', async () => {
    const app = await buildTestApp()
    const res = await app.injectWithAuth('manager', {
      method: 'GET', url: '/api/admin/lookups/coffin-categories'
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ data: [], pagination: expect.any(Object) })
  })

  it('rifiuta ruolo non autorizzato', async () => {
    const app = await buildTestApp()
    const res = await app.injectWithAuth('collaboratore', {
      method: 'GET', url: '/api/admin/lookups/coffin-categories'
    })
    expect(res.statusCode).toBe(403)
  })
})
```

- [ ] Esegui: `cd backend && npx vitest run src/routes/__tests__/lookups.test.ts`
  Atteso: FAIL (route non esiste)

- [ ] Implementa `backend/src/routes/lookups.ts`:

```ts
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const LOOKUP_MAP = {
  'coffin-categories': 'coffinCategory',
  'coffin-subcategories': 'coffinSubcategory',
  'essences': 'essence',
  'figures': 'figure',
  'colors': 'color',
  'finishes': 'finish',
  'accessory-categories': 'accessoryCategory',
  'accessory-subcategories': 'accessorySubcategory',
  'marmista-categories': 'marmistaCategory',
} as const

type LookupType = keyof typeof LOOKUP_MAP

const bodySchema = z.object({ code: z.string().min(1), label: z.string().min(1) })

const lookupsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin']))

  fastify.get<{ Params: { type: string } }>('/:type', async (req, reply) => {
    const model = LOOKUP_MAP[req.params.type as LookupType]
    if (!model) return reply.status(404).send({ error: 'NotFound', message: 'Tipo lookup non valido', statusCode: 404 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (fastify.prisma as any)[model].findMany({ orderBy: { code: 'asc' } })
    return { data, pagination: { page: 1, pageSize: data.length, total: data.length, totalPages: 1 } }
  })

  fastify.post<{ Params: { type: string }; Body: z.infer<typeof bodySchema> }>('/:type', async (req, reply) => {
    const model = LOOKUP_MAP[req.params.type as LookupType]
    if (!model) return reply.status(404).send({ error: 'NotFound', message: 'Tipo lookup non valido', statusCode: 404 })
    const body = bodySchema.parse(req.body)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await (fastify.prisma as any)[model].create({ data: body })
    return reply.status(201).send(item)
  })

  fastify.put<{ Params: { type: string; id: string }; Body: z.infer<typeof bodySchema> }>('/:type/:id', async (req, reply) => {
    const model = LOOKUP_MAP[req.params.type as LookupType]
    if (!model) return reply.status(404).send({ error: 'NotFound', message: 'Tipo lookup non valido', statusCode: 404 })
    const body = bodySchema.parse(req.body)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await (fastify.prisma as any)[model].update({ where: { id: req.params.id }, data: body })
    return item
  })

  fastify.delete<{ Params: { type: string; id: string } }>('/:type/:id', async (req, reply) => {
    const model = LOOKUP_MAP[req.params.type as LookupType]
    if (!model) return reply.status(404).send({ error: 'NotFound', message: 'Tipo lookup non valido', statusCode: 404 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (fastify.prisma as any)[model].delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })
}

export default lookupsRoutes
```

- [ ] Registra in `app.ts`:
```ts
import lookupsRoutes from './routes/lookups'
// ...
fastify.register(lookupsRoutes, { prefix: '/api/admin/lookups' })
```

- [ ] Esegui: `npx vitest run src/routes/__tests__/lookups.test.ts`
  Atteso: PASS

- [ ] Commit:
```bash
git add backend/src/routes/lookups.ts backend/src/routes/__tests__/lookups.test.ts backend/src/app.ts
git commit -m "feat: Lookup API — CRUD generico per tutti i tipi"
```

---

### Task 4: Articoli API — Cofani

**Files:**
- Create: `backend/src/routes/articles/coffins.ts`
- Create: `backend/src/routes/__tests__/articles.test.ts`
- Modify: `backend/src/app.ts`

- [ ] Scrivi test chiave per creazione + lista:

```ts
// backend/src/routes/__tests__/articles.test.ts
it('crea cofano e lo ritrova in lista', async () => {
  const app = await buildTestApp()
  const cat = await app.prisma.coffinCategory.create({ data: { code: 'C1', label: 'Cat 1' } })
  const res = await app.injectWithAuth('manager', {
    method: 'POST', url: '/api/admin/articles/coffins',
    payload: { code: 'COF001', description: 'Bara test', categoryIds: [cat.id] }
  })
  expect(res.statusCode).toBe(201)
  expect(res.json()).toMatchObject({ code: 'COF001' })

  const list = await app.injectWithAuth('manager', { method: 'GET', url: '/api/admin/articles/coffins' })
  expect(list.json().data).toHaveLength(1)
})
```

- [ ] Esegui test: atteso FAIL

- [ ] Implementa `backend/src/routes/articles/coffins.ts` con:
  - `GET /` — lista paginata con `include` su categories, subcategories, essences, figures, colors, finishes, measure
  - `POST /` — body: `{ code, description, notes?, measureId?, categoryIds?, subcategoryIds?, essenceIds?, figureIds?, colorIds?, finishIds? }`
  - `GET /:id`, `PUT /:id`, `DELETE /:id`
  - `POST /import` — gestito nel Task 5
  - `POST /:id/image` — salva file in `uploads/images/coffins/`, aggiorna `imageUrl`

  Usa `z.object({...})` per validazione body. Per le relazioni many-to-many usa la sintassi Prisma:
  ```ts
  categories: { set: categoryIds.map(id => ({ id })) }
  ```

- [ ] Registra in `app.ts`:
```ts
import coffinsRoutes from './routes/articles/coffins'
fastify.register(coffinsRoutes, { prefix: '/api/admin/articles/coffins' })
```

- [ ] Esegui test: atteso PASS

- [ ] Commit:
```bash
git commit -m "feat: Cofani API — CRUD completo"
```

> Stesso pattern per `accessories.ts` e `marmista.ts` — adattare i campi ai rispettivi modelli Prisma.

---

### Task 5: Import Excel

**Files:**
- Create: `backend/src/lib/excelImporter.ts`
- Modify: `backend/src/routes/articles/coffins.ts` (aggiunge `/import`)

- [ ] Installa dipendenza:
```bash
cd backend && npm install xlsx
```

- [ ] Crea `backend/src/lib/excelImporter.ts`:

```ts
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import type { ImportResult } from '../types/shared'

export function parseExcelFile(filePath: string): Record<string, string>[] {
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, string>[]
}

export function splitCodes(value: string): string[] {
  return value.split(';').map(s => s.trim()).filter(Boolean)
}

export function validateImagePath(imageField: string, uploadsRoot: string): string | null {
  if (!imageField) return null
  const fullPath = path.join(uploadsRoot, imageField)
  return fs.existsSync(fullPath) ? imageField : null
}
```

- [ ] Implementa `POST /import` in `coffins.ts`:

```ts
fastify.post('/import', async (req, reply) => {
  const data = await req.file()
  if (!data) return reply.status(400).send({ error: 'BadRequest', message: 'File mancante', statusCode: 400 })

  const tmpPath = `/tmp/import_${Date.now()}.xlsx`
  await pipeline(data.file, fs.createWriteStream(tmpPath))

  const rows = parseExcelFile(tmpPath)
  const result: ImportResult = { imported: 0, skipped: 0, errors: [], warnings: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // Excel è 1-indexed, header è riga 1
    if (!row.codice) {
      result.errors.push({ row: rowNum, code: '', reason: 'Colonna codice mancante' })
      continue
    }
    try {
      const categoryIds = await resolveCodes(fastify.prisma.coffinCategory, splitCodes(row.categorie))
      if (categoryIds.missing.length) {
        result.skipped++
        result.errors.push({ row: rowNum, code: row.codice, reason: `Categorie non trovate: ${categoryIds.missing.join(', ')}` })
        continue
      }
      // ... risolvi altri lookup allo stesso modo
      let imageUrl: string | null = null
      if (row.immagine) {
        imageUrl = validateImagePath(row.immagine, path.join(process.cwd(), '../../uploads/images'))
        if (!imageUrl) result.warnings.push({ row: rowNum, code: row.codice, reason: `Immagine non trovata: ${row.immagine}` })
      }
      await fastify.prisma.coffinArticle.upsert({
        where: { code: row.codice },
        create: { code: row.codice, description: row.descrizione, notes: row.note || null, imageUrl,
          categories: { connect: categoryIds.ids.map(id => ({ id })) } },
        update: { description: row.descrizione, notes: row.note || null, imageUrl,
          categories: { set: categoryIds.ids.map(id => ({ id })) } },
      })
      result.imported++
    } catch (e) {
      result.errors.push({ row: rowNum, code: row.codice, reason: String(e) })
    }
  }
  fs.unlinkSync(tmpPath)
  return result
})

async function resolveCodes(model: any, codes: string[]): Promise<{ ids: string[]; missing: string[] }> {
  const found = await model.findMany({ where: { code: { in: codes } } })
  const foundCodes = found.map((f: any) => f.code)
  return { ids: found.map((f: any) => f.id), missing: codes.filter(c => !foundCodes.includes(c)) }
}
```

- [ ] Installa `@fastify/multipart` se non presente:
```bash
cd backend && npm install @fastify/multipart
```

- [ ] Registra plugin in `app.ts`:
```ts
import multipart from '@fastify/multipart'
fastify.register(multipart)
```

- [ ] Commit:
```bash
git commit -m "feat: import Excel cofani con validazione lookup e immagini"
```

---

### Task 6: Listini API

**Files:**
- Modify: `backend/src/routes/pricelists.ts` (implementazione completa)
- Create: `backend/src/routes/__tests__/pricelists.test.ts`

- [ ] Scrivi test per creazione listino + preview prezzi:

```ts
it('crea listino base e imposta prezzi', async () => {
  const app = await buildTestApp()
  const article = await app.prisma.coffinArticle.create({ data: { code: 'C1', description: 'Test' } })
  const pl = await app.injectWithAuth('manager', {
    method: 'POST', url: '/api/admin/pricelists',
    payload: { name: 'Base Funebre', type: 'sale', articleType: 'funeral', autoUpdate: false }
  })
  expect(pl.statusCode).toBe(201)
  const plId = pl.json().id

  const items = await app.injectWithAuth('manager', {
    method: 'POST', url: `/api/admin/pricelists/${plId}/items`,
    payload: { items: [{ coffinArticleId: article.id, price: 100 }] }
  })
  expect(items.statusCode).toBe(200)
})

it('nasconde listino acquisto a collaboratore', async () => {
  const app = await buildTestApp()
  await app.prisma.priceList.create({ data: { name: 'Acquisto', type: 'purchase', articleType: 'funeral', autoUpdate: false } })
  const res = await app.injectWithAuth('collaboratore', { method: 'GET', url: '/api/admin/pricelists' })
  expect(res.json().data.every((pl: any) => pl.type !== 'purchase')).toBe(true)
})
```

- [ ] Esegui test: atteso FAIL

- [ ] Implementa `pricelists.ts` con tutti gli endpoint della spec (sezione 3.3 del design doc). Punti chiave:
  - `GET /` — filtra `type: 'purchase'` se ruolo non è `manager | super_admin`
  - `GET /:id/preview` — usa `computePrice()` da `priceEngine.ts` senza salvare
  - `POST /:id/recalculate` — ricalcola e salva `PriceListItem.price` per tutti gli articoli del listino
  - `PUT /:id/assign/:userId` — aggiorna `funeralPriceListId` o `marmistaPriceListId` su User in base all'`articleType` del listino; blocca se Marmista tenta di assegnare listino `funeral`

- [ ] Esegui test: atteso PASS

- [ ] Commit:
```bash
git commit -m "feat: Listini API — CRUD + preview + recalculate + assegnazione utente"
```

---

## Checklist completamento Piano A

- [ ] Migration applicata
- [ ] Tipi condivisi aggiornati
- [ ] Lookup API: tutti i 9 tipi funzionanti
- [ ] Articoli CRUD: cofani, accessori, marmisti
- [ ] Import Excel: cofani, accessori, marmisti (con validazione)
- [ ] Listini CRUD completo
- [ ] Calcolo prezzo dinamico + snapshot funzionanti
- [ ] Listino acquisto nascosto ai ruoli non autorizzati
- [ ] Assegnazione listino a utente funzionante
- [ ] Tutti i test passano: `cd backend && npx vitest run`

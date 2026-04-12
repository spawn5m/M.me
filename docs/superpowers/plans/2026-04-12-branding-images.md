# Branding Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere gestione immagini di pagina al branding admin, collegando i file caricati ai placeholder div in HomePage e NostraStoriaPage tramite BrandingContext.

**Architecture:** Public endpoint `GET /api/public/branding/images` scopre i file su disco e restituisce le URL. BrandingContext esteso con `images: Record<string, string | null>` le inietta nelle pagine pubbliche. La pagina admin `BrandingLogoPage` viene ampliata con 4 card slot (una per sezione di pagina). Sidebar entry rinominata "Immagini".

**Tech Stack:** Fastify v5, TypeScript strict, React 19, fs (no DB), Vitest per test backend.

---

## File Map

| File | Azione | Responsabilità |
|------|--------|----------------|
| `backend/src/routes/branding.ts` | Modifica | WebP al logo; nuovi endpoint `POST/DELETE /api/admin/branding/images/:slot` |
| `backend/src/routes/public.ts` | Modifica | WebP a `findLogoUrl`; nuovo `GET /api/public/branding/images` |
| `backend/src/routes/__tests__/branding.test.ts` | Crea | Test auth/validazione endpoint branding images |
| `frontend/src/context/BrandingContext.tsx` | Modifica | Aggiunge `images` al context + secondo fetch |
| `frontend/src/components/admin/AdminSidebar.tsx` | Modifica | Label "Logo" → "Immagini" |
| `frontend/src/pages/admin/BrandingLogoPage.tsx` | Modifica | Sezione immagini con 4 slot card |
| `frontend/src/pages/HomePage.tsx` | Modifica | Sostituisce 3 placeholder div con `<img>` condizionale |
| `frontend/src/pages/NostraStoriaPage.tsx` | Modifica | Sostituisce 1 placeholder div con `<img>` condizionale |

---

## Task 1: Backend — WebP al Logo

**Files:**
- Modify: `backend/src/routes/branding.ts`
- Modify: `backend/src/routes/public.ts`

- [ ] **Step 1: Aggiungi WebP a `branding.ts` — costanti e rilevamento**

  Apri `backend/src/routes/branding.ts`. Sostituisci le costanti MIME in cima al file:

  ```ts
  const PNG_MIMES = new Set(['image/png'])
  const SVG_MIMES = new Set(['image/svg+xml', 'text/xml', 'text/plain', 'application/xml', 'application/octet-stream'])
  const WEBP_MIMES = new Set(['image/webp'])
  const ALLOWED_MIMES = new Set([...PNG_MIMES, ...SVG_MIMES, ...WEBP_MIMES])
  ```

- [ ] **Step 2: Aggiungi WebP a `deleteExistingLogo` in `branding.ts`**

  Sostituisci:
  ```ts
  function deleteExistingLogo() {
    for (const base of ['logo.png', 'logo.svg']) {
  ```
  Con:
  ```ts
  function deleteExistingLogo() {
    for (const base of ['logo.png', 'logo.svg', 'logo.webp']) {
  ```

- [ ] **Step 3: Aggiorna la logica di upload logo per WebP**

  Nel handler `POST /logo`, dopo le costanti `isSvgByExt` e `isPngByExt`, aggiungi:
  ```ts
  const isWebpByExt = originalName.endsWith('.webp')
  ```

  Aggiorna il check MIME (riga `if (!ALLOWED_MIMES.has(mime) && !isSvgByExt && !isPngByExt)`):
  ```ts
  if (!ALLOWED_MIMES.has(mime) && !isSvgByExt && !isPngByExt && !isWebpByExt) {
  ```

  Aggiorna il calcolo `ext` (riga `const ext = isSvgByExt || mime === 'image/svg+xml' ? 'svg' : 'png'`):
  ```ts
  const ext =
    isSvgByExt || mime === 'image/svg+xml'
      ? 'svg'
      : isWebpByExt || WEBP_MIMES.has(mime)
        ? 'webp'
        : 'png'
  ```

- [ ] **Step 4: Aggiorna `findLogoUrl` in `public.ts`**

  In `backend/src/routes/public.ts`, riga ~40, cambia:
  ```ts
  const LOGO_BASES = ['logo.png', 'logo.svg']
  ```
  In:
  ```ts
  const LOGO_BASES = ['logo.png', 'logo.webp', 'logo.svg']
  ```

  (WebP prima di SVG — priorità per le foto rispetto ai vettoriali)

- [ ] **Step 5: Aggiorna `accept` nel file input di `BrandingLogoPage.tsx`**

  In `frontend/src/pages/admin/BrandingLogoPage.tsx`, riga ~153:
  ```tsx
  accept="image/png,image/svg+xml"
  ```
  Diventa:
  ```tsx
  accept="image/png,image/webp,image/svg+xml"
  ```

  E aggiorna il testo hint sotto il drop zone (riga ~160):
  ```tsx
  <p className="mt-3 text-xs text-[#6B7280]">PNG · WebP · SVG · max 2 MB</p>
  ```

  E aggiorna la validazione client-side in `handleUpload`:
  ```ts
  if (!['image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
    setError('Formato non supportato. Usa PNG, WebP o SVG.')
    return
  }
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add backend/src/routes/branding.ts backend/src/routes/public.ts frontend/src/pages/admin/BrandingLogoPage.tsx
  git commit -m "feat(branding): aggiungi WebP al logo"
  ```

---

## Task 2: Backend — Endpoint pubblico immagini

**Files:**
- Modify: `backend/src/routes/public.ts`

- [ ] **Step 1: Aggiungi costanti per le immagini branding in `public.ts`**

  Dopo le costanti `LOGO_DIR` / `LOGO_BASES` (riga ~39), aggiungi:

  ```ts
  const BRANDING_IMG_DIR = path.resolve(process.cwd(), '..', 'uploads', 'images', 'branding')
  const VALID_BRANDING_SLOTS = ['home-funebri', 'home-marmisti', 'home-altri', 'storia-narrativa'] as const
  const BRANDING_IMG_EXTS = ['png', 'webp', 'svg'] as const

  function findBrandingImageUrl(slot: string): string | null {
    for (const ext of BRANDING_IMG_EXTS) {
      if (fs.existsSync(path.join(BRANDING_IMG_DIR, `${slot}.${ext}`))) {
        return `/uploads/images/branding/${slot}.${ext}`
      }
    }
    return null
  }
  ```

- [ ] **Step 2: Aggiungi route `GET /branding/images` in `public.ts`**

  Subito dopo `fastify.get('/branding/logo', ...)` (riga ~882), aggiungi:

  ```ts
  fastify.get('/branding/images', async (_req, reply) => {
    const images = Object.fromEntries(
      VALID_BRANDING_SLOTS.map((slot) => [slot, findBrandingImageUrl(slot)])
    )
    return reply.send({ images })
  })
  ```

- [ ] **Step 3: Verifica a mano**

  Con il server avviato (`npm run dev` dalla root):
  ```bash
  curl http://localhost:3001/api/public/branding/images
  ```
  Expected:
  ```json
  {"images":{"home-funebri":null,"home-marmisti":null,"home-altri":null,"storia-narrativa":null}}
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add backend/src/routes/public.ts
  git commit -m "feat(branding): endpoint pubblico GET /api/public/branding/images"
  ```

---

## Task 3: Backend — Endpoint admin immagini

**Files:**
- Modify: `backend/src/routes/branding.ts`

- [ ] **Step 1: Aggiungi costanti per gli slot immagini in `branding.ts`**

  Dopo le costanti logo esistenti (dopo `MAX_DIM = 512`), aggiungi:

  ```ts
  const BRANDING_IMG_DIR = path.resolve(process.cwd(), '..', 'uploads', 'images', 'branding')
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

  function deleteExistingSlotImage(slot: string) {
    for (const ext of IMG_EXTS) {
      const p = path.join(BRANDING_IMG_DIR, `${slot}.${ext}`)
      if (fs.existsSync(p)) fs.rmSync(p)
    }
  }
  ```

- [ ] **Step 2: Aggiungi route `POST /images/:slot`**

  In fondo al plugin `brandingAdminRoutes`, prima della chiusura `}`, aggiungi:

  ```ts
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

    const ext =
      isSvgByExt || mime === 'image/svg+xml'
        ? 'svg'
        : isWebpByExt || mime === 'image/webp'
          ? 'webp'
          : 'png'

    fs.mkdirSync(BRANDING_IMG_DIR, { recursive: true })
    deleteExistingSlotImage(slot)

    const filename = `${slot}.${ext}`
    fs.writeFileSync(path.join(BRANDING_IMG_DIR, filename), Buffer.concat(chunks))

    req.log.info(`Immagine branding caricata: ${filename}`)
    return reply.status(200).send({ url: `/uploads/images/branding/${filename}` })
  })
  ```

- [ ] **Step 3: Aggiungi route `DELETE /images/:slot`**

  Subito dopo la route POST appena aggiunta, aggiungi:

  ```ts
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

    const deleted = IMG_EXTS.some((ext) => {
      const p = path.join(BRANDING_IMG_DIR, `${slot}.${ext}`)
      if (fs.existsSync(p)) { fs.rmSync(p); return true }
      return false
    })

    if (!deleted) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Nessuna immagine da eliminare per questo slot.',
        statusCode: 404,
      })
    }

    req.log.info(`Immagine branding eliminata: slot ${slot}`)
    return reply.status(200).send({ message: 'Immagine eliminata.' })
  })
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add backend/src/routes/branding.ts
  git commit -m "feat(branding): endpoint admin POST/DELETE /api/admin/branding/images/:slot"
  ```

---

## Task 4: Backend — Test endpoint branding images

**Files:**
- Create: `backend/src/routes/__tests__/branding.test.ts`

- [ ] **Step 1: Scrivi il file di test**

  Crea `backend/src/routes/__tests__/branding.test.ts`:

  ```ts
  import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
  import type { FastifyInstance } from 'fastify'
  import {
    buildTestApp,
    cleanupTestDb,
    getAuthCookie,
    seedTestUser,
  } from '../../test-helper'
  import { SYSTEM_PERMISSIONS, type PermissionCode } from '../../lib/authorization/permissions'

  interface AuthorizationPermissionRecord { id: string }
  interface AuthorizationPrismaClient {
    permission: {
      upsert(args: {
        where: { code: string }
        update: object
        create: object
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

  async function grantRolePermissions(app: FastifyInstance, roleName: string, codes: PermissionCode[]) {
    const role = await app.prisma.role.findUnique({ where: { name: roleName } })
    if (!role) throw new Error(`Ruolo ${roleName} non trovato`)
    for (const code of codes) {
      const permission = await ensurePermission(app, code)
      await getAuthorizationPrisma(app).rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      })
    }
  }

  describe('Branding images routes', () => {
    let app: FastifyInstance
    let managerCookie: string
    let collaboratoreCookie: string

    beforeAll(async () => {
      app = await buildTestApp()
    })

    afterAll(async () => {
      await cleanupTestDb(app)
      await app.close()
    })

    beforeEach(async () => {
      await cleanupTestDb(app)

      await seedTestUser(app, { email: 'manager@test.com', password: 'pass123!', roles: ['manager'] })
      await seedTestUser(app, { email: 'collab@test.com', password: 'pass123!', roles: ['collaboratore'] })
      await grantRolePermissions(app, 'manager', ['branding.logo.manage'])

      managerCookie = await getAuthCookie(app, 'manager@test.com', 'pass123!')
      collaboratoreCookie = await getAuthCookie(app, 'collab@test.com', 'pass123!')
    })

    // ── GET /api/public/branding/images ──────────────────────────────────────

    describe('GET /api/public/branding/images', () => {
      it('restituisce 200 con mappa slot→null senza immagini su disco', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/public/branding/images' })
        expect(res.statusCode).toBe(200)
        const body = res.json<{ images: Record<string, string | null> }>()
        expect(body.images).toHaveProperty('home-funebri')
        expect(body.images).toHaveProperty('home-marmisti')
        expect(body.images).toHaveProperty('home-altri')
        expect(body.images).toHaveProperty('storia-narrativa')
        // Senza file su disco tutti i valori sono null o string
        for (const val of Object.values(body.images)) {
          expect(val === null || typeof val === 'string').toBe(true)
        }
      })
    })

    // ── POST /api/admin/branding/images/:slot ────────────────────────────────

    describe('POST /api/admin/branding/images/:slot', () => {
      it('restituisce 401 senza autenticazione', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/admin/branding/images/home-funebri',
        })
        expect(res.statusCode).toBe(401)
      })

      it('restituisce 403 senza permesso branding.logo.manage', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/admin/branding/images/home-funebri',
          headers: { cookie: collaboratoreCookie },
        })
        expect(res.statusCode).toBe(403)
      })

      it('restituisce 400 per slot non valido', async () => {
        // Costruzione multipart minima per bypassare la validazione file
        const boundary = '----TestBoundary'
        const body = [
          `--${boundary}`,
          'Content-Disposition: form-data; name="file"; filename="test.png"',
          'Content-Type: image/png',
          '',
          'fake',
          `--${boundary}--`,
        ].join('\r\n')

        const res = await app.inject({
          method: 'POST',
          url: '/api/admin/branding/images/slot-inesistente',
          headers: {
            cookie: managerCookie,
            'content-type': `multipart/form-data; boundary=${boundary}`,
          },
          body,
        })
        expect(res.statusCode).toBe(400)
        expect(res.json<{ error: string }>().error).toBe('BAD_REQUEST')
      })
    })

    // ── DELETE /api/admin/branding/images/:slot ──────────────────────────────

    describe('DELETE /api/admin/branding/images/:slot', () => {
      it('restituisce 401 senza autenticazione', async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: '/api/admin/branding/images/home-funebri',
        })
        expect(res.statusCode).toBe(401)
      })

      it('restituisce 403 senza permesso branding.logo.manage', async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: '/api/admin/branding/images/home-funebri',
          headers: { cookie: collaboratoreCookie },
        })
        expect(res.statusCode).toBe(403)
      })

      it('restituisce 400 per slot non valido', async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: '/api/admin/branding/images/slot-inesistente',
          headers: { cookie: managerCookie },
        })
        expect(res.statusCode).toBe(400)
        expect(res.json<{ error: string }>().error).toBe('BAD_REQUEST')
      })

      it('restituisce 404 se non esiste nessun file per lo slot', async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: '/api/admin/branding/images/home-funebri',
          headers: { cookie: managerCookie },
        })
        expect(res.statusCode).toBe(404)
      })
    })
  })
  ```

- [ ] **Step 2: Esegui i test e verifica che passino**

  ```bash
  cd backend && npx vitest run src/routes/__tests__/branding.test.ts
  ```

  Expected: tutti i test PASS. Se qualche test 401 fallisce con 403 o viceversa, controlla il middleware `authenticate` vs `checkPermission`.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/src/routes/__tests__/branding.test.ts
  git commit -m "test(branding): test auth/validazione endpoint images"
  ```

---

## Task 5: Frontend — BrandingContext esteso

**Files:**
- Modify: `frontend/src/context/BrandingContext.tsx`

- [ ] **Step 1: Sostituisci il contenuto di `BrandingContext.tsx`**

  ```tsx
  import { createContext, useContext, useEffect, useState, useCallback } from 'react'

  interface BrandingContextValue {
    logoUrl: string | null
    images: Record<string, string | null>
    refresh: () => void
  }

  const BrandingContext = createContext<BrandingContextValue>({
    logoUrl: null,
    images: {},
    refresh: () => {},
  })

  export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [images, setImages] = useState<Record<string, string | null>>({})

    const refresh = useCallback(() => {
      const ts = Date.now()

      fetch('/api/public/branding/logo')
        .then((r) => r.json())
        .then((data: { url: string | null }) =>
          setLogoUrl(data.url ? `${data.url}?t=${ts}` : null)
        )
        .catch(() => setLogoUrl(null))

      fetch('/api/public/branding/images')
        .then((r) => r.json())
        .then((data: { images: Record<string, string | null> }) => {
          setImages(
            Object.fromEntries(
              Object.entries(data.images).map(([slot, url]) => [
                slot,
                url ? `${url}?t=${ts}` : null,
              ])
            )
          )
        })
        .catch(() => setImages({}))
    }, [])

    useEffect(() => {
      refresh()
    }, [refresh])

    return (
      <BrandingContext.Provider value={{ logoUrl, images, refresh }}>
        {children}
      </BrandingContext.Provider>
    )
  }

  export function useBranding() {
    return useContext(BrandingContext)
  }
  ```

- [ ] **Step 2: Verifica che il frontend compili**

  ```bash
  cd frontend && npx tsc --noEmit
  ```

  Expected: nessun errore TypeScript.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/context/BrandingContext.tsx
  git commit -m "feat(branding): estende BrandingContext con images"
  ```

---

## Task 6: Frontend — Sidebar label "Immagini"

**Files:**
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Cambia label nel NAV_ITEMS**

  In `frontend/src/components/admin/AdminSidebar.tsx`, nel gruppo `Interfaccia`, cambia:

  ```ts
  { to: '/admin/branding/logo', label: 'Logo', permissions: ['branding.logo.manage'] },
  ```

  In:

  ```ts
  { to: '/admin/branding/logo', label: 'Immagini', permissions: ['branding.logo.manage'] },
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add frontend/src/components/admin/AdminSidebar.tsx
  git commit -m "feat(branding): rinomina voce sidebar Logo → Immagini"
  ```

---

## Task 7: Frontend — BrandingLogoPage sezione immagini

**Files:**
- Modify: `frontend/src/pages/admin/BrandingLogoPage.tsx`

- [ ] **Step 1: Sostituisci il contenuto di `BrandingLogoPage.tsx`**

  ```tsx
  import { useRef, useState } from 'react'
  import { useBranding } from '../../context/BrandingContext'

  const MAX_LOGO_SIZE = 2 * 1024 * 1024
  const MAX_IMG_SIZE = 5 * 1024 * 1024

  const SLOTS = [
    { id: 'home-funebri', label: 'Imprese Funebri (Home)' },
    { id: 'home-marmisti', label: 'Marmisti (Home)' },
    { id: 'home-altri', label: 'Cimiteri / Altri (Home)' },
    { id: 'storia-narrativa', label: 'La Nostra Storia' },
  ] as const

  type SlotId = typeof SLOTS[number]['id']

  interface SlotState {
    uploading: boolean
    deleting: boolean
    error: string | null
    success: string | null
  }

  const initialSlotState: SlotState = { uploading: false, deleting: false, error: null, success: null }

  export default function BrandingLogoPage() {
    const { logoUrl, images, refresh } = useBranding()

    // ── Logo state ──────────────────────────────────────────────────────────
    const logoInputRef = useRef<HTMLInputElement>(null)
    const [logoUploading, setLogoUploading] = useState(false)
    const [logoDeleting, setLogoDeleting] = useState(false)
    const [logoError, setLogoError] = useState<string | null>(null)
    const [logoSuccess, setLogoSuccess] = useState<string | null>(null)

    // ── Slot state ──────────────────────────────────────────────────────────
    const slotInputRefs = useRef<Record<SlotId, HTMLInputElement | null>>({
      'home-funebri': null,
      'home-marmisti': null,
      'home-altri': null,
      'storia-narrativa': null,
    })
    const [slotStates, setSlotStates] = useState<Record<SlotId, SlotState>>(
      Object.fromEntries(SLOTS.map((s) => [s.id, { ...initialSlotState }])) as Record<SlotId, SlotState>
    )

    function setSlot(id: SlotId, patch: Partial<SlotState>) {
      setSlotStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
    }

    // ── Logo handlers ───────────────────────────────────────────────────────
    async function handleLogoUpload(file: File) {
      setLogoError(null)
      setLogoSuccess(null)
      if (!['image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
        setLogoError('Formato non supportato. Usa PNG, WebP o SVG.')
        return
      }
      if (file.size > MAX_LOGO_SIZE) {
        setLogoError('File troppo grande. Massimo 2 MB.')
        return
      }
      setLogoUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/admin/branding/logo', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
        if (!res.ok) {
          const body = await res.json() as { message?: string }
          throw new Error(body.message ?? 'Errore durante il caricamento.')
        }
        refresh()
        setLogoSuccess('Logo caricato con successo.')
      } catch (err) {
        setLogoError(err instanceof Error ? err.message : 'Errore sconosciuto.')
      } finally {
        setLogoUploading(false)
      }
    }

    async function handleLogoDelete() {
      setLogoError(null)
      setLogoSuccess(null)
      setLogoDeleting(true)
      try {
        const res = await fetch('/api/admin/branding/logo', {
          method: 'DELETE',
          credentials: 'include',
        })
        if (!res.ok) {
          const body = await res.json() as { message?: string }
          throw new Error(body.message ?? 'Errore durante la cancellazione.')
        }
        refresh()
        setLogoSuccess('Logo eliminato.')
      } catch (err) {
        setLogoError(err instanceof Error ? err.message : 'Errore sconosciuto.')
      } finally {
        setLogoDeleting(false)
      }
    }

    // ── Slot handlers ───────────────────────────────────────────────────────
    async function handleSlotUpload(id: SlotId, file: File) {
      setSlot(id, { error: null, success: null })
      if (!['image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
        setSlot(id, { error: 'Formato non supportato. Usa PNG, WebP o SVG.' })
        return
      }
      if (file.size > MAX_IMG_SIZE) {
        setSlot(id, { error: 'File troppo grande. Massimo 5 MB.' })
        return
      }
      setSlot(id, { uploading: true })
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`/api/admin/branding/images/${id}`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
        if (!res.ok) {
          const body = await res.json() as { message?: string }
          throw new Error(body.message ?? 'Errore durante il caricamento.')
        }
        refresh()
        setSlot(id, { success: 'Immagine caricata.' })
      } catch (err) {
        setSlot(id, { error: err instanceof Error ? err.message : 'Errore sconosciuto.' })
      } finally {
        setSlot(id, { uploading: false })
      }
    }

    async function handleSlotDelete(id: SlotId) {
      setSlot(id, { error: null, success: null, deleting: true })
      try {
        const res = await fetch(`/api/admin/branding/images/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (!res.ok) {
          const body = await res.json() as { message?: string }
          throw new Error(body.message ?? 'Errore durante la cancellazione.')
        }
        refresh()
        setSlot(id, { success: 'Immagine eliminata.' })
      } catch (err) {
        setSlot(id, { error: err instanceof Error ? err.message : 'Errore sconosciuto.' })
      } finally {
        setSlot(id, { deleting: false })
      }
    }

    return (
      <div className="space-y-12">

        {/* ── Sezione Logo ───────────────────────────────────────────────── */}
        <section className="space-y-8">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
              Interfaccia
            </p>
            <h2
              className="text-3xl text-[#031634]"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Logo aziendale
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              PNG, WebP o SVG. Per PNG, dimensioni massime 512×512px. Questa immagine
              comparirà sopra il titolo nella homepage e accanto al nome nella barra di navigazione.
            </p>
          </div>

          <div className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.14em] text-[#031634]">
              Logo attuale
            </p>
            {logoUrl ? (
              <div className="flex items-start gap-6">
                <div className="flex h-32 w-32 items-center justify-center border border-[#E5E0D8] bg-[#F8F7F4] p-3">
                  <img src={logoUrl} alt="Logo corrente" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-[#6B7280]">
                    File: <span className="font-medium text-[#031634]">{logoUrl.split('/').pop()?.split('?')[0]}</span>
                  </p>
                  <button
                    onClick={() => void handleLogoDelete()}
                    disabled={logoDeleting}
                    className="inline-flex min-h-9 items-center justify-center border border-[#E5E0D8] px-4 py-2 text-sm font-medium text-[#031634] transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    {logoDeleting ? 'Eliminazione...' : 'Elimina logo'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#6B7280]">Nessun logo caricato.</p>
            )}
          </div>

          <div
            className="border border-dashed border-[#C9A96E] bg-white p-10 text-center transition-colors hover:bg-[#FAF9F6]"
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void handleLogoUpload(f) }}
            onDragOver={(e) => e.preventDefault()}
          >
            <p className="mb-3 text-sm text-[#6B7280]">Trascina qui un file, oppure</p>
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="inline-flex min-h-9 items-center justify-center border border-[#C9A96E] px-6 py-2 text-sm font-medium text-[#C9A96E] transition-colors hover:bg-[#C9A96E] hover:text-white disabled:opacity-50"
            >
              {logoUploading ? 'Caricamento...' : 'Seleziona file'}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogoUpload(f); e.target.value = '' }}
            />
            <p className="mt-3 text-xs text-[#6B7280]">PNG · WebP · SVG · max 2 MB</p>
          </div>

          {logoError && (
            <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{logoError}</p>
          )}
          {logoSuccess && (
            <p className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{logoSuccess}</p>
          )}
        </section>

        {/* ── Sezione Immagini di pagina ─────────────────────────────────── */}
        <section className="space-y-8">
          <div>
            <h2
              className="text-3xl text-[#031634]"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Immagini di pagina
            </h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Carica un'immagine per ogni sezione. PNG, WebP o SVG, max 5 MB.
              Se non caricata, la sezione mostra lo sfondo scuro predefinito.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {SLOTS.map((slot) => {
              const state = slotStates[slot.id]
              const currentUrl = images[slot.id] ?? null
              const inputRef = (el: HTMLInputElement | null) => {
                slotInputRefs.current[slot.id] = el
              }

              return (
                <div
                  key={slot.id}
                  className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)] space-y-4"
                >
                  <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#031634]">
                    {slot.label}
                  </p>

                  {/* Anteprima */}
                  <div className="flex h-40 w-full items-center justify-center border border-[#E5E0D8] bg-[#F8F7F4] overflow-hidden">
                    {currentUrl ? (
                      <img
                        src={currentUrl}
                        alt={slot.label}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-[#6B7280] uppercase tracking-widest">Nessuna immagine</span>
                    )}
                  </div>

                  {/* Azioni */}
                  <div
                    className="border border-dashed border-[#C9A96E] p-4 text-center transition-colors hover:bg-[#FAF9F6] cursor-pointer"
                    onDrop={(e) => {
                      e.preventDefault()
                      const f = e.dataTransfer.files[0]
                      if (f) void handleSlotUpload(slot.id, f)
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <button
                      onClick={() => slotInputRefs.current[slot.id]?.click()}
                      disabled={state.uploading}
                      className="inline-flex min-h-8 items-center justify-center border border-[#C9A96E] px-4 py-1.5 text-xs font-medium text-[#C9A96E] transition-colors hover:bg-[#C9A96E] hover:text-white disabled:opacity-50"
                    >
                      {state.uploading ? 'Caricamento...' : 'Seleziona file'}
                    </button>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void handleSlotUpload(slot.id, f)
                        e.target.value = ''
                      }}
                    />
                    <p className="mt-2 text-xs text-[#6B7280]">PNG · WebP · SVG · max 5 MB</p>
                  </div>

                  {currentUrl && (
                    <button
                      onClick={() => void handleSlotDelete(slot.id)}
                      disabled={state.deleting}
                      className="inline-flex min-h-8 w-full items-center justify-center border border-[#E5E0D8] px-4 py-1.5 text-xs font-medium text-[#031634] transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                    >
                      {state.deleting ? 'Eliminazione...' : 'Elimina immagine'}
                    </button>
                  )}

                  {state.error && (
                    <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
                  )}
                  {state.success && (
                    <p className="border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">{state.success}</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verifica TypeScript**

  ```bash
  cd frontend && npx tsc --noEmit
  ```

  Expected: nessun errore.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/pages/admin/BrandingLogoPage.tsx
  git commit -m "feat(branding): sezione immagini di pagina in BrandingLogoPage"
  ```

---

## Task 8: Frontend — HomePage placeholder → img condizionale

**Files:**
- Modify: `frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: Aggiungi `images` da `useBranding` in `HomePage.tsx`**

  In `frontend/src/pages/HomePage.tsx`, riga 8, cambia:
  ```tsx
  const { logoUrl } = useBranding()
  ```
  In:
  ```tsx
  const { logoUrl, images } = useBranding()
  ```

- [ ] **Step 2: Sostituisci placeholder slot `home-funebri` (Sezione 1)**

  Cerca il blocco (riga ~98):
  ```tsx
          <div
            className="hidden md:block w-full h-[500px]"
            style={{ backgroundColor: '#0D1E35' }}
            aria-hidden="true"
          />
  ```
  Sostituisci con:
  ```tsx
          {images['home-funebri'] ? (
            <img
              src={images['home-funebri']!}
              alt=""
              className="hidden md:block w-full h-[500px] object-cover"
              aria-hidden="true"
            />
          ) : (
            <div
              className="hidden md:block w-full h-[500px]"
              style={{ backgroundColor: '#0D1E35' }}
              aria-hidden="true"
            />
          )}
  ```

- [ ] **Step 3: Sostituisci placeholder slot `home-marmisti` (Sezione 2)**

  Cerca il primo blocco nella Sezione 2 (riga ~113):
  ```tsx
          <div
            className="hidden md:block w-full h-[500px]"
            style={{ backgroundColor: '#142032' }}
            aria-hidden="true"
          />
  ```
  Sostituisci con:
  ```tsx
          {images['home-marmisti'] ? (
            <img
              src={images['home-marmisti']!}
              alt=""
              className="hidden md:block w-full h-[500px] object-cover"
              aria-hidden="true"
            />
          ) : (
            <div
              className="hidden md:block w-full h-[500px]"
              style={{ backgroundColor: '#142032' }}
              aria-hidden="true"
            />
          )}
  ```

- [ ] **Step 4: Sostituisci placeholder slot `home-altri` (Sezione 3)**

  Cerca il blocco nella Sezione 3 (riga ~152):
  ```tsx
          <div
            className="hidden md:block w-full h-[500px]"
            style={{ backgroundColor: '#142032' }}
            aria-hidden="true"
          />
  ```
  (È il secondo blocco con `#142032` — dentro la sezione "Cimiteri - Crematori - Case Funerarie")

  Sostituisci con:
  ```tsx
          {images['home-altri'] ? (
            <img
              src={images['home-altri']!}
              alt=""
              className="hidden md:block w-full h-[500px] object-cover"
              aria-hidden="true"
            />
          ) : (
            <div
              className="hidden md:block w-full h-[500px]"
              style={{ backgroundColor: '#142032' }}
              aria-hidden="true"
            />
          )}
  ```

- [ ] **Step 5: Verifica TypeScript**

  ```bash
  cd frontend && npx tsc --noEmit
  ```

  Expected: nessun errore.

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/pages/HomePage.tsx
  git commit -m "feat(branding): HomePage usa immagini branding al posto dei placeholder"
  ```

---

## Task 9: Frontend — NostraStoriaPage placeholder → img condizionale

**Files:**
- Modify: `frontend/src/pages/NostraStoriaPage.tsx`

- [ ] **Step 1: Importa `useBranding` in `NostraStoriaPage.tsx`**

  In cima al file, dopo l'import di `useTranslation`, aggiungi:
  ```tsx
  import { useBranding } from '../context/BrandingContext'
  ```

- [ ] **Step 2: Aggiungi `images` nel corpo del componente**

  Dopo `const { t } = useTranslation()`, aggiungi:
  ```tsx
  const { images } = useBranding()
  ```

- [ ] **Step 3: Sostituisci il placeholder narrativa (riga ~31)**

  Cerca il blocco:
  ```tsx
            <div className="group aspect-[4/5] relative overflow-hidden border-2 border-transparent hover:border-[#C9A96E] transition-colors duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1A2B4A] via-[#2C4A7C] to-[#1A2B4A] group-hover:from-[#2C4A7C] group-hover:via-[#3D6B9E] group-hover:to-[#1A3A5C] scale-100 group-hover:scale-[1.20] transition-all duration-500" />
              <div className="absolute inset-0 flex items-end p-6">
                <span className="text-white/20 group-hover:text-[#C9A96E] font-serif text-6xl leading-none transition-colors duration-300">1988</span>
              </div>
            </div>
  ```
  Sostituisci con:
  ```tsx
            {images['storia-narrativa'] ? (
              <img
                src={images['storia-narrativa']!}
                alt="La nostra storia"
                className="aspect-[4/5] w-full object-cover border-2 border-transparent hover:border-[#C9A96E] transition-colors duration-300"
              />
            ) : (
              <div className="group aspect-[4/5] relative overflow-hidden border-2 border-transparent hover:border-[#C9A96E] transition-colors duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1A2B4A] via-[#2C4A7C] to-[#1A2B4A] group-hover:from-[#2C4A7C] group-hover:via-[#3D6B9E] group-hover:to-[#1A3A5C] scale-100 group-hover:scale-[1.20] transition-all duration-500" />
                <div className="absolute inset-0 flex items-end p-6">
                  <span className="text-white/20 group-hover:text-[#C9A96E] font-serif text-6xl leading-none transition-colors duration-300">1988</span>
                </div>
              </div>
            )}
  ```

- [ ] **Step 4: Verifica TypeScript**

  ```bash
  cd frontend && npx tsc --noEmit
  ```

  Expected: nessun errore.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/pages/NostraStoriaPage.tsx
  git commit -m "feat(branding): NostraStoriaPage usa immagine storia-narrativa"
  ```

---

## Verifica finale

- [ ] **Avvia dev server e verifica manualmente**

  ```bash
  # Dalla root
  npm run dev
  ```

  Checklist manuale:
  1. Sidebar admin mostra "Immagini" (non "Logo") sotto Interfaccia
  2. `/admin/branding/logo` mostra sezione Logo + sezione Immagini di pagina (4 card)
  3. Upload di un'immagine per `home-funebri` → appare in anteprima nella card
  4. La HomePage mostra l'immagine al posto del placeholder scuro (hard refresh)
  5. Eliminazione immagine → placeholder scuro torna nella HomePage
  6. Sezione logo: accetta WebP oltre a PNG/SVG

- [ ] **Esegui tutti i test backend**

  ```bash
  cd backend && npx vitest run
  ```

  Expected: tutti PASS.

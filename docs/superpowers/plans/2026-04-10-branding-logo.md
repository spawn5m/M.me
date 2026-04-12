# Branding Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettere il caricamento di un logo aziendale (PNG/SVG ≤512×512) tramite area admin, e visualizzarlo nella HomePage sopra il titolo, nella Navbar pubblica e admin, e come favicon dinamica.

**Architecture:** File su disco a nome fisso (`uploads/images/logo/logo.{ext}`) servito via `@fastify/static`. Un endpoint pubblico `GET /api/public/branding/logo` restituisce l'URL corrente; un `BrandingContext` React lo distribuisce a tutta l'app con un singolo fetch al mount. Le route admin POST/DELETE sono protette dal permesso `branding.logo.manage`.

**Tech Stack:** Fastify v5, @fastify/multipart, React 19, Tailwind CSS v4, TypeScript strict, Zod

---

## File Map

| Azione | File | Responsabilità |
|--------|------|----------------|
| Modifica | `backend/src/lib/authorization/permissions.ts` | Aggiunge codice `branding.logo.manage` |
| Modifica | `backend/src/lib/authorization/role-defaults.ts` | Assegna permesso a super_admin e manager |
| Crea | `backend/src/routes/branding.ts` | POST e DELETE /api/admin/branding/logo |
| Modifica | `backend/src/routes/public.ts` | Aggiunge GET /api/public/branding/logo |
| Modifica | `backend/src/app.ts` | Registra brandingRoutes |
| Crea | `frontend/src/context/BrandingContext.tsx` | Fetch logoUrl, refresh(), provider |
| Crea | `frontend/src/pages/admin/BrandingLogoPage.tsx` | UI upload/preview/elimina logo |
| Modifica | `frontend/src/App.tsx` | BrandingProvider, lazy import, route, favicon effect |
| Modifica | `frontend/src/components/layout/Navbar.tsx` | Logo affianco a wordmark |
| Modifica | `frontend/src/components/admin/AdminSidebar.tsx` | Gruppo "Interfaccia" + logo nel header |
| Modifica | `frontend/src/pages/HomePage.tsx` | Logo sopra h1 MIRIGLIANI |

---

### Task 1: Permesso `branding.logo.manage`

**Files:**
- Modify: `backend/src/lib/authorization/permissions.ts`
- Modify: `backend/src/lib/authorization/role-defaults.ts`

- [ ] **Step 1: Aggiungi il codice permesso in `permissions.ts`**

In `SYSTEM_PERMISSION_CODES`, dopo `'catalog.pdf.write'`, aggiungi:

```typescript
  'branding.logo.manage',
```

In `SYSTEM_PERMISSIONS`, dopo l'entry `catalog.pdf.write`, aggiungi:

```typescript
  { code: 'branding.logo.manage', resource: 'branding.logo', action: 'manage', label: 'Gestisci Logo', description: 'Caricare o eliminare il logo aziendale.', isSystem: true },
```

- [ ] **Step 2: Assegna il permesso a super_admin e manager in `role-defaults.ts`**

Nel blocco `super_admin`, dopo `'catalog.pdf.write'`, aggiungi:

```typescript
    'branding.logo.manage',
```

Nel blocco `manager`, dopo `'catalog.pdf.write'`, aggiungi:

```typescript
    'branding.logo.manage',
```

- [ ] **Step 3: Verifica compilazione TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add backend/src/lib/authorization/permissions.ts backend/src/lib/authorization/role-defaults.ts
git commit -m "feat(branding): aggiungi permesso branding.logo.manage"
```

---

### Task 2: Endpoint pubblico GET /api/public/branding/logo

**Files:**
- Modify: `backend/src/routes/public.ts`

- [ ] **Step 1: Aggiungi gli import in cima a `public.ts`**

Dopo gli import esistenti (riga 1-8), aggiungi:

```typescript
import fs from 'fs'
import path from 'path'
```

(Se `fs` e `path` sono già importati da altre route nello stesso file, salta.)

- [ ] **Step 2: Aggiungi la helper function per trovare il logo**

Dopo la funzione `buildPagination` (prima della sezione route), aggiungi:

```typescript
// ─── Branding ─────────────────────────────────────────────────────────────────

const LOGO_DIR = path.resolve(process.cwd(), '..', 'uploads', 'images', 'logo')
const LOGO_BASES = ['logo.png', 'logo.svg']

function findLogoUrl(): string | null {
  for (const base of LOGO_BASES) {
    if (fs.existsSync(path.join(LOGO_DIR, base))) {
      return `/uploads/images/logo/${base}`
    }
  }
  return null
}
```

- [ ] **Step 3: Aggiungi la route GET**

In fondo al file, prima della chiusura del plugin (`}`), aggiungi:

```typescript
  // GET /api/public/branding/logo
  fastify.get('/branding/logo', async (_req, reply) => {
    return reply.send({ url: findLogoUrl() })
  })
```

- [ ] **Step 4: Verifica compilazione**

```bash
cd backend && npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 5: Test manuale rapido** (server in esecuzione)

```bash
curl http://localhost:3001/api/public/branding/logo
```

Atteso: `{"url":null}` (nessun logo ancora caricato).

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/public.ts
git commit -m "feat(branding): GET /api/public/branding/logo"
```

---

### Task 3: Route admin POST e DELETE logo

**Files:**
- Create: `backend/src/routes/branding.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Crea `backend/src/routes/branding.ts`**

```typescript
import { FastifyPluginAsync } from 'fastify'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { createWriteStream } from 'fs'

const LOGO_DIR = path.resolve(process.cwd(), '..', 'uploads', 'images', 'logo')
const ALLOWED_MIMES = new Set(['image/png', 'image/svg+xml'])
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const MAX_DIM = 512

/** Legge width e height dall'header IHDR di un PNG (no dipendenze esterne). */
function getPngDimensions(buffer: Buffer): { width: number; height: number } {
  // PNG: 8 byte signature + IHDR chunk (4 len + 4 type + 4 width + 4 height)
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  return { width, height }
}

/** Rimuove tutti i file logo esistenti (logo.png, logo.svg). */
function deleteExistingLogo() {
  for (const base of ['logo.png', 'logo.svg']) {
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
    if (!ALLOWED_MIMES.has(mime)) {
      data.file.resume()
      return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Formato non supportato. Usa PNG o SVG.', statusCode: 400 })
    }

    // Leggi il file in memoria (max 2 MB) per validare PNG dims
    const chunks: Buffer[] = []
    let totalSize = 0
    for await (const chunk of data.file) {
      totalSize += chunk.length
      if (totalSize > MAX_FILE_SIZE) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'File troppo grande (max 2 MB).', statusCode: 400 })
      }
      chunks.push(chunk as Buffer)
    }
    const buffer = Buffer.concat(chunks)

    // Validazione dimensioni PNG
    if (mime === 'image/png') {
      if (buffer.length < 24) {
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

    const ext = mime === 'image/svg+xml' ? 'svg' : 'png'
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
    const hadLogo = ['logo.png', 'logo.svg'].some((base) => {
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
```

- [ ] **Step 2: Registra le route in `app.ts`**

Dopo gli import esistenti, aggiungi:

```typescript
import brandingAdminRoutes from './routes/branding'
```

Dopo `await app.register(catalogRoutes, { prefix: '/api/admin/catalog' })`, aggiungi:

```typescript
  await app.register(brandingAdminRoutes, { prefix: '/api/admin/branding' })
```

- [ ] **Step 3: Verifica compilazione**

```bash
cd backend && npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/branding.ts backend/src/app.ts
git commit -m "feat(branding): route admin POST/DELETE logo"
```

---

### Task 4: BrandingContext React

**Files:**
- Create: `frontend/src/context/BrandingContext.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Crea `frontend/src/context/BrandingContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

interface BrandingContextValue {
  logoUrl: string | null
  refresh: () => void
}

const BrandingContext = createContext<BrandingContextValue>({
  logoUrl: null,
  refresh: () => {},
})

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const refresh = useCallback(() => {
    fetch('/api/public/branding/logo')
      .then((r) => r.json())
      .then((data: { url: string | null }) => setLogoUrl(data.url))
      .catch(() => setLogoUrl(null))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <BrandingContext.Provider value={{ logoUrl, refresh }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  return useContext(BrandingContext)
}
```

- [ ] **Step 2: Avvolgi `App.tsx` con `BrandingProvider`**

In `frontend/src/App.tsx`, aggiungi l'import:

```typescript
import { BrandingProvider } from './context/BrandingContext'
```

Trova la funzione `export default function App()` (che contiene `<BrowserRouter>` e `<AuthProvider>`). Avvolgi il contenuto con `<BrandingProvider>`:

Il pattern attuale è:
```tsx
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}
```

Modificalo in:
```tsx
export default function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </BrandingProvider>
  )
}
```

- [ ] **Step 3: Verifica compilazione TypeScript frontend**

```bash
cd frontend && npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/context/BrandingContext.tsx frontend/src/App.tsx
git commit -m "feat(branding): BrandingContext con logoUrl e refresh"
```

---

### Task 5: Favicon dinamica

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Aggiungi favicon effect in `AppContent`**

In `AppContent` (in `App.tsx`), aggiungi:

```typescript
import { useBranding } from './context/BrandingContext'
```

All'inizio della funzione `AppContent`, dopo le hook esistenti:

```typescript
const { logoUrl } = useBranding()

useEffect(() => {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (link) {
    link.href = logoUrl ?? '/favicon.svg'
    link.type = logoUrl?.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
  }
}, [logoUrl])
```

Assicurati che `useEffect` sia importato da React.

- [ ] **Step 2: Verifica compilazione**

```bash
cd frontend && npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(branding): favicon dinamica da logoUrl"
```

---

### Task 6: Logo nella Navbar pubblica

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`

- [ ] **Step 1: Aggiungi `useBranding` e logo affianco al wordmark**

In `Navbar.tsx`, aggiungi l'import:

```typescript
import { useBranding } from '../../context/BrandingContext'
```

All'inizio della funzione `Navbar`, dopo le hook esistenti:

```typescript
const { logoUrl } = useBranding()
```

Trova il blocco `{/* Wordmark */}` (Link con `data-testid="navbar-wordmark"`). Modifica il Link per includere il logo:

Attuale:
```tsx
<Link
  to="/"
  data-testid="navbar-wordmark"
  className={`${wordmarkBase} ${wordmarkColor}`}
>
  MIRIGLIANI
</Link>
```

Nuovo:
```tsx
<Link
  to="/"
  data-testid="navbar-wordmark"
  className={`flex items-center gap-2 ${wordmarkBase} ${wordmarkColor}`}
>
  {logoUrl && (
    <img
      src={logoUrl}
      alt="Mirigliani logo"
      className="h-6 w-auto object-contain"
    />
  )}
  MIRIGLIANI
</Link>
```

- [ ] **Step 2: Verifica compilazione**

```bash
cd frontend && npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/Navbar.tsx
git commit -m "feat(branding): logo affianco a wordmark nella Navbar"
```

---

### Task 7: Logo nella sidebar admin e ClientSidebar

**Files:**
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Aggiungi import `useBranding` e voce "Interfaccia" in `NAV_ITEMS`**

In `AdminSidebar.tsx`, aggiungi l'import:

```typescript
import { useBranding } from '../../context/BrandingContext'
```

In `NAV_ITEMS`, dopo la voce `'Catalogo PDF'`, aggiungi:

```typescript
  {
    kind: 'group',
    label: 'Interfaccia',
    children: [
      { to: '/admin/branding/logo', label: 'Logo', permissions: ['branding.logo.manage'] },
    ],
  },
```

- [ ] **Step 2: Aggiungi logo nel header della sidebar**

All'inizio della funzione `AdminSidebar`, dopo le hook esistenti:

```typescript
const { logoUrl } = useBranding()
```

Trova il blocco del header (il `<div>` con `border-b` che contiene il NavLink "Mirigliani"). Modifica il NavLink per includere il logo:

Attuale:
```tsx
<NavLink
  to="/"
  className="text-lg tracking-[0.16em] uppercase text-[#031634] transition-colors hover:text-[#C9A96E]"
  style={{ fontFamily: 'Playfair Display, serif' }}
>
  Mirigliani
</NavLink>
```

Nuovo:
```tsx
<NavLink
  to="/"
  className="flex items-center gap-2 text-lg tracking-[0.16em] uppercase text-[#031634] transition-colors hover:text-[#C9A96E]"
  style={{ fontFamily: 'Playfair Display, serif' }}
>
  {logoUrl && (
    <img
      src={logoUrl}
      alt="Mirigliani logo"
      className="h-5 w-auto object-contain"
    />
  )}
  Mirigliani
</NavLink>
```

- [ ] **Step 3: Verifica compilazione**

```bash
cd frontend && npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/admin/AdminSidebar.tsx
git commit -m "feat(branding): logo in AdminSidebar e voce menu Interfaccia > Logo"
```

---

### Task 8: Logo sopra MIRIGLIANI nella HomePage

**Files:**
- Modify: `frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: Aggiungi `useBranding` e logo sopra h1**

In `HomePage.tsx`, aggiungi l'import:

```typescript
import { useBranding } from '../context/BrandingContext'
```

All'inizio della funzione `HomePage`, dopo le hook esistenti:

```typescript
const { logoUrl } = useBranding()
```

Trova la `<section>` "Sezione 0" che contiene la `<h1>`. Prima dell'`<h1>`, aggiungi:

```tsx
{/* Logo aziendale (1/5 della larghezza del titolo) */}
{logoUrl && (
  <img
    src={logoUrl}
    alt="Mirigliani logo"
    className="object-contain"
    style={{ width: 'clamp(3.5rem, 8vw, 7rem)', height: 'auto' }}
  />
)}
```

La sezione `gap-12` tra gli elementi assicura la spaziatura corretta tra logo e titolo.

- [ ] **Step 2: Verifica compilazione**

```bash
cd frontend && npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/HomePage.tsx
git commit -m "feat(branding): logo sopra MIRIGLIANI nella HomePage"
```

---

### Task 9: Pagina admin BrandingLogoPage

**Files:**
- Create: `frontend/src/pages/admin/BrandingLogoPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Crea `frontend/src/pages/admin/BrandingLogoPage.tsx`**

```typescript
import { useRef, useState } from 'react'
import { useBranding } from '../../context/BrandingContext'

const MAX_SIZE_BYTES = 2 * 1024 * 1024

export default function BrandingLogoPage() {
  const { logoUrl, refresh } = useBranding()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleUpload(file: File) {
    setError(null)
    setSuccess(null)

    if (!['image/png', 'image/svg+xml'].includes(file.type)) {
      setError('Formato non supportato. Usa PNG o SVG.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('File troppo grande. Massimo 2 MB.')
      return
    }

    setUploading(true)
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
      setSuccess('Logo caricato con successo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    setError(null)
    setSuccess(null)
    setDeleting(true)
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
      setSuccess('Logo eliminato.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto.')
    } finally {
      setDeleting(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) void handleUpload(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleUpload(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-8">
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
          Carica un'immagine PNG o SVG. Per PNG, dimensioni massime 512×512px. Questa immagine
          comparirà sopra il titolo nella homepage, accanto al nome nella barra di navigazione
          e come favicon del sito.
        </p>
      </div>

      {/* Anteprima corrente */}
      <div className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.14em] text-[#031634]">
          Logo attuale
        </p>
        {logoUrl ? (
          <div className="flex items-start gap-6">
            <div className="flex h-32 w-32 items-center justify-center border border-[#E5E0D8] bg-[#F8F7F4] p-3">
              <img
                src={`${logoUrl}?t=${Date.now()}`}
                alt="Logo corrente"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[#6B7280]">
                File: <span className="font-medium text-[#031634]">{logoUrl.split('/').pop()}</span>
              </p>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="inline-flex min-h-9 items-center justify-center border border-[#E5E0D8] px-4 py-2 text-sm font-medium text-[#031634] transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-50"
              >
                {deleting ? 'Eliminazione...' : 'Elimina logo'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#6B7280]">Nessun logo caricato.</p>
        )}
      </div>

      {/* Drop zone */}
      <div
        className="border border-dashed border-[#C9A96E] bg-white p-10 text-center transition-colors hover:bg-[#FAF9F6]"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <p className="mb-3 text-sm text-[#6B7280]">
          Trascina qui un file PNG o SVG, oppure
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex min-h-9 items-center justify-center border border-[#C9A96E] px-6 py-2 text-sm font-medium text-[#C9A96E] transition-colors hover:bg-[#C9A96E] hover:text-white disabled:opacity-50"
        >
          {uploading ? 'Caricamento...' : 'Seleziona file'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="mt-3 text-xs text-[#6B7280]">PNG (max 512×512px) · SVG · max 2 MB</p>
      </div>

      {/* Feedback */}
      {error && (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Aggiungi lazy import e route in `App.tsx`**

Aggiungi il lazy import dopo gli altri import admin:

```typescript
const BrandingLogoPage = lazy(() => import('./pages/admin/BrandingLogoPage'))
```

Nella sezione route `/admin`, dopo il route `measures`, aggiungi:

```tsx
<Route path="branding/logo" element={<ProtectedRoute requiredPermissions={['branding.logo.manage']}><BrandingLogoPage /></ProtectedRoute>} />
```

- [ ] **Step 3: Verifica compilazione frontend**

```bash
cd frontend && npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/BrandingLogoPage.tsx frontend/src/App.tsx
git commit -m "feat(branding): pagina admin Logo con upload/preview/elimina"
```

---

### Task 10: Verifica integrazione end-to-end

- [ ] **Step 1: Avvia backend e frontend**

```bash
# Terminale 1
cd backend && npm run dev

# Terminale 2
cd frontend && npm run dev
```

- [ ] **Step 2: Test upload logo**

1. Vai su `/admin/branding/logo`
2. Verifica che la voce "Interfaccia > Logo" sia presente nel sidemenu (solo per super_admin/manager)
3. Carica un PNG ≤512×512px
4. Verifica che la preview appaia nella pagina
5. Verifica che il logo appaia nella Navbar pubblica (`/`)
6. Verifica che il logo appaia nel header del sidemenu admin
7. Verifica che il logo appaia sopra "MIRIGLIANI" nella homepage (`/`)
8. Verifica che il favicon del browser cambi

- [ ] **Step 3: Test eliminazione**

1. Clicca "Elimina logo"
2. Verifica che la preview scompaia
3. Verifica che il logo scompaia da navbar, sidebar, homepage
4. Verifica che il favicon torni al default `/favicon.svg`

- [ ] **Step 4: Test validazione**

1. Prova a caricare un JPEG → atteso errore "Formato non supportato"
2. Prova a caricare un PNG >512×512px → atteso errore con dimensioni
3. Prova a caricare un file >2MB → atteso errore "File troppo grande"

- [ ] **Step 5: Commit finale**

```bash
git add -A
git commit -m "feat(branding): integrazione logo completa — verifica e-2-e"
```

---

## Note implementative

- `LOGO_DIR` è definito separatamente in `public.ts` e `branding.ts` — non duplicare in un terzo file, sono solo due costanti banali.
- La funzione `getPngDimensions` non usa dipendenze esterne: legge i byte 16-23 del buffer PNG (specifica standard).
- Il `BrandingContext` è fuori da `AuthProvider` per permettere il fetch del logo anche nella homepage pubblica prima del login.
- La cache-buster `?t=${Date.now()}` sull'`<img>` nella pagina di upload serve solo lì, per forzare il reload dopo un nuovo upload. Nelle altre componenti (Navbar, HomePage) non è necessaria perché il `refresh()` aggiorna l'URL nel context.
- Il seed del database non è necessario: i permessi vengono sincronizzati al prossimo `npm run db:seed` oppure manualmente dall'admin tramite il pannello Ruoli esistente.

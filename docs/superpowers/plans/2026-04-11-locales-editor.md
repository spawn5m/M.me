# Locales Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pagina admin `/admin/locales` che permette di modificare i testi italiani del sito con effetto immediato, senza rebuild.

**Architecture:** Backend espone `GET /api/public/locales/it` (file → JSON) e `PUT /api/admin/locales` (JSON → file, scrittura atomica). Frontend carica i18n via HTTP backend con fallback sul bundle statico. La pagina admin mostra le chiavi raggruppate per pagina del sito con salvataggio per sezione.

**Tech Stack:** Fastify v5, TypeScript strict, React 19, i18next v26, i18next-http-backend, Vitest

---

## Mappa file

| File | Azione |
|---|---|
| `backend/src/lib/authorization/permissions.ts` | Modifica — aggiunge `locales.manage` |
| `backend/src/lib/authorization/role-defaults.ts` | Modifica — assegna `locales.manage` a super_admin e manager |
| `backend/src/routes/locales.ts` | Crea |
| `backend/src/routes/__tests__/locales.test.ts` | Crea |
| `backend/src/app.ts` | Modifica — registra localesRoutes |
| `frontend/package.json` | Modifica — aggiunge i18next-http-backend |
| `frontend/src/main.tsx` | Modifica — cambia init i18n |
| `frontend/src/pages/admin/LocalesPage.tsx` | Crea |
| `frontend/src/App.tsx` | Modifica — lazy import + route |
| `frontend/src/components/admin/AdminSidebar.tsx` | Modifica — voce "Testi" nel gruppo Interfaccia |
| `frontend/src/context/AuthContext.tsx` | Modifica — aggiunge locales.manage al routing admin |

---

## Task 1: Aggiungi permesso `locales.manage`

**Files:**
- Modify: `backend/src/lib/authorization/permissions.ts`
- Modify: `backend/src/lib/authorization/role-defaults.ts`

- [ ] **Step 1: Aggiungi il codice permesso all'array SYSTEM_PERMISSION_CODES**

In `backend/src/lib/authorization/permissions.ts`, inserisci `'locales.manage'` nell'array dopo `'branding.logo.manage'`:

```ts
// riga attuale: 'branding.logo.manage',
// riga attuale: 'client.profile.read',
// diventa:
  'branding.logo.manage',
  'locales.manage',
  'client.profile.read',
```

- [ ] **Step 2: Aggiungi la definizione in SYSTEM_PERMISSIONS**

Sempre in `permissions.ts`, alla fine dell'array `SYSTEM_PERMISSIONS`, aggiungi la riga dopo quella di `branding.logo.manage`:

```ts
  { code: 'branding.logo.manage', resource: 'branding.logo', action: 'manage', label: 'Gestisci Logo', description: 'Caricare o eliminare il logo aziendale.', isSystem: true },
  { code: 'locales.manage', resource: 'locales', action: 'manage', label: 'Gestisci Testi', description: 'Modificare i testi del sito.', isSystem: true },
  { code: 'client.profile.read', ...
```

- [ ] **Step 3: Assegna il permesso ai ruoli super_admin e manager**

In `backend/src/lib/authorization/role-defaults.ts`, aggiungi `'locales.manage'` dopo `'branding.logo.manage'` sia nell'array `super_admin` che in quello `manager`:

```ts
// super_admin (riga attuale: 'branding.logo.manage',)
    'branding.logo.manage',
    'locales.manage',
  ],
  manager: [
    // ...
    'branding.logo.manage',
    'locales.manage',
  ],
```

- [ ] **Step 4: Verifica type-check backend**

```bash
cd backend && npx tsc --noEmit
```

Expected: nessun errore TypeScript.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/authorization/permissions.ts backend/src/lib/authorization/role-defaults.ts
git commit -m "feat(locales): aggiungi permesso locales.manage"
```

---

## Task 2: Backend — route locales

**Files:**
- Create: `backend/src/routes/locales.ts`
- Create: `backend/src/routes/__tests__/locales.test.ts`

- [ ] **Step 1: Crea `backend/src/routes/locales.ts` con named exports**

```ts
import { FastifyPluginAsync } from 'fastify'
import fs from 'fs'
import path from 'path'

// Sovrascrivibile via env per i test (usa un file temporaneo)
export const LOCALES_PATH =
  process.env.LOCALES_PATH ??
  path.resolve(process.cwd(), '..', 'frontend', 'src', 'locales', 'it.json')

export function readLocales(): Record<string, unknown> {
  const raw = fs.readFileSync(LOCALES_PATH, 'utf-8')
  return JSON.parse(raw) as Record<string, unknown>
}

export function writeLocalesAtomic(data: Record<string, unknown>): void {
  const tmp = LOCALES_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  fs.renameSync(tmp, LOCALES_PATH)
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
```

- [ ] **Step 2: Verifica type-check**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
```

Expected: nessun errore TypeScript.

- [ ] **Step 3: Commit intermedio**

```bash
git add backend/src/routes/locales.ts
git commit -m "feat(locales): route pubblica e admin per it.json"
```

- [ ] **Step 4: Scrivi il test che fallisce**

Crea `backend/src/routes/__tests__/locales.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { FastifyInstance } from 'fastify'
import { buildTestApp, cleanupTestDb, getAuthCookie, seedTestUser } from '../../test-helper'
import { SYSTEM_PERMISSIONS, type PermissionCode } from '../../lib/authorization/permissions'

const SAMPLE_LOCALE = { nav: { home: 'Home' }, auth: { login: 'Accedi' } }

let tmpFile: string

function setLocalesPath() {
  tmpFile = path.join(os.tmpdir(), `locales-test-${Date.now()}.json`)
  fs.writeFileSync(tmpFile, JSON.stringify(SAMPLE_LOCALE))
  process.env.LOCALES_PATH = tmpFile
}

function cleanLocalesPath() {
  delete process.env.LOCALES_PATH
  if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
}

interface AuthorizationPrismaClient {
  permission: {
    upsert(args: {
      where: { code: string }
      update: object
      create: object
    }): Promise<{ id: string; code: string }>
  }
  rolePermission: {
    create(args: { data: { roleId: string; permissionId: string } }): Promise<unknown>
  }
}

async function ensurePermission(app: FastifyInstance, code: PermissionCode) {
  const definition = SYSTEM_PERMISSIONS.find((p) => p.code === code)
  if (!definition) throw new Error(`Permission ${code} non trovata`)
  const prisma = app.prisma as unknown as AuthorizationPrismaClient
  return prisma.permission.upsert({ where: { code }, update: definition, create: definition })
}

async function grantPermission(app: FastifyInstance, roleName: string, code: PermissionCode) {
  const role = await app.prisma.role.findUnique({ where: { name: roleName } })
  if (!role) throw new Error(`Ruolo ${roleName} non trovato`)
  const permission = await ensurePermission(app, code)
  const prisma = app.prisma as unknown as AuthorizationPrismaClient
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } })
}

describe('Locales routes', () => {
  let app: FastifyInstance
  let superAdminCookie: string

  beforeAll(async () => {
    setLocalesPath()
    app = await buildTestApp()
    await seedTestUser(app, { role: 'super_admin' })
    await grantPermission(app, 'super_admin', 'locales.manage')
    superAdminCookie = await getAuthCookie(app, 'super_admin')
  })

  afterAll(async () => {
    cleanLocalesPath()
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(() => {
    // Ripristina il file di test prima di ogni test
    fs.writeFileSync(tmpFile, JSON.stringify(SAMPLE_LOCALE))
  })

  // GET /api/public/locales/it
  it('GET /api/public/locales/it → 200 con il JSON del file', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/locales/it',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as unknown
    expect(body).toEqual(SAMPLE_LOCALE)
  })

  it('GET /api/public/locales/it → Cache-Control: no-store', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/locales/it' })
    expect(res.headers['cache-control']).toBe('no-store')
  })

  // PUT /api/admin/locales
  it('PUT /api/admin/locales senza auth → 401', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/locales',
      payload: SAMPLE_LOCALE,
    })
    expect(res.statusCode).toBe(401)
  })

  it('PUT /api/admin/locales con body non oggetto → 400', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/locales',
      headers: { cookie: superAdminCookie },
      payload: [1, 2, 3],
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT /api/admin/locales con chiavi mancanti → 400', async () => {
    // Rimuove una chiave di primo livello esistente
    const incompleto = { nav: { home: 'Home' } } // manca auth
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/locales',
      headers: { cookie: superAdminCookie },
      payload: incompleto,
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT /api/admin/locales con payload valido → 200 e file aggiornato', async () => {
    const updated = { nav: { home: 'Home IT' }, auth: { login: 'Entra' } }
    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/locales',
      headers: { cookie: superAdminCookie },
      payload: updated,
    })
    expect(res.statusCode).toBe(200)
    const saved = JSON.parse(fs.readFileSync(tmpFile, 'utf-8')) as unknown
    expect(saved).toEqual(updated)
  })
})
```

- [ ] **Step 5: Esegui il test per verificare che fallisce (route non ancora registrata in app.ts)**

```bash
cd backend && npx vitest run src/routes/__tests__/locales.test.ts 2>&1 | tail -20
```

Expected: i test falliscono con 404 — le route non sono ancora registrate in `app.ts`. Questo è corretto.

- [ ] **Step 6: Commit del test**

```bash
git add backend/src/routes/__tests__/locales.test.ts
git commit -m "test(locales): test route locales (fallisce finché non registrata in app.ts)"
```

---

## Task 3: Registra localesRoutes in app.ts

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Aggiungi import in app.ts**

In `backend/src/app.ts`, aggiungi dopo `import brandingAdminRoutes from './routes/branding'`:

```ts
import { localesPublicRoutes, localesAdminRoutes } from './routes/locales'
```

- [ ] **Step 2: Registra il plugin pubblico**

Dopo `await app.register(publicRoutes, { prefix: '/api/public' })`, aggiungi:

```ts
  await app.register(localesPublicRoutes, { prefix: '/api/public/locales' })
```

- [ ] **Step 3: Registra il plugin admin**

Dopo `await app.register(brandingAdminRoutes, { prefix: '/api/admin/branding' })`, aggiungi:

```ts
  await app.register(localesAdminRoutes, { prefix: '/api/admin/locales' })
```

- [ ] **Step 4: Esegui i test — ora devono passare**

```bash
cd backend && npx vitest run src/routes/__tests__/locales.test.ts 2>&1 | tail -20
```

Expected: tutti PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add backend/src/app.ts
git commit -m "feat(locales): registra route pubblica e admin in app.ts"
```

---

## Task 4: Frontend — installa i18next-http-backend e aggiorna main.tsx

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Installa la dipendenza**

```bash
cd frontend && npm install i18next-http-backend
```

Expected: `i18next-http-backend` appare in `package.json` dependencies.

- [ ] **Step 2: Aggiorna main.tsx**

Sostituisci il contenuto di `frontend/src/main.tsx` con:

```ts
import React from 'react'
import { createRoot } from 'react-dom/client'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import it from './locales/it.json'
import App from './App.tsx'
import './index.css'

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: 'it',
    fallbackLng: 'it',
    // Il bundle statico serve come fallback se l'API non risponde
    resources: {
      it: { translation: it },
    },
    partialBundledLanguages: true,
    backend: {
      loadPath: '/api/public/locales/{{lng}}',
    },
    interpolation: {
      escapeValue: false,
    },
  })

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Verifica type-check frontend**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: nessun errore.

- [ ] **Step 4: Avvia dev server e verifica che il sito funzioni**

```bash
cd frontend && npm run dev
```

Visita `http://localhost:5173` e verifica che i testi siano presenti normalmente.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/main.tsx
git commit -m "feat(locales): carica i18n via HTTP backend con fallback statico"
```

---

## Task 5: Frontend — LocalesPage.tsx

**Files:**
- Create: `frontend/src/pages/admin/LocalesPage.tsx`

- [ ] **Step 1: Crea il file con la config delle sezioni**

Crea `frontend/src/pages/admin/LocalesPage.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react'
import i18n from 'i18next'

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface FieldDef {
  key: string         // dot-notation es. "home.headline"
  label: string       // etichetta human-readable
  multiline?: boolean // usa textarea invece di input
}

interface SubgroupDef {
  label: string
  fields: FieldDef[]
}

interface SectionDef {
  id: string
  label: string
  subgroups: SubgroupDef[]
}

// ─── Config sezioni ───────────────────────────────────────────────────────────

const SECTIONS: SectionDef[] = [
  {
    id: 'dati-aziendali',
    label: 'Dati Aziendali',
    subgroups: [
      {
        label: 'Sede Villamar',
        fields: [
          { key: 'whereWeAre.villamar', label: 'Nome sede' },
          { key: 'whereWeAre.villamarAddress', label: 'Indirizzo' },
          { key: 'whereWeAre.villamarPhone', label: 'Telefono' },
          { key: 'whereWeAre.villamarHours', label: 'Orari (stringa breve)' },
          { key: 'whereWeAre.pickupVillamarWeekdays', label: 'Orari ritiro lun-ven' },
          { key: 'whereWeAre.pickupVillamarSaturday', label: 'Orari ritiro sabato' },
          { key: 'whereWeAre.pickupVillamarSunday', label: 'Orari ritiro domenica' },
        ],
      },
      {
        label: 'Sede Sassari',
        fields: [
          { key: 'whereWeAre.sassari', label: 'Nome sede' },
          { key: 'whereWeAre.sassariAddress', label: 'Indirizzo' },
          { key: 'whereWeAre.sassariPhone', label: 'Telefono' },
          { key: 'whereWeAre.sassariHours', label: 'Orari (stringa breve)' },
          { key: 'whereWeAre.pickupSassariWeekdays', label: 'Orari ritiro lun-ven' },
          { key: 'whereWeAre.pickupSassariSaturday', label: 'Orari ritiro sabato' },
          { key: 'whereWeAre.pickupSassariSunday', label: 'Orari ritiro domenica' },
        ],
      },
      {
        label: 'Contatto email',
        fields: [
          { key: 'whereWeAre.contactMyMail', label: 'Email di contatto' },
        ],
      },
    ],
  },
  {
    id: 'home',
    label: 'Home',
    subgroups: [
      {
        label: 'Hero',
        fields: [
          { key: 'home.badge', label: 'Badge (es. "Dal 1988 in Sardegna")' },
          { key: 'home.headline', label: 'Titolo principale', multiline: true },
          { key: 'home.subheadline', label: 'Sottotitolo', multiline: true },
          { key: 'home.ctaPrimary', label: 'Bottone primario' },
          { key: 'home.ctaSecondary', label: 'Bottone secondario' },
        ],
      },
      {
        label: 'Sezione Imprese Funebri',
        fields: [
          { key: 'home.sectionFunebri', label: 'Titolo sezione' },
          { key: 'home.sectionFunebriInt', label: 'Intestazione interna' },
          { key: 'home.sectionFunebriDesc', label: 'Descrizione', multiline: true },
          { key: 'home.sectionFunebriCta', label: 'Bottone CTA' },
        ],
      },
      {
        label: 'Sezione Marmisti',
        fields: [
          { key: 'home.sectionMarmisti', label: 'Titolo sezione' },
          { key: 'home.sectionMarmistiInt', label: 'Intestazione interna' },
          { key: 'home.sectionMarmistiDesc', label: 'Descrizione', multiline: true },
          { key: 'home.sectionMarmistiCta', label: 'Bottone CTA' },
        ],
      },
      {
        label: 'Sezione Altri Servizi',
        fields: [
          { key: 'home.sectionAltri', label: 'Titolo sezione' },
          { key: 'home.sectionAltriInt', label: 'Intestazione interna' },
          { key: 'home.sectionAltriDesc', label: 'Descrizione', multiline: true },
          { key: 'home.sectionAltriCta', label: 'Bottone CTA' },
        ],
      },
      {
        label: 'Sedi',
        fields: [
          { key: 'home.locationTitle', label: 'Titolo sedi' },
          { key: 'home.locationVillamar', label: 'Nome Villamar' },
          { key: 'home.locationVillamarRegion', label: 'Regione Villamar' },
          { key: 'home.locationSassari', label: 'Nome Sassari' },
          { key: 'home.locationSassariRegion', label: 'Regione Sassari' },
        ],
      },
    ],
  },
  {
    id: 'nostra-storia',
    label: 'La Nostra Storia',
    subgroups: [
      {
        label: 'Hero',
        fields: [
          { key: 'ourStory.title', label: 'Titolo' },
          { key: 'ourStory.subtitle', label: 'Sottotitolo' },
          { key: 'ourStory.heroTagline', label: 'Tagline hero', multiline: true },
        ],
      },
      {
        label: 'Narrativa',
        fields: [
          { key: 'ourStory.narrative', label: 'Narrativa introduttiva', multiline: true },
          { key: 'ourStory.narrativeParagraph1', label: 'Paragrafo 1', multiline: true },
          { key: 'ourStory.narrativeParagraph2', label: 'Paragrafo 2', multiline: true },
        ],
      },
      {
        label: 'Valori',
        fields: [
          { key: 'ourStory.valuesTitle', label: 'Titolo sezione valori' },
          { key: 'ourStory.value1Title', label: 'Valore 1 — titolo' },
          { key: 'ourStory.value1Desc', label: 'Valore 1 — descrizione', multiline: true },
          { key: 'ourStory.value2Title', label: 'Valore 2 — titolo' },
          { key: 'ourStory.value2Desc', label: 'Valore 2 — descrizione', multiline: true },
          { key: 'ourStory.value3Title', label: 'Valore 3 — titolo' },
          { key: 'ourStory.value3Desc', label: 'Valore 3 — descrizione', multiline: true },
          { key: 'ourStory.locationTitle', label: 'Titolo sedi' },
        ],
      },
    ],
  },
  {
    id: 'dove-siamo',
    label: 'Dove Siamo',
    subgroups: [
      {
        label: 'Intestazioni',
        fields: [
          { key: 'whereWeAre.title', label: 'Titolo pagina' },
          { key: 'whereWeAre.subtitle', label: 'Sottotitolo', multiline: true },
          { key: 'whereWeAre.popupVillamar', label: 'Popup mappa — Villamar' },
          { key: 'whereWeAre.popupSassari', label: 'Popup mappa — Sassari' },
        ],
      },
      {
        label: 'Etichette generiche',
        fields: [
          { key: 'whereWeAre.labelAddress', label: 'Label indirizzo' },
          { key: 'whereWeAre.labelPhone', label: 'Label telefono' },
          { key: 'whereWeAre.labelHours', label: 'Label orari' },
          { key: 'whereWeAre.labelWeekdays', label: 'Label lun-ven' },
          { key: 'whereWeAre.labelSaturday', label: 'Label sabato' },
          { key: 'whereWeAre.labelSunday', label: 'Label domenica' },
          { key: 'whereWeAre.pickupTitle', label: 'Titolo sezione orari ritiro' },
          { key: 'whereWeAre.pickupVillamar', label: 'Label ritiro Villamar' },
          { key: 'whereWeAre.pickupSassari', label: 'Label ritiro Sassari' },
        ],
      },
      {
        label: 'Modulo di contatto',
        fields: [
          { key: 'whereWeAre.contactTitle', label: 'Titolo modulo' },
          { key: 'whereWeAre.contactName', label: 'Label nome' },
          { key: 'whereWeAre.contactEmail', label: 'Label email' },
          { key: 'whereWeAre.contactMessage', label: 'Label messaggio' },
          { key: 'whereWeAre.validationName', label: 'Errore validazione nome' },
          { key: 'whereWeAre.validationEmail', label: 'Errore validazione email' },
          { key: 'whereWeAre.validationMessage', label: 'Errore validazione messaggio' },
          { key: 'whereWeAre.contactSend', label: 'Testo bottone invia' },
          { key: 'whereWeAre.contactSending', label: 'Testo durante invio' },
          { key: 'whereWeAre.contactSent', label: 'Messaggio successo' },
          { key: 'whereWeAre.contactError', label: 'Messaggio errore' },
        ],
      },
    ],
  },
  {
    id: 'catalogo',
    label: 'Catalogo',
    subgroups: [
      {
        label: 'Generali',
        fields: [
          { key: 'catalog.coffins', label: 'Tab cofani' },
          { key: 'catalog.accessories', label: 'Tab accessori' },
          { key: 'catalog.marmista', label: 'Tab marmisti' },
          { key: 'catalog.ceabis', label: 'Tab Ceabis' },
          { key: 'catalog.noResults', label: 'Nessun risultato' },
          { key: 'catalog.loading', label: 'Caricamento' },
          { key: 'catalog.filterAll', label: 'Filtro tutti' },
          { key: 'catalog.filterSearch', label: 'Placeholder filtro' },
          { key: 'catalog.clearFilters', label: 'Pulisci filtri' },
          { key: 'catalog.viewDetails', label: 'Vedi dettagli' },
          { key: 'catalog.allCategories', label: 'Tutte le categorie' },
          { key: 'catalog.allSubcategories', label: 'Tutte le sottocategorie' },
          { key: 'catalog.searchPlaceholder', label: 'Placeholder ricerca' },
          { key: 'catalog.itemsFound', label: 'Articoli trovati (label)' },
          { key: 'catalog.searchFilters', label: 'Titolo filtri' },
          { key: 'catalog.searchByDescription', label: 'Placeholder ricerca descrizione' },
        ],
      },
      {
        label: 'Scheda prodotto',
        fields: [
          { key: 'catalog.characteristics', label: 'Titolo caratteristiche' },
          { key: 'catalog.internalMeasures', label: 'Titolo misure interne' },
          { key: 'catalog.measureUnit', label: 'Unità di misura' },
          { key: 'catalog.fieldEssence', label: 'Campo essenza' },
          { key: 'catalog.fieldFigure', label: 'Campo figura' },
          { key: 'catalog.fieldColor', label: 'Campo colorazione' },
          { key: 'catalog.fieldFinish', label: 'Campo finitura' },
          { key: 'catalog.fieldHead', label: 'Campo testa' },
          { key: 'catalog.fieldFeet', label: 'Campo piedi' },
          { key: 'catalog.fieldShoulder', label: 'Campo spalla' },
          { key: 'catalog.fieldHeight', label: 'Campo altezza' },
          { key: 'catalog.fieldWidth', label: 'Campo larghezza' },
          { key: 'catalog.fieldDepth', label: 'Campo profondità' },
          { key: 'catalog.description', label: 'Label descrizione' },
          { key: 'catalog.category', label: 'Label categoria' },
          { key: 'catalog.pdfPage', label: 'Pagina catalogo PDF' },
          { key: 'catalog.prevProduct', label: 'Prodotto precedente' },
          { key: 'catalog.nextProduct', label: 'Prodotto successivo' },
          { key: 'catalog.imageNotAvailable', label: 'Immagine non disponibile' },
        ],
      },
      {
        label: 'Prezzi e listini',
        fields: [
          { key: 'catalog.price', label: 'Label prezzo' },
          { key: 'catalog.priceListPrice', label: 'Prezzo listino' },
          { key: 'catalog.activePriceList', label: 'Listino attivo' },
          { key: 'catalog.priceListTypeSale', label: 'Tipo vendita' },
          { key: 'catalog.priceListTypePurchase', label: 'Tipo acquisto' },
          { key: 'catalog.availablePriceLists', label: 'Listini disponibili' },
          { key: 'catalog.selectPriceList', label: 'Seleziona listino' },
          { key: 'catalog.priceUnavailable', label: 'Prezzo non disponibile' },
          { key: 'catalog.publicPrice', label: 'Prezzo pubblico' },
          { key: 'catalog.contactAgent', label: "Contatta l'agente" },
        ],
      },
      {
        label: 'Pagine catalogo specifiche',
        fields: [
          { key: 'catalog.funeralHomesTitle', label: 'Titolo pagina imprese' },
          { key: 'catalog.funeralHomesSubtitle', label: 'Sottotitolo pagina imprese', multiline: true },
          { key: 'catalog.partnerBrands', label: 'Marchi partner' },
          { key: 'catalog.ceabisSubtitle', label: 'Sottotitolo Ceabis', multiline: true },
          { key: 'catalog.selectItemToView', label: 'Seleziona articolo (PDF)' },
          { key: 'catalog.accessoryCatalog', label: 'Titolo catalogo accessori' },
          { key: 'catalog.offerOfMonth', label: 'Offerta del mese' },
        ],
      },
    ],
  },
  {
    id: 'comuni',
    label: 'Comuni',
    subgroups: [
      {
        label: 'Navigazione',
        fields: [
          { key: 'nav.home', label: 'Link home' },
          { key: 'nav.ourStory', label: 'Link nostra storia' },
          { key: 'nav.whereWeAre', label: 'Link dove siamo' },
          { key: 'nav.funeralHomes', label: 'Link imprese funebri' },
          { key: 'nav.marmistas', label: 'Link marmisti' },
          { key: 'nav.altris', label: 'Link altri servizi' },
          { key: 'nav.reservedArea', label: 'Link area riservata' },
        ],
      },
      {
        label: 'Footer',
        fields: [
          { key: 'footer.textClaim', label: 'Claim footer', multiline: true },
          { key: 'footer.rightsReserved', label: 'Tutti i diritti riservati' },
          { key: 'footer.navigation', label: 'Titolo colonna navigazione' },
          { key: 'footer.contacts', label: 'Titolo colonna contatti' },
        ],
      },
      {
        label: 'Autenticazione',
        fields: [
          { key: 'auth.login', label: 'Titolo pagina login' },
          { key: 'auth.logout', label: 'Link logout' },
          { key: 'auth.email', label: 'Label email' },
          { key: 'auth.password', label: 'Label password' },
          { key: 'auth.loginButton', label: 'Bottone accedi' },
        ],
      },
      {
        label: 'Messaggi di errore',
        fields: [
          { key: 'errors.unauthorized', label: 'Errore 401' },
          { key: 'errors.forbidden', label: 'Errore 403' },
          { key: 'errors.notFound', label: 'Errore 404' },
          { key: 'errors.serverError', label: 'Errore 500' },
        ],
      },
    ],
  },
]

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Legge un valore annidato da un oggetto usando dot-notation. */
function getNestedValue(obj: Record<string, unknown>, dotKey: string): string {
  const parts = dotKey.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return ''
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : ''
}

/** Scrive un valore annidato in un oggetto usando dot-notation (immutabile). */
function setNestedValue(
  obj: Record<string, unknown>,
  dotKey: string,
  value: string,
): Record<string, unknown> {
  const parts = dotKey.split('.')
  if (parts.length === 0) return obj
  const result = { ...obj }
  const [first, ...rest] = parts
  if (rest.length === 0) {
    result[first] = value
  } else {
    const nested = typeof result[first] === 'object' && result[first] !== null
      ? (result[first] as Record<string, unknown>)
      : {}
    result[first] = setNestedValue(nested, rest.join('.'), value)
  }
  return result
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function LocalesPage() {
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id)
  const [fullLocale, setFullLocale] = useState<Record<string, unknown> | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [warnUnsaved, setWarnUnsaved] = useState(false)
  const [pendingSection, setPendingSection] = useState<string | null>(null)

  const currentSection = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0]

  // Carica il JSON completo dall'API
  useEffect(() => {
    fetch('/api/public/locales/it', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<Record<string, unknown>>
      })
      .then((data) => {
        setFullLocale(data)
        // Inizializza i valori del form con tutti i campi di tutte le sezioni
        const initial: Record<string, string> = {}
        for (const section of SECTIONS) {
          for (const subgroup of section.subgroups) {
            for (const field of subgroup.fields) {
              initial[field.key] = getNestedValue(data, field.key)
            }
          }
        }
        setFormValues(initial)
      })
      .catch(() => setLoadError('Impossibile caricare i testi dal server.'))
  }, [])

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
    setDirtyKeys((prev) => new Set(prev).add(key))
    setSaveSuccess(false)
    setSaveError(null)
  }, [])

  function doSwitchSection(id: string) {
    setActiveSection(id)
    setWarnUnsaved(false)
    setPendingSection(null)
    setSaveSuccess(false)
    setSaveError(null)
  }

  function handleSectionClick(id: string) {
    if (dirtyKeys.size > 0 && id !== activeSection) {
      setPendingSection(id)
      setWarnUnsaved(true)
    } else {
      doSwitchSection(id)
    }
  }

  async function handleSave() {
    if (!fullLocale) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    // Applica tutti i valori del form al JSON completo
    let updated = { ...fullLocale }
    for (const [key, value] of Object.entries(formValues)) {
      updated = setNestedValue(updated, key, value) as Record<string, unknown>
    }

    try {
      const res = await fetch('/api/admin/locales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updated),
      })
      if (!res.ok) {
        const body = await res.json() as { message?: string }
        throw new Error(body.message ?? 'Errore durante il salvataggio.')
      }
      setFullLocale(updated)
      setDirtyKeys(new Set())
      setSaveSuccess(true)
      // Aggiorna i18n senza ricaricare la pagina
      await i18n.reloadResources('it')
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore sconosciuto.')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    )
  }

  if (!fullLocale) {
    return (
      <div className="flex items-center gap-3 py-10 text-sm text-[#6B7280]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#031634] border-t-transparent" />
        Caricamento testi...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
          Interfaccia
        </p>
        <h2
          className="text-3xl text-[#031634]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          Testi del sito
        </h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          Modifica i testi dell'interfaccia italiana. Le modifiche sono attive immediatamente dopo il salvataggio.
        </p>
      </div>

      {/* Layout due colonne */}
      <div className="flex gap-8">
        {/* Sidebar sezioni */}
        <aside className="w-52 shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={[
                  'block w-full border px-4 py-3 text-left text-sm font-medium transition-colors',
                  activeSection === section.id
                    ? 'border-[#C9A96E] bg-white text-[#031634] shadow-[0_2px_8px_rgba(26,43,74,0.08)]'
                    : 'border-transparent text-[#6B7280] hover:border-[#E5E0D8] hover:bg-white hover:text-[#031634]',
                ].join(' ')}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Pannello campi */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Avviso modifiche non salvate */}
          {warnUnsaved && pendingSection && (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Hai modifiche non salvate in questa sezione.{' '}
              <button
                className="font-medium underline"
                onClick={() => doSwitchSection(pendingSection)}
              >
                Cambia sezione senza salvare
              </button>
              {' '}oppure{' '}
              <button
                className="font-medium underline"
                onClick={() => { setPendingSection(null); setWarnUnsaved(false) }}
              >
                rimani qui
              </button>
              .
            </div>
          )}

          {/* Campi della sezione attiva */}
          {currentSection.subgroups.map((subgroup) => (
            <div
              key={subgroup.label}
              className="border border-[#E5E0D8] bg-white p-6 shadow-[0_2px_8px_rgba(26,43,74,0.08)]"
            >
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.14em] text-[#031634]">
                {subgroup.label}
              </p>
              <div className="space-y-4">
                {subgroup.fields.map((field) => {
                  const isDirty = dirtyKeys.has(field.key)
                  const baseClass = 'w-full border px-3 py-2 text-sm text-[#031634] transition-colors focus:outline-none focus:border-[#031634]'
                  const borderClass = isDirty ? 'border-[#C9A96E]' : 'border-[#E5E0D8]'
                  return (
                    <div key={field.key}>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-[#6B7280]">
                        {field.label}
                        <span className="ml-2 font-mono text-[10px] normal-case tracking-normal text-[#9CA3AF]">
                          {field.key}
                        </span>
                      </label>
                      {field.multiline ? (
                        <textarea
                          rows={2}
                          value={formValues[field.key] ?? ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className={`${baseClass} ${borderClass} resize-y`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={formValues[field.key] ?? ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className={`${baseClass} ${borderClass}`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Feedback e bottone salva */}
          {saveError && (
            <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </p>
          )}
          {saveSuccess && (
            <p className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Testi salvati con successo.
            </p>
          )}
          <div className="flex items-center gap-4">
            <button
              onClick={() => void handleSave()}
              disabled={saving || dirtyKeys.size === 0}
              className="inline-flex min-h-9 items-center justify-center border border-[#C9A96E] px-6 py-2 text-sm font-medium text-[#C9A96E] transition-colors hover:bg-[#C9A96E] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : `Salva ${currentSection.label}`}
            </button>
            {dirtyKeys.size > 0 && !saving && (
              <p className="text-xs text-[#6B7280]">
                {dirtyKeys.size} campo{dirtyKeys.size !== 1 ? 'i' : ''} modificato{dirtyKeys.size !== 1 ? 'i' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifica type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: nessun errore TypeScript.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/LocalesPage.tsx
git commit -m "feat(locales): pagina admin editor testi con navigazione per sezione"
```

---

## Task 6: Routing, sidebar e AuthContext

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`
- Modify: `frontend/src/context/AuthContext.tsx`

- [ ] **Step 1: Aggiungi lazy import e route in App.tsx**

In `frontend/src/App.tsx`, aggiungi dopo `const BrandingLogoPage = lazy(...)`:

```tsx
const LocalesPage = lazy(() => import('./pages/admin/LocalesPage'))
```

Aggiungi la route dopo `<Route path="branding/logo" ...>`:

```tsx
<Route path="locales" element={<ProtectedRoute requiredPermissions={['locales.manage']}><LocalesPage /></ProtectedRoute>} />
```

- [ ] **Step 2: Aggiungi voce in AdminSidebar.tsx**

In `frontend/src/components/admin/AdminSidebar.tsx`, nel gruppo `'Interfaccia'`, aggiungi la voce `'Testi'` dopo `'Logo'`:

```ts
{
  kind: 'group',
  label: 'Interfaccia',
  children: [
    { to: '/admin/branding/logo', label: 'Logo', permissions: ['branding.logo.manage'] },
    { to: '/admin/locales', label: 'Testi', permissions: ['locales.manage'] },
  ],
},
```

- [ ] **Step 3: Aggiorna AuthContext.tsx**

In `frontend/src/context/AuthContext.tsx`, aggiungi la route locales nell'array `ADMIN_DEFAULT_ROUTE_RULES` (dopo la riga del catalog):

```ts
  { path: '/admin/catalog', permissions: ['catalog.pdf.read'] },
  { path: '/admin/locales', permissions: ['locales.manage'] },
```

- [ ] **Step 4: Verifica type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/admin/AdminSidebar.tsx frontend/src/context/AuthContext.tsx
git commit -m "feat(locales): route /admin/locales, sidebar e AuthContext aggiornati"
```

---

## Task 7: Verifica end-to-end

- [ ] **Step 1: Avvia backend e frontend**

```bash
# Terminale 1
cd backend && npm run dev

# Terminale 2
cd frontend && npm run dev
```

- [ ] **Step 2: Login come super_admin e verifica voce sidebar**

Vai su `http://localhost:5173/login`, accedi con super_admin. Verifica che nella sidebar appaia il gruppo **Interfaccia** → **Testi**.

- [ ] **Step 3: Apri la pagina e verifica caricamento**

Clicca su "Testi". La pagina deve caricare mostrando la sidebar delle sezioni a sinistra e i campi della sezione "Dati Aziendali" a destra.

- [ ] **Step 4: Modifica un campo e salva**

Modifica il campo `whereWeAre.contactMyMail` (Email di contatto) con un valore diverso. Il bordo del campo deve diventare oro. Clicca "Salva Dati Aziendali". Verifica che appaia il banner verde.

- [ ] **Step 5: Verifica file aggiornato**

```bash
grep "contactMyMail" frontend/src/locales/it.json
```

Expected: il valore deve essere quello inserito.

- [ ] **Step 6: Verifica aggiornamento i18n senza reload**

Senza ricaricare la pagina, naviga su `/` e verifica che il testo modificato sia aggiornato (se visibile nel frontend pubblico).

- [ ] **Step 7: Verifica fallback statico**

Stoppa il backend. Ricarica il sito. I testi devono essere presenti (dal bundle statico).

- [ ] **Step 8: Esegui tutti i test backend**

```bash
cd backend && npx vitest run 2>&1 | tail -30
```

Expected: tutti PASS, inclusi i nuovi test di `locales.test.ts`.

- [ ] **Step 9: Commit finale**

```bash
git add .
git commit -m "feat(locales): editor testi admin — implementazione completa"
```

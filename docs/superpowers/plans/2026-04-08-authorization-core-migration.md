# Authorization Core Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementare la core migration permission-based di Mirigliani, sostituendo l'enforcement runtime basato sui ruoli con permessi effettivi su backend e frontend.

**Architecture:** Il backend introduce un catalogo centrale dei permessi, una matrice ruolo -> permessi di default, un resolver dei permessi effettivi e nuove guard `checkPermission`. La sessione conserva solo `userId`, mentre ruoli e permessi vengono caricati a ogni request protetta. Il frontend continua a ricevere `roles[]` per labeling e routing UX, ma usa `permissions[]` per `AuthContext`, `ProtectedRoute` e `AdminSidebar`.

**Tech Stack:** TypeScript strict, Fastify 5, Prisma, PostgreSQL, React 19, Vite, Vitest, i18next.

---

## File map

| File | Azione | Note |
|---|---|---|
| `backend/src/lib/authorization/permissions.ts` | **Creare** | Catalogo centrale permessi + metadata runtime |
| `backend/src/lib/authorization/role-defaults.ts` | **Creare** | Matrice default ruolo -> permessi |
| `backend/src/lib/authorization/get-effective-permissions.ts` | **Creare** | Resolver runtime ruoli + permessi effettivi |
| `backend/src/lib/authorization/checks.ts` | **Creare** | Helper puri `hasPermission`, `hasAnyPermission`, `hasAllPermissions` |
| `backend/src/lib/authorization/__tests__/get-effective-permissions.test.ts` | **Creare** | Unit test resolver |
| `backend/src/lib/authorization/__tests__/checks.test.ts` | **Creare** | Unit test helper |
| `backend/prisma/schema.prisma` | **Modificare** | Estendere `Permission`, aggiungere `UserPermission` |
| `backend/prisma/seed.ts` | **Modificare** | Seed catalogo permessi + default role grants |
| `backend/src/plugins/auth.ts` | **Modificare** | Sessione `userId` only, request auth context, guard permission-based |
| `backend/src/routes/auth.ts` | **Modificare** | `login` e `me` con `permissions[]` |
| `backend/src/routes/users.ts` | **Modificare** | Guard e scope permission-based |
| `backend/src/routes/roles.ts` | **Modificare** | Guard `roles.read/manage` |
| `backend/src/routes/admin.ts` | **Modificare** | Dashboard admin -> `dashboard.admin.read` |
| `backend/src/routes/articles/coffins.ts` | **Modificare** | Guard `articles.coffins.*` |
| `backend/src/routes/articles/accessories.ts` | **Modificare** | Guard `articles.accessories.*` |
| `backend/src/routes/articles/marmista.ts` | **Modificare** | Guard `articles.marmista.*` |
| `backend/src/routes/lookups.ts` | **Modificare** | Guard `lookups.*` e `measures.*` |
| `backend/src/routes/pricelists.ts` | **Modificare** | Guard separate `sale` vs `purchase` |
| `backend/src/routes/client.ts` | **Modificare** | Guard `client.*` |
| `backend/src/test-helper.ts` | **Modificare** | Seed test user + cleanup `UserPermission` |
| `backend/src/routes/__tests__/auth.test.ts` | **Creare** | Route tests auth permission-based |
| `backend/src/routes/__tests__/users.test.ts` | **Modificare** | Scope + permessi utenti |
| `backend/src/routes/__tests__/roles.test.ts` | **Modificare** | `roles.read/manage` |
| `backend/src/routes/__tests__/admin.test.ts` | **Modificare** | `dashboard.admin.read` |
| `backend/src/routes/__tests__/articles.test.ts` | **Modificare** | Guard articoli permission-based |
| `backend/src/routes/__tests__/lookups.test.ts` | **Modificare** | Guard lookups/measures |
| `backend/src/routes/__tests__/pricelists.test.ts` | **Modificare** | Separazione permessi listini |
| `backend/src/routes/__tests__/client.test.ts` | **Modificare** | Guard area client permission-based |
| `frontend/src/context/AuthContext.tsx` | **Modificare** | `permissions[]`, `hasPermission()`, `hasAnyPermission()` |
| `frontend/src/components/admin/ProtectedRoute.tsx` | **Modificare** | `requiredPermissions`, `match` |
| `frontend/src/components/admin/AdminSidebar.tsx` | **Modificare** | Navigation permission-based |
| `frontend/src/App.tsx` | **Modificare** | Route protection permission-based |
| `frontend/src/components/admin/__tests__/AuthContext.test.tsx` | **Modificare** | Coverage `permissions[]` |
| `frontend/src/components/admin/__tests__/ProtectedRoute.test.tsx` | **Modificare** | Coverage `any/all` |
| `frontend/src/components/admin/__tests__/AdminSidebar.test.tsx` | **Modificare** | Visibility by permission set |
| `frontend/src/pages/__tests__/LoginPage.test.tsx` | **Modificare** | Payload `permissions[]` compatibile |
| `docs/authorization-runtime.md` | **Creare** | Catalogo, matrice ruolo -> permessi, route map, scope rules |

---

## Task 1: Crea il nucleo authorization backend

**Files:**
- Create: `backend/src/lib/authorization/permissions.ts`
- Create: `backend/src/lib/authorization/role-defaults.ts`
- Create: `backend/src/lib/authorization/get-effective-permissions.ts`
- Create: `backend/src/lib/authorization/checks.ts`
- Create: `backend/src/lib/authorization/__tests__/get-effective-permissions.test.ts`
- Create: `backend/src/lib/authorization/__tests__/checks.test.ts`

- [ ] **Step 1: Scrivi i test unitari in rosso**

```ts
import { describe, expect, it, vi } from 'vitest'
import { getEffectivePermissions } from '../get-effective-permissions'
import { hasAllPermissions, hasAnyPermission, hasPermission } from '../checks'

describe('getEffectivePermissions', () => {
  it('unisce permessi da ruoli e grant diretti senza duplicati', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          userRoles: [
            {
              role: {
                name: 'manager',
                rolePermissions: [
                  { permission: { code: 'dashboard.admin.read' } },
                  { permission: { code: 'users.read.all' } },
                ],
              },
            },
          ],
          userPermissions: [
            { permission: { code: 'roles.read' } },
            { permission: { code: 'users.read.all' } },
          ],
        }),
      },
    }

    await expect(getEffectivePermissions(prisma as never, 'user-1')).resolves.toEqual({
      roles: ['manager'],
      permissions: ['dashboard.admin.read', 'roles.read', 'users.read.all'],
    })
  })

  it('restituisce array vuoti se l utente non esiste', async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    }

    await expect(getEffectivePermissions(prisma as never, 'missing')).resolves.toEqual({
      roles: [],
      permissions: [],
    })
  })
})

describe('permission checks', () => {
  const permissions = ['dashboard.admin.read', 'users.read.all']

  it('hasPermission riconosce il singolo codice', () => {
    expect(hasPermission(permissions, 'users.read.all')).toBe(true)
    expect(hasPermission(permissions, 'roles.read')).toBe(false)
  })

  it('hasAnyPermission ritorna true se almeno un permesso combacia', () => {
    expect(hasAnyPermission(permissions, ['roles.read', 'users.read.all'])).toBe(true)
  })

  it('hasAllPermissions ritorna true solo se tutti i permessi sono presenti', () => {
    expect(hasAllPermissions(permissions, ['dashboard.admin.read', 'users.read.all'])).toBe(true)
    expect(hasAllPermissions(permissions, ['dashboard.admin.read', 'roles.read'])).toBe(false)
  })
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run:

```bash
npm run test -w backend -- src/lib/authorization/__tests__/get-effective-permissions.test.ts src/lib/authorization/__tests__/checks.test.ts
```

Expected: FAIL con `Cannot find module '../get-effective-permissions'` e `Cannot find module '../checks'`.

- [ ] **Step 3: Scrivi il catalogo e i default di ruolo**

`backend/src/lib/authorization/permissions.ts`:

```ts
export const SYSTEM_PERMISSION_CODES = [
  'dashboard.admin.read',
  'dashboard.client.read',
  'users.read.team',
  'users.read.all',
  'users.create',
  'users.update.team',
  'users.update.all',
  'users.disable',
  'users.assign_manager',
  'users.assign_pricelist',
  'users.super_admin.read',
  'users.super_admin.manage',
  'roles.read',
  'roles.manage',
  'articles.coffins.read',
  'articles.coffins.write',
  'articles.coffins.delete',
  'articles.coffins.import',
  'articles.coffins.upload_image',
  'articles.accessories.read',
  'articles.accessories.write',
  'articles.accessories.delete',
  'articles.accessories.import',
  'articles.marmista.read',
  'articles.marmista.write',
  'articles.marmista.delete',
  'articles.marmista.import',
  'lookups.read',
  'lookups.manage',
  'measures.read',
  'measures.manage',
  'pricelists.sale.read',
  'pricelists.sale.write',
  'pricelists.sale.delete',
  'pricelists.sale.assign',
  'pricelists.sale.preview',
  'pricelists.sale.recalculate',
  'pricelists.purchase.read',
  'pricelists.purchase.write',
  'pricelists.purchase.delete',
  'pricelists.purchase.preview',
  'pricelists.purchase.recalculate',
  'catalog.pdf.read',
  'catalog.pdf.write',
  'client.profile.read',
  'client.password.change',
  'client.catalog.funeral.read',
  'client.catalog.marmista.read',
] as const

export type PermissionCode = (typeof SYSTEM_PERMISSION_CODES)[number]

export interface PermissionDefinition {
  code: PermissionCode
  resource: string
  action: string
  scope?: string
  label: string
  description: string
  isSystem: true
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  { code: 'dashboard.admin.read', resource: 'dashboard', action: 'read', scope: 'admin', label: 'Dashboard Admin', description: 'Vedere dashboard e metriche amministrative.', isSystem: true },
  { code: 'dashboard.client.read', resource: 'dashboard', action: 'read', scope: 'client', label: 'Dashboard Cliente', description: 'Vedere dashboard area cliente.', isSystem: true },
  { code: 'users.read.team', resource: 'users', action: 'read', scope: 'team', label: 'Utenti Team', description: 'Vedere gli utenti nel proprio perimetro.', isSystem: true },
  { code: 'users.read.all', resource: 'users', action: 'read', scope: 'all', label: 'Utenti Globali', description: 'Vedere tutti gli utenti non super admin.', isSystem: true },
  { code: 'users.create', resource: 'users', action: 'create', label: 'Crea Utenti', description: 'Creare nuovi utenti.', isSystem: true },
  { code: 'users.update.team', resource: 'users', action: 'update', scope: 'team', label: 'Modifica Utenti Team', description: 'Modificare utenti del proprio perimetro.', isSystem: true },
  { code: 'users.update.all', resource: 'users', action: 'update', scope: 'all', label: 'Modifica Utenti Globali', description: 'Modificare utenti fuori dal proprio team.', isSystem: true },
  { code: 'users.disable', resource: 'users', action: 'disable', label: 'Disattiva Utenti', description: 'Disattivare utenti.', isSystem: true },
  { code: 'users.assign_manager', resource: 'users', action: 'assign_manager', label: 'Assegna Manager', description: 'Assegnare il manager di un utente.', isSystem: true },
  { code: 'users.assign_pricelist', resource: 'users', action: 'assign_pricelist', label: 'Assegna Listino', description: 'Assegnare listini a utenti cliente.', isSystem: true },
  { code: 'users.super_admin.read', resource: 'users', action: 'read', scope: 'super_admin', label: 'Vedi Super Admin', description: 'Vedere utenti super admin.', isSystem: true },
  { code: 'users.super_admin.manage', resource: 'users', action: 'manage', scope: 'super_admin', label: 'Gestisci Super Admin', description: 'Gestire utenti super admin.', isSystem: true },
  { code: 'roles.read', resource: 'roles', action: 'read', label: 'Vedi Ruoli', description: 'Vedere ruoli e permessi.', isSystem: true },
  { code: 'roles.manage', resource: 'roles', action: 'manage', label: 'Gestisci Ruoli', description: 'Creare, modificare o eliminare ruoli custom.', isSystem: true },
  { code: 'articles.coffins.read', resource: 'articles.coffins', action: 'read', label: 'Vedi Cofani', description: 'Vedere articoli cofani.', isSystem: true },
  { code: 'articles.coffins.write', resource: 'articles.coffins', action: 'write', label: 'Modifica Cofani', description: 'Creare e modificare cofani.', isSystem: true },
  { code: 'articles.coffins.delete', resource: 'articles.coffins', action: 'delete', label: 'Elimina Cofani', description: 'Eliminare cofani.', isSystem: true },
  { code: 'articles.coffins.import', resource: 'articles.coffins', action: 'import', label: 'Importa Cofani', description: 'Importare cofani da Excel.', isSystem: true },
  { code: 'articles.coffins.upload_image', resource: 'articles.coffins', action: 'upload_image', label: 'Carica Immagini Cofani', description: 'Caricare immagini per i cofani.', isSystem: true },
  { code: 'articles.accessories.read', resource: 'articles.accessories', action: 'read', label: 'Vedi Accessori', description: 'Vedere articoli accessori.', isSystem: true },
  { code: 'articles.accessories.write', resource: 'articles.accessories', action: 'write', label: 'Modifica Accessori', description: 'Creare e modificare accessori.', isSystem: true },
  { code: 'articles.accessories.delete', resource: 'articles.accessories', action: 'delete', label: 'Elimina Accessori', description: 'Eliminare accessori.', isSystem: true },
  { code: 'articles.accessories.import', resource: 'articles.accessories', action: 'import', label: 'Importa Accessori', description: 'Importare accessori da Excel.', isSystem: true },
  { code: 'articles.marmista.read', resource: 'articles.marmista', action: 'read', label: 'Vedi Articoli Marmista', description: 'Vedere articoli marmista.', isSystem: true },
  { code: 'articles.marmista.write', resource: 'articles.marmista', action: 'write', label: 'Modifica Articoli Marmista', description: 'Creare e modificare articoli marmista.', isSystem: true },
  { code: 'articles.marmista.delete', resource: 'articles.marmista', action: 'delete', label: 'Elimina Articoli Marmista', description: 'Eliminare articoli marmista.', isSystem: true },
  { code: 'articles.marmista.import', resource: 'articles.marmista', action: 'import', label: 'Importa Articoli Marmista', description: 'Importare articoli marmista da Excel.', isSystem: true },
  { code: 'lookups.read', resource: 'lookups', action: 'read', label: 'Vedi Lookup', description: 'Vedere categorie e lookup.', isSystem: true },
  { code: 'lookups.manage', resource: 'lookups', action: 'manage', label: 'Gestisci Lookup', description: 'Creare, modificare o eliminare lookup.', isSystem: true },
  { code: 'measures.read', resource: 'measures', action: 'read', label: 'Vedi Misure', description: 'Vedere misure dei cofani.', isSystem: true },
  { code: 'measures.manage', resource: 'measures', action: 'manage', label: 'Gestisci Misure', description: 'Creare, modificare o eliminare misure.', isSystem: true },
  { code: 'pricelists.sale.read', resource: 'pricelists.sale', action: 'read', label: 'Vedi Listini Vendita', description: 'Vedere listini di vendita.', isSystem: true },
  { code: 'pricelists.sale.write', resource: 'pricelists.sale', action: 'write', label: 'Modifica Listini Vendita', description: 'Creare e modificare listini di vendita.', isSystem: true },
  { code: 'pricelists.sale.delete', resource: 'pricelists.sale', action: 'delete', label: 'Elimina Listini Vendita', description: 'Eliminare listini di vendita.', isSystem: true },
  { code: 'pricelists.sale.assign', resource: 'pricelists.sale', action: 'assign', label: 'Assegna Listini Vendita', description: 'Assegnare listini di vendita agli utenti.', isSystem: true },
  { code: 'pricelists.sale.preview', resource: 'pricelists.sale', action: 'preview', label: 'Anteprima Listini Vendita', description: 'Vedere anteprima prezzi listini di vendita.', isSystem: true },
  { code: 'pricelists.sale.recalculate', resource: 'pricelists.sale', action: 'recalculate', label: 'Ricalcola Listini Vendita', description: 'Rigenerare snapshot prezzi listini di vendita.', isSystem: true },
  { code: 'pricelists.purchase.read', resource: 'pricelists.purchase', action: 'read', label: 'Vedi Listini Acquisto', description: 'Vedere listini di acquisto.', isSystem: true },
  { code: 'pricelists.purchase.write', resource: 'pricelists.purchase', action: 'write', label: 'Modifica Listini Acquisto', description: 'Creare e modificare listini di acquisto.', isSystem: true },
  { code: 'pricelists.purchase.delete', resource: 'pricelists.purchase', action: 'delete', label: 'Elimina Listini Acquisto', description: 'Eliminare listini di acquisto.', isSystem: true },
  { code: 'pricelists.purchase.preview', resource: 'pricelists.purchase', action: 'preview', label: 'Anteprima Listini Acquisto', description: 'Vedere anteprima prezzi listini di acquisto.', isSystem: true },
  { code: 'pricelists.purchase.recalculate', resource: 'pricelists.purchase', action: 'recalculate', label: 'Ricalcola Listini Acquisto', description: 'Rigenerare snapshot prezzi listini di acquisto.', isSystem: true },
  { code: 'catalog.pdf.read', resource: 'catalog.pdf', action: 'read', label: 'Vedi Catalogo PDF', description: 'Vedere stato e metadati del catalogo PDF.', isSystem: true },
  { code: 'catalog.pdf.write', resource: 'catalog.pdf', action: 'write', label: 'Modifica Catalogo PDF', description: 'Caricare o sostituire il catalogo PDF.', isSystem: true },
  { code: 'client.profile.read', resource: 'client.profile', action: 'read', label: 'Vedi Profilo Cliente', description: 'Vedere il profilo cliente e i listini collegati.', isSystem: true },
  { code: 'client.password.change', resource: 'client.password', action: 'change', label: 'Cambia Password Cliente', description: 'Cambiare la propria password.', isSystem: true },
  { code: 'client.catalog.funeral.read', resource: 'client.catalog.funeral', action: 'read', label: 'Vedi Catalogo Funebre Cliente', description: 'Consultare il catalogo funebre assegnato.', isSystem: true },
  { code: 'client.catalog.marmista.read', resource: 'client.catalog.marmista', action: 'read', label: 'Vedi Catalogo Marmista Cliente', description: 'Consultare il catalogo marmista assegnato.', isSystem: true },
]
```

`backend/src/lib/authorization/role-defaults.ts`:

```ts
import type { PermissionCode } from './permissions'

export const SYSTEM_ROLE_DEFAULTS: Record<string, PermissionCode[]> = {
  super_admin: [
    'dashboard.admin.read', 'users.read.team', 'users.read.all', 'users.create', 'users.update.team', 'users.update.all',
    'users.disable', 'users.assign_manager', 'users.assign_pricelist', 'users.super_admin.read', 'users.super_admin.manage',
    'roles.read', 'roles.manage', 'articles.coffins.read', 'articles.coffins.write', 'articles.coffins.delete',
    'articles.coffins.import', 'articles.coffins.upload_image', 'articles.accessories.read', 'articles.accessories.write',
    'articles.accessories.delete', 'articles.accessories.import', 'articles.marmista.read', 'articles.marmista.write',
    'articles.marmista.delete', 'articles.marmista.import', 'lookups.read', 'lookups.manage', 'measures.read',
    'measures.manage', 'pricelists.sale.read', 'pricelists.sale.write', 'pricelists.sale.delete', 'pricelists.sale.assign',
    'pricelists.sale.preview', 'pricelists.sale.recalculate', 'pricelists.purchase.read', 'pricelists.purchase.write',
    'pricelists.purchase.delete', 'pricelists.purchase.preview', 'pricelists.purchase.recalculate', 'catalog.pdf.read',
    'catalog.pdf.write',
  ],
  manager: [
    'dashboard.admin.read', 'users.read.team', 'users.read.all', 'users.create', 'users.update.team', 'users.update.all',
    'users.disable', 'users.assign_manager', 'users.assign_pricelist', 'articles.coffins.read', 'articles.coffins.write',
    'articles.coffins.delete', 'articles.coffins.import', 'articles.coffins.upload_image', 'articles.accessories.read',
    'articles.accessories.write', 'articles.accessories.delete', 'articles.accessories.import', 'articles.marmista.read',
    'articles.marmista.write', 'articles.marmista.delete', 'articles.marmista.import', 'lookups.read', 'lookups.manage',
    'measures.read', 'measures.manage', 'pricelists.sale.read', 'pricelists.sale.write', 'pricelists.sale.delete',
    'pricelists.sale.assign', 'pricelists.sale.preview', 'pricelists.sale.recalculate', 'pricelists.purchase.read',
    'pricelists.purchase.write', 'pricelists.purchase.delete', 'pricelists.purchase.preview', 'pricelists.purchase.recalculate',
    'catalog.pdf.read', 'catalog.pdf.write',
  ],
  collaboratore: [
    'dashboard.admin.read', 'users.read.team', 'users.update.team', 'articles.coffins.read', 'articles.coffins.write',
    'articles.coffins.import', 'articles.coffins.upload_image', 'articles.accessories.read', 'articles.accessories.write',
    'articles.accessories.import', 'articles.marmista.read', 'articles.marmista.write', 'articles.marmista.import',
    'lookups.read', 'measures.read',
  ],
  impresario_funebre: ['dashboard.client.read', 'client.profile.read', 'client.password.change', 'client.catalog.funeral.read'],
  marmista: ['dashboard.client.read', 'client.profile.read', 'client.password.change', 'client.catalog.marmista.read'],
}
```

- [ ] **Step 4: Implementa resolver e helper puri**

`backend/src/lib/authorization/get-effective-permissions.ts`:

```ts
export async function getEffectivePermissions(prisma: PrismaLike, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
              rolePermissions: { select: { permission: { select: { code: true } } } },
            },
          },
        },
      },
      userPermissions: { select: { permission: { select: { code: true } } } },
    },
  })

  if (!user) return { roles: [], permissions: [] }

  const roles = user.userRoles.map((entry) => entry.role.name).sort()
  const permissions = Array.from(
    new Set([
      ...user.userRoles.flatMap((entry) => entry.role.rolePermissions.map((rp) => rp.permission.code)),
      ...user.userPermissions.map((entry) => entry.permission.code),
    ]),
  ).sort()

  return { roles, permissions }
}
```

`backend/src/lib/authorization/checks.ts`:

```ts
export function hasPermission(permissions: string[], permission: string) {
  return permissions.includes(permission)
}

export function hasAnyPermission(permissions: string[], required: string[]) {
  return required.some((permission) => permissions.includes(permission))
}

export function hasAllPermissions(permissions: string[], required: string[]) {
  return required.every((permission) => permissions.includes(permission))
}
```

- [ ] **Step 5: Esegui di nuovo i test e verifica che passino**

Run:

```bash
npm run test -w backend -- src/lib/authorization/__tests__/get-effective-permissions.test.ts src/lib/authorization/__tests__/checks.test.ts
```

Expected: PASS con 5 test verdi.

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/authorization
git commit -m "feat: add authorization permission core"
```

---

## Task 2: Estendi Prisma, seed e payload auth

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/seed.ts`
- Modify: `backend/src/routes/auth.ts`
- Modify: `backend/src/test-helper.ts`
- Create: `backend/src/routes/__tests__/auth.test.ts`

- [ ] **Step 1: Scrivi il test route-level in rosso**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildTestApp, cleanupTestDb, getAuthCookie, seedTestUser } from '../../test-helper'

describe('Auth API', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await cleanupTestDb(app)
    await app.close()
  })

  beforeEach(async () => {
    await cleanupTestDb(app)
    await seedTestUser(app, { email: 'manager@test.com', password: 'password123', roles: ['manager'] })
  })

  it('POST /api/auth/login restituisce ruoli e permessi', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'manager@test.com', password: 'password123' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().user.roles).toContain('manager')
    expect(response.json().permissions).toContain('users.read.all')
  })

  it('GET /api/auth/me ricalcola i permessi a ogni richiesta', async () => {
    const user = await app.prisma.user.findUniqueOrThrow({ where: { email: 'manager@test.com' } })
    const permission = await app.prisma.permission.findUniqueOrThrow({ where: { code: 'roles.read' } })
    const cookie = await getAuthCookie(app, 'manager@test.com', 'password123')

    await app.prisma.userPermission.create({
      data: { userId: user.id, permissionId: permission.id },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().permissions).toContain('roles.read')
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run:

```bash
npm run test -w backend -- src/routes/__tests__/auth.test.ts
```

Expected: FAIL per campo `code` mancante in `Permission`, relazione `userPermissions` inesistente o payload auth senza `permissions`.

- [ ] **Step 3: Aggiorna `schema.prisma` con `Permission.code` e `UserPermission`**

Inserisci queste modifiche strutturali:

```prisma
model User {
  id              String           @id @default(cuid())
  email           String           @unique
  password        String
  firstName       String
  lastName        String
  isActive        Boolean          @default(true)
  userRoles       UserRole[]
  userPermissions UserPermission[] @relation("UserDirectPermissions")
  grantedPermissions UserPermission[] @relation("GrantedByUser")
  funeralPriceListId  String?
  marmistaPriceListId String?
  funeralPriceList    PriceList?    @relation("UserFuneralPL", fields: [funeralPriceListId], references: [id])
  marmistaPriceList   PriceList?    @relation("UserMarmistaPL", fields: [marmistaPriceListId], references: [id])
  managers            UserManager[] @relation("UserManaged")
  managing            UserManager[] @relation("UserManager")
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
}

model Permission {
  id              String           @id @default(cuid())
  code            String           @unique
  resource        String
  action          String
  scope           String?
  label           String
  description     String
  isSystem        Boolean          @default(true)
  rolePermissions RolePermission[]
  userPermissions UserPermission[]
}

model UserPermission {
  userId          String
  permissionId    String
  grantedByUserId String?
  createdAt       DateTime   @default(now())
  user            User       @relation("UserDirectPermissions", fields: [userId], references: [id], onDelete: Cascade)
  permission      Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  grantedByUser   User?      @relation("GrantedByUser", fields: [grantedByUserId], references: [id], onDelete: SetNull)

  @@id([userId, permissionId])
}
```

- [ ] **Step 4: Genera la migration Prisma**

Run:

```bash
npm run db:migrate -w backend -- --name authorization_permissions
```

Expected: nuova migration Prisma generata e client rigenerato senza errori.

- [ ] **Step 5: Allinea seed, auth route e test helper**

`backend/prisma/seed.ts`:

```ts
import { SYSTEM_PERMISSIONS } from '../src/lib/authorization/permissions'
import { SYSTEM_ROLE_DEFAULTS } from '../src/lib/authorization/role-defaults'

for (const permission of SYSTEM_PERMISSIONS) {
  await prisma.permission.upsert({
    where: { code: permission.code },
    update: permission,
    create: permission,
  })
}

for (const [roleName, permissionCodes] of Object.entries(SYSTEM_ROLE_DEFAULTS)) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } })
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })

  for (const code of permissionCodes) {
    const permission = await prisma.permission.findUniqueOrThrow({ where: { code } })
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } })
  }
}
```

`backend/src/routes/auth.ts`:

```ts
const { roles, permissions } = await getEffectivePermissions(fastify.prisma, user.id)
request.session.set('userId', user.id)

return reply.send({
  user: {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles,
    isActive: user.isActive,
  },
  permissions,
})
```

`GET /api/auth/me`:

```ts
const userId = request.session.get('userId')!
const { roles, permissions } = await getEffectivePermissions(fastify.prisma, userId)

return reply.send({
  user: {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles,
    isActive: user.isActive,
    funeralPriceList: user.funeralPriceList ?? null,
    marmistaPriceList: user.marmistaPriceList ?? null,
  },
  permissions,
})
```

`backend/src/test-helper.ts`:

```ts
export async function cleanupTestDb(app: FastifyInstance): Promise<void> {
  await app.prisma.userPermission.deleteMany()
  await app.prisma.userRole.deleteMany()
  await app.prisma.userManager.deleteMany()
  await app.prisma.rolePermission.deleteMany()
  await app.prisma.user.deleteMany()
  await app.prisma.role.deleteMany()
  await app.prisma.permission.deleteMany()
}
```

- [ ] **Step 6: Esegui validazione Prisma e test auth**

Run:

```bash
npm exec -w backend prisma validate -- --schema prisma/schema.prisma
npm run test -w backend -- src/routes/__tests__/auth.test.ts
```

Expected: schema Prisma valido e test `auth.test.ts` PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/seed.ts backend/src/routes/auth.ts backend/src/test-helper.ts backend/src/routes/__tests__/auth.test.ts backend/prisma/migrations
git commit -m "feat: expose effective permissions in auth payloads"
```

---

## Task 3: Carica il contesto auth e migra `users` e `roles`

**Files:**
- Modify: `backend/src/plugins/auth.ts`
- Modify: `backend/src/routes/users.ts`
- Modify: `backend/src/routes/roles.ts`
- Modify: `backend/src/routes/__tests__/users.test.ts`
- Modify: `backend/src/routes/__tests__/roles.test.ts`

- [ ] **Step 1: Estendi i test di `users` e `roles` in rosso**

Aggiungi questi casi:

```ts
it('manager senza users.super_admin.read non vede utenti super_admin', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/users', headers: { cookie: managerCookie } })
  expect(res.statusCode).toBe(200)
  expect(res.json().data.some((user: { roles: { name: string }[] }) => user.roles.some((role) => role.name === 'super_admin'))).toBe(false)
})

it('collaboratore senza users.create riceve 403 su POST /api/users', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/users',
    headers: { cookie: collaboratoreCookie },
    payload: { email: 'nuovo-collab@test.com', password: 'password123', firstName: 'Nuovo', lastName: 'Collaboratore', roleIds: [] },
  })
  expect(res.statusCode).toBe(403)
})

it('grant diretto roles.read consente a un manager di leggere /api/roles', async () => {
  const manager = await app.prisma.user.findUniqueOrThrow({ where: { email: 'manager@test.com' } })
  const permission = await app.prisma.permission.findUniqueOrThrow({ where: { code: 'roles.read' } })
  await app.prisma.userPermission.create({ data: { userId: manager.id, permissionId: permission.id } })

  const res = await app.inject({ method: 'GET', url: '/api/roles', headers: { cookie: managerCookie } })
  expect(res.statusCode).toBe(200)
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run:

```bash
npm run test -w backend -- src/routes/__tests__/users.test.ts src/routes/__tests__/roles.test.ts
```

Expected: FAIL con status code non coerenti o grant diretto ignorato.

- [ ] **Step 3: Implementa `request.auth` e le nuove guard nel plugin**

`backend/src/plugins/auth.ts`:

```ts
declare module '@fastify/secure-session' {
  interface SessionData {
    userId: string
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: {
      userId: string
      roles: string[]
      permissions: string[]
    }
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    loadAuthorizationContext: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    checkPermission: (permission: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    checkAnyPermission: (permissions: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    checkAllPermissions: (permissions: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

fastify.decorate('loadAuthorizationContext', async (request, reply) => {
  const userId = request.session.get('userId')
  if (!userId) return reply.status(401).send({ error: 'Unauthorized', message: 'Sessione non valida o scaduta', statusCode: 401 })

  const auth = await getEffectivePermissions(fastify.prisma, userId)
  request.auth = { userId, roles: auth.roles, permissions: auth.permissions }
})

fastify.decorate('checkPermission', (permission) => async (request, reply) => {
  if (!hasPermission(request.auth.permissions, permission)) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Permesso insufficiente per questa operazione', statusCode: 403 })
  }
})
```

- [ ] **Step 4: Migra `users.ts` e `roles.ts` alle nuove guard**

`backend/src/routes/users.ts`:

```ts
fastify.addHook('preHandler', fastify.authenticate)
fastify.addHook('preHandler', fastify.loadAuthorizationContext)

fastify.get('/', {
  preHandler: [fastify.checkAnyPermission(['users.read.team', 'users.read.all'])],
}, async (req, reply) => {
  const requestingUserId = req.auth.userId
  const permissions = req.auth.permissions
  const canReadAll = permissions.includes('users.read.all')
  const canReadSuperAdmin = permissions.includes('users.super_admin.read')

  const where: Prisma.UserWhereInput = {}

  if (!canReadAll) {
    where.managers = { some: { managerId: requestingUserId } }
  }

  if (!canReadSuperAdmin) {
    where.userRoles = {
      ...(where.userRoles ?? {}),
      none: { role: { name: 'super_admin' } },
    }
  }
})
```

`POST /api/users`, `PUT /api/users/:id`, `DELETE /api/users/:id` devono usare rispettivamente `users.create`, `users.update.team|all`, `users.disable`, e applicare il blocco esplicito verso super admin senza `users.super_admin.manage`.

`backend/src/routes/roles.ts`:

```ts
fastify.addHook('preHandler', fastify.authenticate)
fastify.addHook('preHandler', fastify.loadAuthorizationContext)

fastify.get('/', { preHandler: [fastify.checkPermission('roles.read')] }, async (_req, reply) => {
  // body invariato
})

fastify.post('/', { preHandler: [fastify.checkPermission('roles.manage')] }, async (req, reply) => {
  // body invariato
})

fastify.delete('/:id', { preHandler: [fastify.checkPermission('roles.manage')] }, async (req, reply) => {
  // body invariato
})
```

- [ ] **Step 5: Esegui di nuovo i test e verifica che passino**

Run:

```bash
npm run test -w backend -- src/routes/__tests__/users.test.ts src/routes/__tests__/roles.test.ts
```

Expected: PASS con scope team, blocco super admin e grant diretto funzionanti.

- [ ] **Step 6: Commit**

```bash
git add backend/src/plugins/auth.ts backend/src/routes/users.ts backend/src/routes/roles.ts backend/src/routes/__tests__/users.test.ts backend/src/routes/__tests__/roles.test.ts
git commit -m "refactor: migrate users and roles to permission checks"
```

---

## Task 4: Migra dashboard admin, contenuti, listini e area client

**Files:**
- Modify: `backend/src/routes/admin.ts`
- Modify: `backend/src/routes/articles/coffins.ts`
- Modify: `backend/src/routes/articles/accessories.ts`
- Modify: `backend/src/routes/articles/marmista.ts`
- Modify: `backend/src/routes/lookups.ts`
- Modify: `backend/src/routes/pricelists.ts`
- Modify: `backend/src/routes/client.ts`
- Modify: `backend/src/routes/__tests__/admin.test.ts`
- Modify: `backend/src/routes/__tests__/articles.test.ts`
- Modify: `backend/src/routes/__tests__/lookups.test.ts`
- Modify: `backend/src/routes/__tests__/pricelists.test.ts`
- Modify: `backend/src/routes/__tests__/client.test.ts`

- [ ] **Step 1: Aggiungi i test in rosso per i domini sensibili**

Inserisci almeno questi casi:

```ts
// in admin.test.ts e articles.test.ts aggiungi anche un `impresarioCookie` in beforeEach

// pricelists.test.ts
it('collaboratore riceve 403 su GET /api/admin/pricelists', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/admin/pricelists', headers: { cookie: collaboratoreCookie } })
  expect(res.statusCode).toBe(403)
})

// admin.test.ts
it('richiede dashboard.admin.read per la dashboard admin', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/admin', headers: { cookie: impresarioCookie } })
  expect(res.statusCode).toBe(403)
})

// client.test.ts
it('GET /api/client/me usa client.profile.read', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/client/me', headers: { cookie: impresarioCookie } })
  expect(res.statusCode).toBe(200)
})

// articles.test.ts
it('nega la creazione di cofani a un utente senza articles.coffins.write', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/admin/articles/coffins', headers: { cookie: impresarioCookie }, payload: { code: 'COF-PERM-01', description: 'Cofano non autorizzato' } })
  expect(res.statusCode).toBe(403)
})
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run:

```bash
npm run test -w backend -- src/routes/__tests__/admin.test.ts src/routes/__tests__/articles.test.ts src/routes/__tests__/lookups.test.ts src/routes/__tests__/pricelists.test.ts src/routes/__tests__/client.test.ts
```

Expected: FAIL con status code ancora legati ai ruoli o collaboratore ancora autorizzato ai listini.

- [ ] **Step 3: Migra ogni route al permesso corretto**

Pattern comune per tutti i file:

```ts
fastify.addHook('preHandler', fastify.authenticate)
fastify.addHook('preHandler', fastify.loadAuthorizationContext)
```

`backend/src/routes/admin.ts`:

```ts
fastify.get('/', { preHandler: [fastify.checkPermission('dashboard.admin.read')] }, async (_req, reply) => {
  return reply.send({ ok: true })
})
```

`backend/src/routes/articles/coffins.ts`:

```ts
const readCoffins = { preHandler: [fastify.checkPermission('articles.coffins.read')] }
const writeCoffins = { preHandler: [fastify.checkPermission('articles.coffins.write')] }
const importCoffins = { preHandler: [fastify.checkPermission('articles.coffins.import')] }
const uploadCoffinImage = { preHandler: [fastify.checkPermission('articles.coffins.upload_image')] }
const deleteCoffin = { preHandler: [fastify.checkPermission('articles.coffins.delete')] }
```

Applica questi option object agli handler esistenti di `GET /`, `POST /`, `POST /import`, `POST /:id/image` e `DELETE /:id` senza cambiare i body già corretti.

`backend/src/routes/lookups.ts`:

```ts
// per i lookup category/subcategory/essence/color/finish/figure -> lookups.read/manage
// per le misure -> measures.read/manage
```

`backend/src/routes/pricelists.ts`:

```ts
fastify.get('/', {
  preHandler: [fastify.checkAnyPermission(['pricelists.sale.read', 'pricelists.purchase.read'])],
}, async (req) => {
  const canSeePurchase = req.auth.permissions.includes('pricelists.purchase.read')
  const where = canSeePurchase ? {} : { type: { not: 'purchase' as const } }

  const data = await fastify.prisma.priceList.findMany({
    where,
    include: priceListInclude,
    orderBy: { name: 'asc' },
  })

  return {
    data,
    pagination: { page: 1, pageSize: data.length, total: data.length, totalPages: 1 },
  }
})

fastify.post('/', {
  preHandler: [fastify.checkAnyPermission(['pricelists.sale.write', 'pricelists.purchase.write'])],
}, async (req, reply) => {
  if (req.body.type === 'purchase' && !req.auth.permissions.includes('pricelists.purchase.write')) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Permesso insufficiente per listini acquisto', statusCode: 403 })
  }
})
```

`backend/src/routes/client.ts`:

```ts
const clientProfileGuard = { preHandler: [fastify.checkPermission('client.profile.read')] }
const clientPasswordGuard = { preHandler: [fastify.checkPermission('client.password.change')] }
const clientFuneralCatalogGuard = { preHandler: [fastify.checkPermission('client.catalog.funeral.read')] }
const clientMarmistaCatalogGuard = { preHandler: [fastify.checkPermission('client.catalog.marmista.read')] }
```

Applica questi option object agli handler esistenti di `/me`, `/change-password`, `/catalog/funeral*` e `/catalog/marmista*` lasciando invariata la logica che legge solo il listino assegnato all'utente corrente.

- [ ] **Step 4: Esegui di nuovo i test e verifica che passino**

Run:

```bash
npm run test -w backend -- src/routes/__tests__/admin.test.ts src/routes/__tests__/articles.test.ts src/routes/__tests__/lookups.test.ts src/routes/__tests__/pricelists.test.ts src/routes/__tests__/client.test.ts
```

Expected: PASS con collaboratore escluso dai listini, dashboard admin protetta e client routes allineate ai permessi.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/admin.ts backend/src/routes/articles/coffins.ts backend/src/routes/articles/accessories.ts backend/src/routes/articles/marmista.ts backend/src/routes/lookups.ts backend/src/routes/pricelists.ts backend/src/routes/client.ts backend/src/routes/__tests__/admin.test.ts backend/src/routes/__tests__/articles.test.ts backend/src/routes/__tests__/lookups.test.ts backend/src/routes/__tests__/pricelists.test.ts backend/src/routes/__tests__/client.test.ts
git commit -m "refactor: migrate admin and client routes to permissions"
```

---

## Task 5: Migra frontend auth, guardie e navigation

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`
- Modify: `frontend/src/components/admin/ProtectedRoute.tsx`
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/admin/__tests__/AuthContext.test.tsx`
- Modify: `frontend/src/components/admin/__tests__/ProtectedRoute.test.tsx`
- Modify: `frontend/src/components/admin/__tests__/AdminSidebar.test.tsx`
- Modify: `frontend/src/pages/__tests__/LoginPage.test.tsx`

- [ ] **Step 1: Scrivi i test frontend in rosso**

Aggiorna i test con questi casi:

```tsx
// AuthContext.test.tsx
const { user, roles, permissions, hasPermission, hasAnyPermission } = useAuth()

expect(screen.getByTestId('permissions').textContent).toBe('users.read.all,pricelists.sale.read')
expect(hasPermission('users.read.all')).toBe(true)
expect(hasAnyPermission(['roles.read', 'pricelists.sale.read'])).toBe(true)

// ProtectedRoute.test.tsx
mockUseAuth.mockReturnValue(makeAuth({
  user,
  permissions: ['users.read.all'],
  hasPermission: () => false,
  hasAnyPermission: (required: string[]) => required.includes('users.read.all'),
}))

// AdminSidebar.test.tsx
expect(screen.queryByText('Ruoli')).toBeNull()           // manager senza roles.read
expect(screen.getByText('Ruoli')).toBeTruthy()           // utente con roles.read
expect(screen.queryByText('Listini')).toBeNull()         // collaboratore senza pricelists.*
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run:

```bash
npm run test -w frontend -- src/components/admin/__tests__/AuthContext.test.tsx src/components/admin/__tests__/ProtectedRoute.test.tsx src/components/admin/__tests__/AdminSidebar.test.tsx src/pages/__tests__/LoginPage.test.tsx
```

Expected: FAIL per proprietà `permissions` mancanti e prop `requiredPermissions` non supportata.

- [ ] **Step 3: Aggiorna `AuthContext`**

`frontend/src/context/AuthContext.tsx`:

```tsx
interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  isActive: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  roles: string[]
  permissions: string[]
  isLoading: boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const [permissions, setPermissions] = useState<string[]>([])

const refresh = async () => {
  try {
    const res = await api.get<{ user: AuthUser; permissions: string[] }>('/auth/me')
    setUser(res.data.user)
    setPermissions(res.data.permissions)
  } catch {
    setUser(null)
    setPermissions([])
  }
}

const hasPermission = (permission: string) => permissions.includes(permission)
const hasAnyPermission = (required: string[]) => required.some((permission) => permissions.includes(permission))

const login = async (email: string, password: string) => {
  const res = await api.post<{ user: AuthUser; permissions: string[] }>('/auth/login', { email, password })
  setUser(res.data.user)
  setPermissions(res.data.permissions)
  return res.data.user
}

const logout = async () => {
  await api.post('/auth/logout')
  setUser(null)
  setPermissions([])
}

<AuthContext.Provider value={{ user, roles: user?.roles ?? [], permissions, isLoading, hasPermission, hasAnyPermission, login, logout, refresh }}>
  {children}
</AuthContext.Provider>
```

- [ ] **Step 4: Aggiorna `ProtectedRoute`, `AdminSidebar` e `App.tsx`**

`frontend/src/components/admin/ProtectedRoute.tsx`:

```tsx
interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: string[]
  match?: 'any' | 'all'
}

export default function ProtectedRoute({ children, requiredPermissions, match = 'any' }: ProtectedRouteProps) {
  const location = useLocation()
  const { user, isLoading, hasAnyPermission, permissions } = useAuth()

  const allowed = !requiredPermissions
    || requiredPermissions.length === 0
    || (match === 'all'
      ? requiredPermissions.every((permission) => permissions.includes(permission))
      : hasAnyPermission(requiredPermissions))

  if (!allowed) {
    const fallback = location.pathname.startsWith('/client') ? '/client/dashboard' : '/admin/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}
```

`frontend/src/components/admin/AdminSidebar.tsx`:

```tsx
const { hasAnyPermission } = useAuth()

interface NavLeaf {
  to: string
  label: string
  permissions: string[] | null
}

function canSee(required: string[] | null) {
  return required === null || hasAnyPermission(required)
}

{ kind: 'leaf', to: '/admin/roles', label: 'Ruoli', permissions: ['roles.read'] }
{ kind: 'leaf', to: '/admin/pricelists', label: 'Listini', permissions: ['pricelists.sale.read', 'pricelists.purchase.read'] }
{ kind: 'leaf', to: '/client/dashboard', label: 'Dashboard', permissions: ['dashboard.client.read'] }
```

`frontend/src/App.tsx`:

```tsx
<ProtectedRoute match="any" requiredPermissions={['dashboard.admin.read', 'users.read.team', 'users.read.all', 'roles.read', 'articles.coffins.read', 'articles.accessories.read', 'articles.marmista.read', 'lookups.read', 'measures.read', 'pricelists.sale.read', 'pricelists.purchase.read', 'catalog.pdf.read']}>
  <AdminLayout />
</ProtectedRoute>

<ProtectedRoute match="any" requiredPermissions={['dashboard.client.read', 'client.profile.read', 'client.catalog.funeral.read', 'client.catalog.marmista.read', 'client.password.change']}>
  <AdminLayout variant="client" />
</ProtectedRoute>

<ProtectedRoute requiredPermissions={['roles.read']}><RolesPage /></ProtectedRoute>
<ProtectedRoute requiredPermissions={['client.catalog.funeral.read']}><FuneralCatalogPage /></ProtectedRoute>
```

- [ ] **Step 5: Esegui di nuovo i test frontend**

Run:

```bash
npm run test -w frontend -- src/components/admin/__tests__/AuthContext.test.tsx src/components/admin/__tests__/ProtectedRoute.test.tsx src/components/admin/__tests__/AdminSidebar.test.tsx src/pages/__tests__/LoginPage.test.tsx
```

Expected: PASS con `permissions[]` caricati, guard `any/all` funzionanti e sidebar permission-based.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/context/AuthContext.tsx frontend/src/components/admin/ProtectedRoute.tsx frontend/src/components/admin/AdminSidebar.tsx frontend/src/App.tsx frontend/src/components/admin/__tests__/AuthContext.test.tsx frontend/src/components/admin/__tests__/ProtectedRoute.test.tsx frontend/src/components/admin/__tests__/AdminSidebar.test.tsx frontend/src/pages/__tests__/LoginPage.test.tsx
git commit -m "refactor: migrate frontend auth guards to permissions"
```

---

## Task 6: Documenta il modello finale e verifica tutto il perimetro

**Files:**
- Create: `docs/authorization-runtime.md`

- [ ] **Step 1: Scrivi la documentazione tecnica runtime**

Crea `docs/authorization-runtime.md` con queste sezioni:

```md
# Authorization Runtime Model

## Catalogo permessi
- elenco dei permission code di sistema

## Matrice ruolo -> permessi
- tabella per `super_admin`, `manager`, `collaboratore`, `impresario_funebre`, `marmista`

## Grant diretti utente
- descrizione di `UserPermission`
- nota: i grant sono additivi e diventano effettivi alla request successiva

## Route map
- `/api/auth/me` -> payload con `roles[]` e `permissions[]`
- `/api/users` -> `users.read.team` o `users.read.all`
- `/api/roles` -> `roles.read/manage`
- `/api/admin/pricelists` -> `pricelists.sale.*` / `pricelists.purchase.*`
- `/api/client/*` -> `client.*`

## Scope rules
- super admin separato da `users.read.all` e `users.update.all`
- listini purchase separati dai sale
- cataloghi client limitati al listino assegnato
```

- [ ] **Step 2: Esegui tutta la verifica backend e frontend**

Run:

```bash
npm run test -w backend -- src/lib/authorization/__tests__/get-effective-permissions.test.ts src/lib/authorization/__tests__/checks.test.ts src/routes/__tests__/auth.test.ts src/routes/__tests__/users.test.ts src/routes/__tests__/roles.test.ts src/routes/__tests__/admin.test.ts src/routes/__tests__/articles.test.ts src/routes/__tests__/lookups.test.ts src/routes/__tests__/pricelists.test.ts src/routes/__tests__/client.test.ts
npm run test -w frontend -- src/components/admin/__tests__/AuthContext.test.tsx src/components/admin/__tests__/ProtectedRoute.test.tsx src/components/admin/__tests__/AdminSidebar.test.tsx src/pages/__tests__/LoginPage.test.tsx
npm run build -w backend
npm run build -w frontend
```

Expected: test backend verdi, test frontend verdi, build backend e frontend con exit code `0`.

- [ ] **Step 3: Commit finale del piano**

```bash
git add docs/authorization-runtime.md
git commit -m "docs: add authorization runtime reference"
```

---

## Coverage check

- Schema Prisma: coperto da Task 2.
- Seed catalogo e matrice ruolo -> permessi: coperto da Task 2.
- Effective permissions runtime: coperto da Task 1 e Task 3.
- `/api/auth/me` con `permissions[]`: coperto da Task 2.
- Route backend sensibili: coperte da Task 3 e Task 4.
- Sidebar e guard frontend permission-based: coperte da Task 5.
- Documentazione tecnica completa: coperta da Task 6.

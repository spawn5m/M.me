# Permission-Only Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare i ruoli di sistema e far lavorare ogni route/pagina esclusivamente sui permessi individuali.

**Architecture:** Il campo `Role.isSystem` viene rimosso dallo schema. I permessi `users.is_super_admin` e `user.isManager` vengono aggiunti come dichiarativi. Tutte le route backend già usano `checkPermission`; le modifiche principali riguardano `users.ts`, `public.ts`, `pricelists.ts` e il frontend `UsersPage`.

**Tech Stack:** TypeScript strict, Fastify v5, Prisma v7, React 19 + Vite, Vitest, Zod

---

## File map

| File | Azione |
|------|--------|
| `backend/src/lib/authorization/permissions.ts` | Modifica — aggiungi `users.is_super_admin`, `user.isManager`; rimuovi `users.super_admin.manage` |
| `backend/src/lib/authorization/role-defaults.ts` | Elimina |
| `backend/src/lib/authorization/get-effective-permissions.ts` | Modifica — rimuovi `roles` dal return |
| `backend/src/plugins/auth.ts` | Modifica — rimuovi `roles` da context, rimuovi `checkRole` |
| `backend/src/types/shared.ts` | Modifica — `AuthUser` senza `roles`; `AdminUser` con `permissions`; `AdminRole` senza `isSystem` |
| `backend/src/routes/auth.ts` | Modifica — rimuovi `roles` da login/me response |
| `backend/src/routes/users.ts` | Modifica — `USER_INCLUDE`, `isSuperAdminUser`, `userToResponse`, filtri, self-check, unicità |
| `backend/src/routes/roles.ts` | Modifica — rimuovi guard `isSystem` |
| `backend/src/routes/public.ts` | Modifica — `loadSessionPermissions` via `getEffectivePermissions` |
| `backend/src/routes/pricelists.ts` | Modifica — tipo utente via `userPermissions` |
| `backend/src/test-helper.ts` | Modifica — `seedTestUser` senza `isSystem`; aggiungi `grantUserPermissions` |
| `backend/src/routes/__tests__/users.test.ts` | Modifica — sostituisci setup super_admin con permessi diretti |
| `backend/prisma/schema.prisma` | Modifica — rimuovi `Role.isSystem` |
| `backend/prisma/seed.ts` | Modifica — rimuovi system roles, aggiorna permessi |
| `frontend/src/context/AuthContext.tsx` | Modifica — rimuovi `roles` |
| `frontend/src/pages/admin/UsersPage.tsx` | Modifica — rimuovi `userHasRole`, usa `user.permissions` |
| `frontend/src/pages/admin/RolesPage.tsx` | Modifica — rimuovi UI `isSystem` |

---

### Task 1: Aggiorna catalogo permessi

**Files:**
- Modify: `backend/src/lib/authorization/permissions.ts`

- [ ] **Step 1: Aggiorna `SYSTEM_PERMISSION_CODES`**

In `backend/src/lib/authorization/permissions.ts`, sostituisci `'users.super_admin.manage'` con `'users.is_super_admin'` e aggiungi `'user.isManager'`:

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
  'users.is_super_admin',   // ← sostituisce users.super_admin.manage
  'user.isManager',          // ← nuovo
  'roles.read',
  'roles.manage',
  // ... resto invariato
] as const
```

- [ ] **Step 2: Aggiorna `SYSTEM_PERMISSIONS` array**

Rimuovi la entry `users.super_admin.manage` e aggiungi le due nuove:

```ts
// RIMUOVI questa riga dall'array:
{ code: 'users.super_admin.manage', resource: 'users', action: 'manage', scope: 'super_admin', label: 'Gestisci Super Admin', description: 'Gestire utenti super admin.', isSystem: true },

// AGGIUNGI queste due:
{ code: 'users.is_super_admin', resource: 'users', action: 'is_super_admin', label: 'È Super Admin', description: 'Marca l\'utente come super admin — un solo utente alla volta.', isSystem: true },
{ code: 'user.isManager', resource: 'user', action: 'isManager', label: 'È un Manager', description: 'Indica che questo utente può essere assegnato come manager di altri utenti.', isSystem: true },
```

- [ ] **Step 3: Verifica TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Expected: nessun errore (solo warning se `users.super_admin.manage` è ancora usato altrove — normale, si risolve nei task successivi).

- [ ] **Step 4: Commit**

```bash
git add backend/src/lib/authorization/permissions.ts
git commit -m "feat(auth): aggiungi users.is_super_admin e user.isManager, rimuovi users.super_admin.manage"
```

---

### Task 2: Rimuovi `roles` da `getEffectivePermissions`

**Files:**
- Modify: `backend/src/lib/authorization/get-effective-permissions.ts`

- [ ] **Step 1: Scrivi test che verifica il nuovo return type**

Apri `backend/src/routes/__tests__/auth.test.ts` e cerca i test su login/me. Aggiungi:

```ts
it('login non restituisce campo roles', async () => {
  await seedTestUser(app, { email: 'norolles@test.com', password: 'pass1234' })
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'norolles@test.com', password: 'pass1234' }
  })
  expect(res.statusCode).toBe(200)
  const body = JSON.parse(res.body)
  expect(body.user).not.toHaveProperty('roles')
  expect(body).toHaveProperty('permissions')
})
```

- [ ] **Step 2: Esegui test e verifica FAIL**

```bash
cd backend && npm test -- --reporter=verbose 2>&1 | grep -A 5 "non restituisce campo roles"
```

Expected: FAIL — il body ha ancora `roles`.

- [ ] **Step 3: Aggiorna `getEffectivePermissions` — rimuovi `roles`**

Sostituisci l'intero contenuto della funzione:

```ts
export async function getEffectivePermissions(dataSource: EffectivePermissionsDataSource, userId: string) {
  const user = await dataSource.user.findUnique({
    where: { id: userId },
    select: EFFECTIVE_PERMISSIONS_USER_SELECT,
  })

  if (!user) {
    return { permissions: [] }
  }

  const permissions = Array.from(
    new Set([
      ...user.userRoles.flatMap((entry) => entry.role.rolePermissions.map((permission) => permission.permission.code)),
      ...user.userPermissions.map((entry) => entry.permission.code),
    ]),
  ).sort()

  return { permissions }
}
```

Rimuovi anche `roles` dall'interfaccia `EFFECTIVE_PERMISSIONS_USER_SELECT` — la query `userRoles.role.name` non serve più, lascia solo `rolePermissions`:

```ts
export const EFFECTIVE_PERMISSIONS_USER_SELECT = {
  userRoles: {
    select: {
      role: {
        select: {
          rolePermissions: {
            select: {
              permission: {
                select: { code: true },
              },
            },
          },
        },
      },
    },
  },
  userPermissions: {
    select: {
      permission: {
        select: { code: true },
      },
    },
  },
} as const
```

Aggiorna anche le interfacce interne rimuovendo `name: true` da `AuthorizationUserRoleRecord`.

- [ ] **Step 4: Adatta `auth.ts` plugin (fix immediato per evitare errori di tipo)**

In `backend/src/plugins/auth.ts`, ovunque si destruttura `{ roles, permissions }` da `getEffectivePermissions`, cambia in `{ permissions }` e rimuovi ogni riferimento a `roles`:

```ts
// PRIMA
const { roles, permissions } = await getEffectivePermissions(fastify.prisma, user.id)
request.auth = { userId: user.id, roles, permissions }

// DOPO
const { permissions } = await getEffectivePermissions(fastify.prisma, user.id)
request.auth = { userId: user.id, permissions }
```

- [ ] **Step 5: Esegui test**

```bash
cd backend && npm test 2>&1 | tail -5
```

Expected: il test nuovo passa, suite esistenti passano o falliscono solo per i test che referenziano `roles` (verranno aggiornati nei task successivi).

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/authorization/get-effective-permissions.ts backend/src/plugins/auth.ts
git commit -m "refactor(auth): rimuovi roles da getEffectivePermissions e AuthorizationContext"
```

---

### Task 3: Aggiorna auth plugin — rimuovi `checkRole` e `roles`

**Files:**
- Modify: `backend/src/plugins/auth.ts`

- [ ] **Step 1: Rimuovi `AuthorizationContext.roles`**

In `backend/src/plugins/auth.ts`, aggiorna l'interfaccia:

```ts
interface AuthorizationContext {
  userId: string
  permissions: string[]
}
```

- [ ] **Step 2: Rimuovi decorator `checkRole`**

Elimina completamente il blocco:

```ts
fastify.decorate(
  'checkRole',
  (allowedRoles: string[]) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      // ...
    }
)
```

- [ ] **Step 3: Rimuovi dichiarazioni TypeScript di `checkRole` e `roles`**

Nel blocco `declare module 'fastify'`, rimuovi:

```ts
// RIMUOVI
checkRole: (allowedRoles: string[]) => AuthPreHandler
```

Nel blocco `declare module '@fastify/secure-session'`, nessuna modifica.

- [ ] **Step 4: Verifica TypeScript**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -30
```

Expected: nessun errore su `auth.ts`. Possibili errori su altri file che usavano `roles` — verranno fixati nei task successivi.

- [ ] **Step 5: Commit**

```bash
git add backend/src/plugins/auth.ts
git commit -m "refactor(auth): rimuovi checkRole e roles da AuthorizationContext"
```

---

### Task 4: Aggiorna `shared.ts` — tipi utente

**Files:**
- Modify: `backend/src/types/shared.ts`

- [ ] **Step 1: Aggiorna `AuthUser` — rimuovi `roles`**

```ts
export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
}
```

- [ ] **Step 2: Aggiorna `AdminRole` — rimuovi `isSystem`**

```ts
export interface AdminRole {
  id: string
  name: string
  label: string
}
```

- [ ] **Step 3: Aggiorna `AdminUser` — aggiungi `permissions`**

```ts
export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  roles: AdminRole[]
  permissions: string[]   // ← nuovo: permessi effettivi (ruoli + diretti)
  manager: string | null
  funeralPriceList: AdminAssignedPriceList | null
  marmistaPriceList: AdminAssignedPriceList | null
  accessoriesPriceList: AdminAssignedPriceList | null
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 4: Verifica TypeScript**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/types/shared.ts
git commit -m "refactor(types): AuthUser senza roles, AdminUser con permissions, AdminRole senza isSystem"
```

---

### Task 5: Aggiorna `auth.ts` route — rimuovi `roles` da response

**Files:**
- Modify: `backend/src/routes/auth.ts`

- [ ] **Step 1: Aggiorna login response**

In `POST /login`, sostituisci il return con:

```ts
const { permissions } = await getEffectivePermissions(fastify.prisma, user.id)
request.session.set('userId', user.id)

return reply.send({
  user: {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive
  },
  permissions
})
```

- [ ] **Step 2: Aggiorna `GET /me` response**

Stessa struttura — rimuovi `roles` dall'oggetto `user`:

```ts
const { permissions } = await getEffectivePermissions(fastify.prisma, user.id)

return reply.send({
  user: {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    funeralPriceList: user.funeralPriceList ?? null,
    marmistaPriceList: user.marmistaPriceList ?? null,
  },
  permissions
})
```

- [ ] **Step 3: Esegui test auth**

```bash
cd backend && npm test -- backend/src/routes/__tests__/auth.test.ts 2>&1 | tail -10
```

Expected: PASS (incluso il test aggiunto nel Task 2).

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/auth.ts
git commit -m "refactor(auth): rimuovi roles da response login e me"
```

---

### Task 6: Aggiorna `users.ts` — refactor completo

**Files:**
- Modify: `backend/src/routes/users.ts`

- [ ] **Step 1: Espandi `USER_INCLUDE` con `userPermissions` e `rolePermissions`**

```ts
const USER_INCLUDE = {
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: { select: { code: true } } }
          }
        }
      }
    }
  },
  userPermissions: {
    include: { permission: { select: { code: true } } }
  },
  managers: true,
  funeralPriceList: { select: PRICE_LIST_SUMMARY_SELECT },
  marmistaPriceList: { select: PRICE_LIST_SUMMARY_SELECT },
  accessoriesPriceList: { select: PRICE_LIST_SUMMARY_SELECT },
} as const
```

- [ ] **Step 2: Aggiorna tipi interni**

Sostituisci `UserWithRoles` e `UserRecord`:

```ts
type UserWithPermissions = User & {
  userRoles: (UserRole & {
    role: Role & {
      rolePermissions: { permission: { code: string } }[]
    }
  })[]
  userPermissions: { permission: { code: string } }[]
  managers: { managerId: string }[]
  funeralPriceList?: PriceListSummary | null
  marmistaPriceList?: PriceListSummary | null
  accessoriesPriceList?: PriceListSummary | null
}

type UserRecord = UserWithPermissions
```

Aggiorna tutte le occorrenze di `UserWithRoles` → `UserWithPermissions` nel file.

- [ ] **Step 3: Aggiorna `userToResponse` — aggiungi `permissions`**

```ts
function userToResponse(user: UserWithPermissions) {
  const { password: _pw, userRoles, userPermissions, managers, funeralPriceList, marmistaPriceList, accessoriesPriceList, ...rest } = user
  const fromRoles = userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.code))
  const direct = userPermissions.map((up) => up.permission.code)
  return {
    ...rest,
    roles: userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name, label: ur.role.label })),
    permissions: Array.from(new Set([...fromRoles, ...direct])).sort(),
    manager: managers[0]?.managerId ?? null,
    funeralPriceList: funeralPriceList ?? null,
    marmistaPriceList: marmistaPriceList ?? null,
    accessoriesPriceList: accessoriesPriceList ?? null,
  }
}
```

- [ ] **Step 4: Aggiorna `isSuperAdminUser` — usa `userPermissions`**

```ts
function isSuperAdminUser(user: UserWithPermissions) {
  return user.userPermissions.some((up) => up.permission.code === 'users.is_super_admin')
}
```

- [ ] **Step 5: Rimuovi `canManageSuperAdmins` e aggiorna `ensureCanAccessUser`**

Rimuovi la funzione `canManageSuperAdmins`. Aggiorna `ensureCanAccessUser`:

```ts
function ensureCanAccessUser(
  reply: { status: (code: number) => { send: (payload: unknown) => unknown } },
  user: UserRecord,
  auth: { userId: string; permissions: string[] },
  options: {
    allowAllPermission: boolean
    superAdminCheck: 'read' | 'write'
  }
) {
  if (!options.allowAllPermission && !isManagedBy(user, auth.userId)) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Permessi insufficienti per questa operazione',
      statusCode: 403
    })
  }

  if (isSuperAdminUser(user)) {
    if (options.superAdminCheck === 'read') {
      if (!hasPermission(auth.permissions, 'users.super_admin.read')) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Permessi insufficienti per questa operazione',
          statusCode: 403
        })
      }
    } else {
      if (auth.userId !== user.id) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Solo il super admin può modificare se stesso',
          statusCode: 403
        })
      }
    }
  }

  return null
}
```

- [ ] **Step 6: Aggiorna filtri lista — `userRoles` → `userPermissions`**

In `GET /` e `GET /me/subordinates`, cambia il filtro super admin:

```ts
// PRIMA
where.userRoles = { none: { role: { name: 'super_admin' } } }

// DOPO
where.userPermissions = { none: { permission: { code: 'users.is_super_admin' } } }
```

- [ ] **Step 7: Aggiorna tutti i chiamanti di `ensureCanAccessUser`**

In `GET /:id/permissions`:
```ts
const accessError = ensureCanAccessUser(reply, user as UserRecord, req.auth, {
  allowAllPermission: canReadAllUsers(req.auth.permissions),
  superAdminCheck: 'read',
})
```

In `PUT /:id/permissions`:
```ts
const accessError = ensureCanAccessUser(reply, user as UserRecord, req.auth, {
  allowAllPermission: canUpdateAllUsers(req.auth.permissions),
  superAdminCheck: 'write',
})
```

In `GET /:id`:
```ts
const accessError = ensureCanAccessUser(reply, user as UserRecord, req.auth, {
  allowAllPermission: canReadAllUsers(req.auth.permissions),
  superAdminCheck: 'read',
})
```

In `PUT /:id`:
```ts
const accessError = ensureCanAccessUser(reply, existing as UserRecord, req.auth, {
  allowAllPermission: canUpdateAllUsers(req.auth.permissions),
  superAdminCheck: 'write',
})
```

In `DELETE /:id`:
```ts
if (isSuperAdminUser(existing as UserRecord) && req.auth.userId !== existing.id) {
  return reply.status(403).send({
    error: 'Forbidden',
    message: 'Solo il super admin può disattivare se stesso',
    statusCode: 403
  })
}
```

- [ ] **Step 8: Rimuovi `isAssigningSuperAdmin` da POST e PUT**

In `POST /` e `PUT /:id`, rimuovi i blocchi:

```ts
// RIMUOVI
const isAssigningSuperAdmin = assignedRoles.some((role) => role.name === 'super_admin')
if (isAssigningSuperAdmin && !canManageSuperAdmins(req.auth.permissions)) {
  return reply.status(403).send(...)
}
```

- [ ] **Step 9: Aggiungi unicità `users.is_super_admin` in `PUT /:id/permissions`**

Prima della chiamata a `replaceUserDirectPermissions`, aggiungi:

```ts
if (parsed.data.permissionCodes.includes('users.is_super_admin')) {
  const existingSuperAdmin = await fastify.prisma.userPermission.findFirst({
    where: {
      permission: { code: 'users.is_super_admin' },
      userId: { not: id }
    },
    include: { permission: true }
  })
  if (existingSuperAdmin) {
    return reply.status(409).send({
      error: 'Conflict',
      message: 'Esiste già un utente con il permesso users.is_super_admin',
      statusCode: 409
    })
  }
}
```

- [ ] **Step 10: Verifica TypeScript**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -30
```

Expected: nessun errore in `users.ts`.

- [ ] **Step 11: Commit**

```bash
git add backend/src/routes/users.ts
git commit -m "refactor(users): isSuperAdminUser via permesso, self-check, unicità users.is_super_admin, permissions in response"
```

---

### Task 7: Aggiorna `roles.ts` — rimuovi guard `isSystem`

**Files:**
- Modify: `backend/src/routes/roles.ts`

- [ ] **Step 1: Scrivi test**

In `backend/src/routes/__tests__/roles.test.ts`, aggiungi un test che verifica che un ruolo (precedentemente "di sistema") sia ora eliminabile. Trovi il test simile esistente che controlla il 403; aggiungine uno speculare che ritorna 204:

```ts
it('permette di eliminare qualsiasi ruolo esistente', async () => {
  const role = await app.prisma.role.create({ data: { name: 'test_deletable', label: 'Test' } })
  const res = await app.inject({
    method: 'DELETE',
    url: `/api/roles/${role.id}`,
    headers: { cookie: adminCookie }
  })
  expect(res.statusCode).toBe(204)
})
```

- [ ] **Step 2: Rimuovi guard `isSystem` da DELETE**

In `DELETE /:id` (riga ~166), rimuovi:

```ts
// RIMUOVI
if (role.isSystem) {
  return reply.status(403).send({
    error: 'Forbidden',
    message: 'I ruoli di sistema non possono essere eliminati',
    statusCode: 403
  })
}
```

- [ ] **Step 3: Rimuovi guard `isSystem` da PUT permissions**

In `PUT /:id/permissions` (riga ~211), rimuovi l'equivalente blocco di protezione.

- [ ] **Step 4: Rimuovi `isSystem` dalla create in seed del role (riga ~75)**

In `POST /` (creazione ruolo), il `data` usa `isSystem: false` — rimuovilo:

```ts
data: { name, label }  // senza isSystem: false
```

- [ ] **Step 5: Esegui test**

```bash
cd backend && npm test -- backend/src/routes/__tests__/roles.test.ts 2>&1 | tail -10
```

Expected: tutti PASS incluso il nuovo.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/roles.ts
git commit -m "refactor(roles): rimuovi guard isSystem, tutti i ruoli sono modificabili"
```

---

### Task 8: Aggiorna `public.ts` — `loadSessionPermissions`

**Files:**
- Modify: `backend/src/routes/public.ts`

- [ ] **Step 1: Sostituisci `loadSessionRoles` con `loadSessionPermissions`**

Aggiungi import:

```ts
import { getEffectivePermissions, EFFECTIVE_PERMISSIONS_USER_SELECT } from '../lib/authorization/get-effective-permissions'
```

Rimuovi la funzione `loadSessionRoles` e la sua interfaccia `PublicRolePrisma`. Aggiungi:

```ts
async function loadSessionPermissions(prisma: EffectivePermissionsDataSource, userId: string): Promise<string[]> {
  const { permissions } = await getEffectivePermissions(prisma, userId)
  return permissions
}
```

`EffectivePermissionsDataSource` è già esportata da `get-effective-permissions.ts` — importala.

- [ ] **Step 2: Aggiorna tutti i punti che caricano le sessioni**

Nei tre punti dove compare `loadSessionRoles(fastify.prisma as unknown as PublicRolePrisma, userId)`, sostituisci con:

```ts
const permissions = userId
  ? await loadSessionPermissions(fastify.prisma as unknown as EffectivePermissionsDataSource, userId)
  : []
```

- [ ] **Step 3: Aggiorna `canSeeAdminFuneralPrices` e i controlli tipo**

Rimuovi `canSeeAdminFuneralPrices`. Sostituisci ogni occorrenza del branching:

```ts
// PRIMA
if (canSeeAdminFuneralPrices(roles)) { ... }
else if (roles.includes('impresario_funebre') && userId) { ... }

// DOPO
if (permissions.includes('pricelists.sale.preview')) { ... }
else if (permissions.includes('client.catalog.funeral.read') && userId) { ... }
```

Per i check sulle marmista:

```ts
// PRIMA
roles.includes('marmista')

// DOPO
permissions.includes('client.catalog.marmista.read')
```

Per il check `roles.includes('impresario_funebre')` nei mapping delle response:

```ts
// PRIMA
...(roles.includes('impresario_funebre') ? { price: ... } : {})

// DOPO
...(permissions.includes('client.catalog.funeral.read') ? { price: ... } : {})
```

- [ ] **Step 4: Verifica TypeScript**

```bash
cd backend && npx tsc --noEmit 2>&1 | grep "public.ts" | head -10
```

Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/public.ts
git commit -m "refactor(public): loadSessionPermissions sostituisce loadSessionRoles"
```

---

### Task 9: Aggiorna `pricelists.ts` — tipo utente via permessi

**Files:**
- Modify: `backend/src/routes/pricelists.ts`

- [ ] **Step 1: Aggiorna la query e il branching in `PUT /:id/assign/:userId`**

Alla riga ~390, la query include `userRoles`. Sostituisci con `userPermissions`:

```ts
const user = await fastify.prisma.user.findUnique({
  where: { id: req.params.userId },
  include: { userPermissions: { include: { permission: { select: { code: true } } } } },
})
if (!user) return reply.status(404).send({ error: 'NotFound', message: 'Utente non trovato', statusCode: 404 })

const userPermCodes = user.userPermissions.map((up) => up.permission.code)
const isMarmista = userPermCodes.includes('client.catalog.marmista.read')
const isFuneralClient = userPermCodes.includes('client.catalog.funeral.read')
```

La logica di validazione sottostante resta identica.

- [ ] **Step 2: Verifica TypeScript**

```bash
cd backend && npx tsc --noEmit 2>&1 | grep "pricelists.ts" | head -5
```

Expected: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/pricelists.ts
git commit -m "refactor(pricelists): tipo utente da userPermissions invece di userRoles"
```

---

### Task 10: Aggiorna `test-helper.ts`

**Files:**
- Modify: `backend/src/test-helper.ts`

- [ ] **Step 1: Rimuovi `isSystem` da creazione ruolo in `seedTestUser`**

Alla riga ~113:

```ts
role = await app.prisma.role.create({
  data: { name: roleName, label: roleName }  // senza isSystem: true
})
```

- [ ] **Step 2: Aggiungi `grantUserPermissions` helper**

Dopo la funzione `cleanupTestDb`, aggiungi:

```ts
export async function grantUserPermissions(
  app: FastifyInstance,
  userId: string,
  permissionCodes: PermissionCode[]
): Promise<void> {
  for (const code of permissionCodes) {
    const definition = SYSTEM_PERMISSIONS.find((p) => p.code === code)
    if (!definition) throw new Error(`Permission ${code} non trovata in SYSTEM_PERMISSIONS`)

    const permission = await app.prisma.permission.upsert({
      where: { code },
      update: definition,
      create: definition,
    })

    await app.prisma.userPermission.upsert({
      where: { userId_permissionId: { userId, permissionId: permission.id } },
      update: {},
      create: { userId, permissionId: permission.id },
    })
  }
}
```

Aggiungi `import { SYSTEM_PERMISSIONS, type PermissionCode } from './lib/authorization/permissions'` in testa al file.

- [ ] **Step 3: Verifica TypeScript**

```bash
cd backend && npx tsc --noEmit 2>&1 | grep "test-helper.ts" | head -5
```

Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add backend/src/test-helper.ts
git commit -m "refactor(test-helper): rimuovi isSystem da seedTestUser, aggiungi grantUserPermissions"
```

---

### Task 11: Aggiorna `users.test.ts` — sostituisci setup super_admin

**Files:**
- Modify: `backend/src/routes/__tests__/users.test.ts`

- [ ] **Step 1: Aggiorna import**

Aggiungi `grantUserPermissions` agli import da `test-helper`:

```ts
import { buildTestApp, seedTestUser, getAuthCookie, cleanupTestDb, grantUserPermissions } from '../../test-helper'
```

- [ ] **Step 2: Aggiorna `beforeEach` — rimuovi system roles**

Sostituisci il setup corrente con:

```ts
beforeEach(async () => {
  // pulizia invariata...
  await cleanupTestDb(app)

  // Super admin: utente con users.is_super_admin diretto
  const superAdminUser = await seedTestUser(app, {
    email: 'superadmin@test.com',
    password: 'password123',
  })
  await grantUserPermissions(app, superAdminUser.id, [
    'users.read.team',
    'users.read.all',
    'users.create',
    'users.update.team',
    'users.update.all',
    'users.disable',
    'users.super_admin.read',
    'users.is_super_admin',
  ])

  // Manager: ruolo custom con permessi
  const managerUser = await seedTestUser(app, {
    email: 'manager@test.com',
    password: 'password123',
    roles: ['manager_custom'],
  })
  await grantRolePermissions(app, 'manager_custom', [
    'users.read.team',
    'users.read.all',
    'users.create',
    'users.update.team',
    'users.update.all',
    'users.disable',
  ])

  // Collaboratore: ruolo custom con permessi ridotti
  const collaboratoreUser = await seedTestUser(app, {
    email: 'collaboratore@test.com',
    password: 'password123',
    roles: ['collaboratore_custom'],
  })
  await grantRolePermissions(app, 'collaboratore_custom', [
    'users.read.team',
    'users.update.team',
  ])

  superAdminCookie = await getAuthCookie(app, 'superadmin@test.com', 'password123')
  managerCookie = await getAuthCookie(app, 'manager@test.com', 'password123')
  collaboratoreCookie = await getAuthCookie(app, 'collaboratore@test.com', 'password123')
})
```

- [ ] **Step 3: Aggiorna asserzioni che controllano `user.roles` per `super_admin`**

Cerca ogni occorrenza di:
```ts
user.roles.some((role) => role.name === 'super_admin')
```

Sostituisci con:
```ts
user.permissions.includes('users.is_super_admin')
```

- [ ] **Step 4: Esegui test**

```bash
cd backend && npm test -- backend/src/routes/__tests__/users.test.ts 2>&1 | tail -15
```

Expected: tutti i test PASS.

- [ ] **Step 5: Esegui intera suite**

```bash
cd backend && npm test 2>&1 | tail -10
```

Expected: suite completa PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/__tests__/users.test.ts
git commit -m "test(users): sostituisci setup super_admin con permessi diretti"
```

---

### Task 12: Prisma migration — rimuovi `Role.isSystem`

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Rimuovi `isSystem` dal modello `Role` in schema.prisma**

```prisma
model Role {
  id              String           @id @default(cuid())
  name            String           @unique
  label           String
  userRoles       UserRole[]
  rolePermissions RolePermission[]
}
```

(Campo `isSystem Boolean @default(false)` rimosso completamente)

- [ ] **Step 2: Genera la migration**

```bash
cd backend && npx prisma migrate dev --name drop_role_is_system
```

Expected: migration creata in `prisma/migrations/`, client rigenerato. Prisma chiede conferma — rispondere `y`.

- [ ] **Step 3: Verifica TypeScript con il nuovo client**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -20
```

Expected: nessun errore. Se compaiono errori su `isSystem` in `roles.ts` seed.ts o altrove, fixali subito.

- [ ] **Step 4: Esegui test**

```bash
cd backend && npm test 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "chore(db): migration drop Role.isSystem"
```

---

### Task 13: Aggiorna `seed.ts` — rimuovi system roles

**Files:**
- Modify: `backend/prisma/seed.ts`
- Delete: `backend/src/lib/authorization/role-defaults.ts`

- [ ] **Step 1: Rimuovi `SYSTEM_ROLES` array e il loop di creazione ruoli**

Elimina:

```ts
// RIMUOVI tutto questo blocco
const SYSTEM_ROLES = [...]

// Ruoli di sistema
console.log('→ Creazione ruoli di sistema...')
for (const role of SYSTEM_ROLES) {
  await prisma.role.upsert({ ... })
}
```

- [ ] **Step 2: Rimuovi import `SYSTEM_ROLE_DEFAULTS` e il loop di sincronizzazione permessi ruolo**

Elimina:

```ts
import { SYSTEM_ROLE_DEFAULTS } from '../src/lib/authorization/role-defaults'
```

Ed elimina il blocco:

```ts
console.log('→ Sincronizzazione permessi di default per ruolo...')
for (const role of SYSTEM_ROLES) { ... }
```

- [ ] **Step 3: Elimina `role-defaults.ts`**

```bash
rm backend/src/lib/authorization/role-defaults.ts
```

- [ ] **Step 4: Verifica TypeScript**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -10
```

Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add -A backend/prisma/seed.ts backend/src/lib/authorization/role-defaults.ts
git commit -m "chore(seed): rimuovi system roles e role-defaults.ts"
```

---

### Task 14: Frontend — rimuovi `roles` da `AuthContext`

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`

- [ ] **Step 1: Aggiorna `AuthUser` interface**

```ts
interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
}
```

- [ ] **Step 2: Rimuovi `roles` dall'interfaccia `AuthContextValue`**

```ts
interface AuthContextValue {
  user: AuthUser | null
  permissions: string[]
  isLoading: boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  login: (email: string, password: string) => Promise<AuthResponse>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}
```

- [ ] **Step 3: Rimuovi esposizione `roles` nel `value` del Provider**

```ts
<AuthContext.Provider
  value={{
    user,
    permissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    login,
    logout,
    refresh,
  }}
>
```

- [ ] **Step 4: Verifica TypeScript frontend**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: eventuali errori su consumer di `roles` — fixali rimuovendo i riferimenti (es. `useAuth().roles` → eliminare o sostituire con `useAuth().permissions`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/AuthContext.tsx
git commit -m "refactor(auth-context): rimuovi roles da AuthContext"
```

---

### Task 15: Frontend `UsersPage` — sostituisci `userHasRole`

**Files:**
- Modify: `frontend/src/pages/admin/UsersPage.tsx`

- [ ] **Step 1: Rimuovi helper `userHasRole`**

Elimina la funzione:

```ts
// RIMUOVI
const userHasRole = (user: AdminUser, roleName: string) =>
  user.roles.some(r => r.name === roleName)
```

- [ ] **Step 2: Aggiorna azione "Listino" — `hidden`**

Riga ~412:

```ts
// PRIMA
hidden: (u) => {
  const user = u as AdminUser
  return userHasRole(user, 'super_admin') || userHasRole(user, 'manager')
}

// DOPO
hidden: (u) => {
  const user = u as AdminUser
  return user.permissions.includes('user.isManager') || user.permissions.includes('users.is_super_admin')
}
```

- [ ] **Step 3: Aggiorna modal assegnazione listino — select cofani**

Riga ~618:

```ts
// PRIMA
{userHasRole(assignTarget, 'impresario_funebre') && (

// DOPO
{assignTarget.permissions.includes('client.catalog.funeral.read') && (
```

- [ ] **Step 4: Aggiorna modal assegnazione listino — select marmista**

Riga ~630:

```ts
// PRIMA
{(userHasRole(assignTarget, 'marmista') || userHasRole(assignTarget, 'impresario_funebre')) && (

// DOPO
{(assignTarget.permissions.includes('client.catalog.marmista.read') || assignTarget.permissions.includes('client.catalog.funeral.read')) && (
```

- [ ] **Step 5: Verifica TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "UsersPage" | head -10
```

Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/UsersPage.tsx
git commit -m "refactor(users-page): sostituisci userHasRole con user.permissions"
```

---

### Task 16: Frontend `RolesPage` — rimuovi UI `isSystem`

**Files:**
- Modify: `frontend/src/pages/admin/RolesPage.tsx`

- [ ] **Step 1: Rimuovi colonna "Tipo" dalla tabella**

Elimina l'elemento colonna:

```ts
// RIMUOVI
{
  key: 'isSystem',
  header: 'Tipo',
  render: (r: AdminRole) => (
    <span className={['admin-badge', r.isSystem ? 'admin-badge-dark' : 'admin-badge-gold'].join(' ')}>
      {r.isSystem ? 'Sistema' : 'Custom'}
    </span>
  )
},
```

- [ ] **Step 2: Aggiorna `PermissionEditorModal` — `readOnly` sempre `false`**

Riga ~408:

```ts
// PRIMA
readOnly={permissionTarget?.isSystem ?? true}

// DOPO
readOnly={false}
```

- [ ] **Step 3: Rimuovi guardia `isSystem` nell'azione Elimina**

Riga ~313:

```ts
// RIMUOVI
if (role.isSystem) {
  setPageError('I ruoli di sistema non possono essere eliminati')
  return
}
```

- [ ] **Step 4: Aggiorna `secondarySection.content` in `PermissionEditorModal`**

Rimuovi i riferimenti a `isSystem` nel pannello dettaglio:

```tsx
// DOPO — senza isSystem
{permissionTarget && (
  <div className="flex flex-wrap items-center gap-2">
    <code className="admin-code">{permissionTarget.name}</code>
  </div>
)}

<p className="text-sm text-[#6B7280]">
  I permessi di questo ruolo possono essere aggiornati e sostituiti integralmente.
</p>
```

- [ ] **Step 5: Aggiorna `onSave` — rimuovi guard `isSystem`**

Riga ~441:

```ts
// PRIMA
onSave={permissionDetail && !permissionTarget?.isSystem ? handlePermissionSave : undefined}

// DOPO
onSave={permissionDetail ? handlePermissionSave : undefined}
```

- [ ] **Step 6: Aggiorna `handlePermissionSave` — rimuovi guard `isSystem`**

Riga ~198:

```ts
// PRIMA
if (!permissionTarget || permissionTarget.isSystem) return

// DOPO
if (!permissionTarget) return
```

- [ ] **Step 7: Verifica TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "RolesPage" | head -10
```

Expected: nessun errore.

- [ ] **Step 8: Esegui test frontend**

```bash
cd frontend && npm test 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/admin/RolesPage.tsx
git commit -m "refactor(roles-page): rimuovi UI isSystem, tutti i ruoli sono modificabili"
```

---

## Verifica finale

- [ ] **Backend test suite completa**

```bash
cd backend && npm test 2>&1 | tail -5
```

Expected: tutti PASS.

- [ ] **Frontend type check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | tail -5
```

Expected: nessun errore.

- [ ] **Commit di chiusura**

```bash
git add -A
git commit -m "chore: verifica finale migrazione permission-only auth"
```

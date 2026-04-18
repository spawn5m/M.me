# Design: Migrazione a Permission-Only Auth

**Data:** 2026-04-18
**Branch:** ruoli_e_utenti
**Approccio:** A — Clean break

---

## Obiettivo

Eliminare i ruoli di sistema (`super_admin`, `manager`, `collaboratore`, `impresario_funebre`, `marmista`) e far lavorare ogni pagina e route esclusivamente sui permessi individuali. I ruoli custom restano come meccanismo di raggruppamento conveniente.

---

## Cosa non cambia

- Ruoli custom (creati dall'admin) — restano e funzionano
- `Permission.isSystem` — resta per proteggere permessi built-in dalla cancellazione
- Tutta l'infrastruttura `checkPermission` / `checkAnyPermission` / `checkAllPermissions`

---

## Sezione 1 — Schema & Seed

### Prisma schema

- **Rimuovi** `Role.isSystem: Boolean` → migration `ALTER TABLE roles DROP COLUMN "isSystem"`
- Tutti i ruoli diventano dello stesso tipo, nessuna distinzione sistema/custom

### Permessi nuovi / modificati

| Codice | Tipo | Note |
|--------|------|------|
| `user.isManager` | Nuovo — dichiarativo | Marca un utente come candidato manager assegnabile |
| `users.is_super_admin` | Rinominato da `users.super_admin.manage` | Marca il super admin — solo un utente alla volta |
| `users.super_admin.read` | Invariato | Chi ce l'ha vede il super admin nella lista |

### Seed

- **Rimuovi** creazione ruoli di sistema: `super_admin`, `manager`, `collaboratore`, `impresario_funebre`, `marmista`
- **Rimuovi** sincronizzazione `SYSTEM_ROLE_DEFAULTS`
- **Aggiungi** `user.isManager` e `users.is_super_admin` a `SYSTEM_PERMISSIONS`
- **Rimuovi** `users.super_admin.manage` da `SYSTEM_PERMISSIONS`
- **Elimina** `role-defaults.ts` — non serve più

---

## Sezione 2 — Backend Auth Layer

### `get-effective-permissions.ts`

- Rimuovi `roles` dal return → restituisce solo `{ permissions: string[] }`
- La query `userRoles` resta per estrarre i permessi dei ruoli assegnati

### Auth plugin (`auth.ts`)

- Rimuovi `roles` da `AuthorizationContext`
- Rimuovi `checkRole` decorator e relativa dichiarazione in `FastifyInstance`

```ts
// prima
interface AuthorizationContext {
  userId: string
  roles: string[]
  permissions: string[]
}

// dopo
interface AuthorizationContext {
  userId: string
  permissions: string[]
}
```

### Login / Me response

- `AuthUser` in `shared.ts` → rimuovi `roles: string[]`
- Response `/auth/login` e `/auth/me` → rimuovi campo `roles`

---

## Sezione 3 — Frontend Auth Layer

### `AuthContext.tsx`

- `AuthUser` interface → rimuovi `roles: string[]`
- Stato `roles` rimosso, `useAuth()` non espone più `roles`
- `hasPermission` e `hasAnyPermission` restano invariati

---

## Sezione 4 — UsersPage (frontend)

### Bottone "Listino" — visibilità

Nascosto se l'utente target ha **uno dei seguenti permessi diretti**:
- `user.isManager`
- `users.is_super_admin`

### Modal assegnazione listino — select visibili

| Select | Condizione |
|--------|-----------|
| Listino Cofani | target ha `client.catalog.funeral.read` |
| Listino Marmista | target ha `client.catalog.marmista.read` |

### `AdminUser` — campo `permissions` aggiunto

`shared.ts` → aggiungi `permissions: string[]` al tipo `AdminUser`.

Backend `users.ts` → `userToResponse()` calcola i permessi effettivi (union di ruoli + diretti) per ogni utente e li include nella response. La query `USER_INCLUDE` già carica `userRoles.role.rolePermissions` e `userPermissions` — serve solo il mapping Set → array.

### Helper `userHasRole` → rimosso

Sostituito da controllo su `user.permissions` (array di codici permesso effettivi restituito dall'API).

---

## Sezione 5 — RolesPage (frontend + backend)

### Frontend

- Colonna "Tipo" (badge Sistema/Custom) → rimossa
- `PermissionEditorModal` → `readOnly` sempre `false`

### Backend `roles.ts`

- Rimossi tutti i guard `if (role.isSystem) return 403`
- Qualsiasi ruolo è ora eliminabile e modificabile

---

## Sezione 6 — Backend `users.ts`

### `isSuperAdminUser(user)`

```ts
// prima — controlla ruolo
user.userRoles.some(r => r.role.name === 'super_admin')

// dopo — controlla permesso diretto
user.userPermissions.some(p => p.permission.code === 'users.is_super_admin')
```

### Filtro lista utenti (chi non ha `users.super_admin.read`)

```ts
// prima
where.userRoles = { none: { role: { name: 'super_admin' } } }

// dopo
where.userPermissions = { none: { permission: { code: 'users.is_super_admin' } } }
```

### Protezione scrittura super admin

```ts
// in PUT /:id, DELETE /:id, PUT /:id/permissions
if (isSuperAdminUser(target) && req.auth.userId !== target.id) → 403
```

Solo il super admin può modificare se stesso. Nessun altro ha questo privilegio.

### `users.is_super_admin` — unicità

In `PUT /:id/permissions`, se `users.is_super_admin` è nei codici da assegnare:
- Verifica che nessun altro utente abbia già questo permesso → 409 Conflict se violato

### `isAssigningSuperAdmin` → rimosso

Il controllo su assegnazione del ruolo `super_admin` sparisce (il ruolo non esiste più).

### `canManageSuperAdmins()` → rimosso

Sostituito dal self-check `req.auth.userId === target.id`.

---

## Sezione 7 — Backend `public.ts`

### `loadSessionRoles` → `loadSessionPermissions`

Usa `getEffectivePermissions` esistente invece di caricare solo i ruoli.

### Branching prezzi pubblici

| Prima (ruolo) | Dopo (permesso) |
|---------------|-----------------|
| `manager \|\| super_admin` | `pricelists.sale.preview` |
| `impresario_funebre` | `client.catalog.funeral.read` |
| `marmista` | `client.catalog.marmista.read` |

---

## Sezione 8 — Backend `pricelists.ts`

### Validazione tipo utente in assegnazione listino

```ts
// prima — via ruoli
const userRoleNames = user.userRoles.map(ur => ur.role.name)
const isMarmista = userRoleNames.includes('marmista')
const isFuneralClient = userRoleNames.includes('impresario_funebre')

// dopo — via permessi diretti
const userPermCodes = user.userPermissions.map(up => up.permission.code)
const isMarmista = userPermCodes.includes('client.catalog.marmista.read')
const isFuneralClient = userPermCodes.includes('client.catalog.funeral.read')
```

La logica di validazione (incompatibilità funeral/marmista) resta identica.

---

## Pagine senza modifiche logiche

Le seguenti pagine/route usano già solo `checkPermission` e non hanno controlli ruolo:

- Articoli (Cofani, Accessori, Marmista)
- Misure, Lookup
- Listini admin
- Catalogo PDF
- Branding, Locales, Maps, Manutenzione
- Client catalog (`client.ts`)

---

## Riepilogo file da modificare

| File | Tipo modifica |
|------|--------------|
| `backend/prisma/schema.prisma` | Drop `Role.isSystem` |
| `backend/prisma/seed.ts` | Rimuovi system roles, aggiorna SYSTEM_PERMISSIONS |
| `backend/src/lib/authorization/permissions.ts` | Aggiungi `user.isManager`, `users.is_super_admin`; rimuovi `users.super_admin.manage` |
| `backend/src/lib/authorization/role-defaults.ts` | Elimina file |
| `backend/src/lib/authorization/get-effective-permissions.ts` | Rimuovi `roles` dal return |
| `backend/src/plugins/auth.ts` | Rimuovi `roles` da context, rimuovi `checkRole` |
| `backend/src/routes/auth.ts` | Rimuovi `roles` da response |
| `backend/src/routes/users.ts` | `isSuperAdminUser` via permesso, self-check, unicità `users.is_super_admin` |
| `backend/src/routes/roles.ts` | Rimuovi guard `isSystem` |
| `backend/src/routes/public.ts` | `loadSessionPermissions`, branching via permessi |
| `backend/src/routes/pricelists.ts` | Tipo utente via `userPermissions` |
| `backend/src/types/shared.ts` | Rimuovi `roles` da `AuthUser`; aggiungi `permissions: string[]` ad `AdminUser` |
| `frontend/src/context/AuthContext.tsx` | Rimuovi `roles` |
| `frontend/src/pages/admin/UsersPage.tsx` | Rimuovi `userHasRole`, usa permessi target |
| `frontend/src/pages/admin/RolesPage.tsx` | Rimuovi badge isSystem, modal sempre editabile |

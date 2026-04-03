# Fase 3 — Part 1: Foundation + Users + Roles

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migration Prisma, admin shell React (`/admin/*`), API e UI complete per utenti e ruoli.

**Architecture:** Vertical slices — ogni dominio riceve API backend + pagina React completa prima del successivo. Admin shell condivisa costruita sul primo dominio.

**Tech Stack:** Fastify v5, Prisma v7, React 19, React Router v7, Axios, react-hook-form + @hookform/resolvers, Zod, Tailwind v4, Vitest + Testing Library

---

## File Map

**Creare (backend):** `src/routes/admin.ts`, `src/test-helper.ts`, `src/test-setup.ts`, `src/routes/__tests__/admin.test.ts`, `src/routes/__tests__/users.test.ts`, `src/routes/__tests__/roles.test.ts`

**Modificare (backend):** `prisma/schema.prisma`, `src/app.ts`, `src/routes/users.ts`, `src/routes/roles.ts`, `src/types/shared.ts`

**Creare (frontend):** `context/AuthContext.tsx`, `components/admin/ProtectedRoute.tsx`, `components/admin/AdminLayout.tsx`, `components/admin/AdminSidebar.tsx`, `components/admin/DataTable.tsx`, `components/admin/FormModal.tsx`, `components/admin/ConfirmDialog.tsx`, `pages/LoginPage.tsx`, `pages/admin/DashboardPage.tsx`, `pages/admin/UsersPage.tsx`, `pages/admin/RolesPage.tsx`, `lib/admin/users-api.ts`, `lib/admin/roles-api.ts`

**Modificare (frontend):** `App.tsx`

---

## Task 1: Prisma migration

- [ ] In `schema.prisma`: rimuovere `InternalMeasure`, aggiungere `CoffinMeasure` (code, label, head, feet, shoulder, height, width, depth + relation a CoffinArticle), aggiungere `measureId String?` + `measure CoffinMeasure?` su `CoffinArticle`, aggiungere enum `PdfCatalogType { accessories marmista }` e campo `type PdfCatalogType @unique` su `PdfCatalog`.
- [ ] `cd backend && npx prisma migrate dev --name "fase3-coffin-measure-pdf-type"` → atteso: `Your database is now in sync with your schema.`
- [ ] `git add backend/prisma/ && git commit -m "feat: prisma migration — CoffinMeasure + PdfCatalogType"`

---

## Task 2: Backend test helper

- [ ] Creare `mirigliani_test` DB: `psql -c "CREATE DATABASE mirigliani_test OWNER mirigliani_usr;"`
- [ ] Aggiungere `DATABASE_URL_TEST=postgresql://mirigliani_usr:password_locale@localhost:5432/mirigliani_test` in `backend/.env`
- [ ] Creare `backend/src/test-setup.ts`: setta `process.env.DATABASE_URL = process.env.DATABASE_URL_TEST`, `SESSION_SECRET` (32 char), `SESSION_SALT` (16 char), poi `spawnSync('npx', ['prisma','migrate','deploy'], { cwd: process.cwd(), env: process.env, stdio: 'inherit' })`
- [ ] Aggiornare `backend/vitest.config.ts` con `setupFiles: ['./src/test-setup.ts']`
- [ ] Creare `backend/src/test-helper.ts` con: `buildTestApp()` (istanza Fastify di test con tutti i plugin + route auth/users/roles/admin), `seedTestUser(app, { email, password, roles[] })`, `getAuthCookie(app, email, password)`, `cleanupTestDb(app)` (deleteMany in ordine FK: userRole → userManager → rolePermission → user → role → permission)
- [ ] `git commit -m "test: backend test helper + test DB setup"`

---

## Task 3: Admin stats route

- [ ] Scrivere `backend/src/routes/__tests__/admin.test.ts`: `GET /api/admin/stats` → 200 con `{ users, coffins, accessories, marmista: number }`, 401 senza auth
- [ ] `npx vitest run src/routes/__tests__/admin.test.ts` → atteso: FAIL
- [ ] Creare `backend/src/routes/admin.ts`: route `GET /stats` protetta da authenticate + checkRole(['manager','super_admin','collaboratore']), fa `Promise.all` di quattro `prisma.X.count()`, restituisce i conteggi
- [ ] Registrare in `app.ts`: `app.register(adminRoutes, { prefix: '/api/admin' })`
- [ ] `npx vitest run src/routes/__tests__/admin.test.ts` → atteso: PASS
- [ ] `git commit -m "feat: GET /api/admin/stats"`

---

## Task 4: Users API

- [ ] Scrivere `src/routes/__tests__/users.test.ts`: test per GET / (lista paginata, filtro ?role=, nessuna password esposta), POST / (crea utente, 400 email invalida, 409 duplicata), GET /:id (200, 404), PUT /:id (aggiorna campo), DELETE /:id (soft delete isActive=false), GET /me/subordinates (collaboratore vede i propri)
- [ ] `npx vitest run src/routes/__tests__/users.test.ts` → atteso: FAIL (501)
- [ ] Implementare `src/routes/users.ts`:
  - Zod schema create: `{ email, password min 8, firstName, lastName, roleIds[], managerId? }`
  - Zod schema update: tutti opzionali + `isActive?`
  - Helper `userToResponse()`: omette password, include `roles[]` e `manager`
  - `GET /`: scope per ruolo (collaboratore → filtra per propri; manager → esclude super_admin); query params page/pageSize/role/isActive/search; risposta `{ data, pagination }`
  - `POST /`: hash bcrypt 12 rounds, 409 su email duplicata, 201
  - `GET /me/subordinates`: **prima di** `GET /:id` (evita conflitto parametro)
  - `GET /:id`, `PUT /:id`, `DELETE /:id`: 404 se non esiste; DELETE = `update({ isActive: false })` + 204
- [ ] `npx vitest run src/routes/__tests__/users.test.ts` → atteso: PASS
- [ ] `git commit -m "feat: Users API — CRUD completo + /me/subordinates"`

---

## Task 5: Roles API

- [ ] Scrivere `src/routes/__tests__/roles.test.ts`: GET / (super_admin 200, manager 403), POST / (crea ruolo custom), DELETE /:id (409 su isSystem=true, 204 su custom)
- [ ] `npx vitest run src/routes/__tests__/roles.test.ts` → atteso: FAIL
- [ ] Implementare `src/routes/roles.ts`: checkRole(['super_admin']) globale; Zod schema name `/^[a-z_]+$/`; `isSystem: false` sempre su creazione; DELETE blocca se `role.isSystem`
- [ ] `npx vitest run src/routes/__tests__/roles.test.ts` → atteso: PASS
- [ ] Aggiungere tipi `AdminUser`, `AdminRole`, `AdminStats` in `src/types/shared.ts`
- [ ] `git commit -m "feat: Roles API CRUD + tipi AdminUser/AdminRole/AdminStats"`

---

## Task 6: Frontend foundation

- [ ] `cd frontend && npm install react-hook-form @hookform/resolvers`
- [ ] Creare `context/AuthContext.tsx`: `AuthProvider` con `useState<AuthUser|null>`, `useEffect` chiama `GET /api/auth/me`, espone `{ user, roles, isLoading, hasRole(role|role[]), login(), logout(), refresh() }`
- [ ] Creare `components/admin/ProtectedRoute.tsx`: se `isLoading` → spinner; se `!user` → `<Navigate to="/login">`; se `requiredRoles` non soddisfatti → redirect dashboard
- [ ] Creare `components/admin/AdminSidebar.tsx`: array `NAV_ITEMS` con `{ to, label, roles: null|string[] }`, filtra con `hasRole()`, usa `<NavLink>` con classe attiva bordo-oro `#C9A96E`; sidebar navy `#1A2B4A`
- [ ] Creare `components/admin/AdminLayout.tsx`: sidebar sticky a sinistra + header con toggle + bottone logout + `<Outlet />`
- [ ] Creare `components/admin/DataTable.tsx`: props `columns[]`, `data[]`, `keyField`, `pagination`, `actions?`; tabella con header, righe, paginazione ← →
- [ ] Creare `components/admin/FormModal.tsx`: overlay + modal con header titolo, body `children`, footer Annulla/Salva
- [ ] Creare `components/admin/ConfirmDialog.tsx`: modal piccolo con titolo, messaggio, bottoni Annulla/Conferma (variante danger/warning)
- [ ] Test per `AuthContext` (mock api), `ProtectedRoute` (mock useAuth), `AdminSidebar` (verifica Ruoli visibile solo super_admin), `DataTable` (renderizza colonne/dati/paginazione)
- [ ] `npx vitest run src/components/admin` → PASS; `git commit -m "feat: admin shell — AuthContext, ProtectedRoute, Layout, componenti condivisi"`

---

## Task 7: LoginPage + App.tsx + pagine admin

- [ ] Creare `pages/LoginPage.tsx`: form email+password, chiama `useAuth().login()`, redirect a `from` (o `/admin/dashboard`) dopo successo, mostra errore su catch
- [ ] Creare `lib/admin/users-api.ts`: `usersApi.list(filters)`, `.get(id)`, `.create(payload)`, `.update(id,payload)`, `.delete(id)`, `.mySubordinates()`
- [ ] Creare `lib/admin/roles-api.ts`: `rolesApi.list()`, `.create()`, `.update()`, `.delete()`
- [ ] Creare `pages/admin/DashboardPage.tsx`: chiama `GET /api/admin/stats`, mostra 4 card (utenti, cofani, accessori, marmisti)
- [ ] Creare `pages/admin/UsersPage.tsx`: DataTable utenti con paginazione; FormModal crea utente (react-hook-form + Zod); ConfirmDialog disattiva; load ruoli per select checkbox
- [ ] Creare `pages/admin/RolesPage.tsx`: DataTable ruoli; badge "Sistema"/"Custom"; FormModal crea ruolo; elimina solo non-system
- [ ] Aggiornare `App.tsx`: wrappare tutto in `<AuthProvider>`, aggiungere `<Route path="/login">`, route `/admin/*` con `<ProtectedRoute><AdminLayout>`, subroute dashboard/users/roles (roles con `requiredRoles={['super_admin']}`), placeholder per coffins/accessories/marmista/catalog
- [ ] Test per LoginPage, DashboardPage, UsersPage, RolesPage (mock API + useAuth)
- [ ] `npx vitest run src/pages` → PASS
- [ ] `git commit -m "feat: LoginPage, DashboardPage, UsersPage, RolesPage + routing admin"`

---

## Task 8: Smoke test finale

- [ ] `cd backend && npx vitest run` → tutti i test passano
- [ ] `cd frontend && npx vitest run` → tutti i test passano
- [ ] Avviare `npm run dev` in backend e frontend, verificare manualmente: login, dashboard, lista utenti, crea utente, lista ruoli, logout
- [ ] `git commit -m "feat: Fase 3 Part 1 — Foundation + Users + Roles completati"`

---

## Nota: Piano 2

Il piano `2026-04-03-fase3-part2-articles-catalog.md` coprirà: Coffins API+UI (con lookup tables + misure + upload immagine), Accessories API+UI, Marmista API+UI, Catalog PDF API+UI, componenti `ImageUpload` e `FileUpload`.

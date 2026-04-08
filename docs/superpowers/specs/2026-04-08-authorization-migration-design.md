# Design Spec — Authorization Migration
**Data:** 2026-04-08
**Progetto:** Mirigliani B2B
**Fase:** 5 di 6

---

## Obiettivo

Migrare Mirigliani da un modello RBAC hardcoded basato su `checkRole()` e `hasRole()` a un modello permission-based fine-grained, mantenendo i ruoli come bundle di permessi predefiniti.

In questo step viene implementata la **core migration**:
- schema Prisma e seed del nuovo catalogo permessi;
- risoluzione runtime dei permessi effettivi;
- migrazione del backend core a `checkPermission()`;
- estensione di `/api/auth/me` con `permissions[]`;
- migrazione del frontend auth, guardie e sidebar a permessi;
- suite test di regressione sui domini sensibili;
- documentazione tecnica completa della matrice autorizzativa.

Restano fuori da questo step:
- UI amministrativa per assegnare permessi ai ruoli;
- UI per grant diretti utente;
- vista amministrativa dei permessi effettivi.

---

## Approcci valutati

### 1. Compatibilita guidata — scelto

Introdurre il nuovo modello permission-based come source of truth del runtime, mantenendo una compatibilita temporanea con `checkRole()` solo per eventuali domini non ancora migrati durante il refactoring.

**Pro:**
- consente una migrazione incrementale ma completa del perimetro core;
- riduce il rischio di regressioni rispetto a un big bang;
- permette di spostare subito backend e frontend sui permessi senza dipendere dalla futura UI admin.

**Contro:**
- richiede una breve fase di coesistenza tecnica fra guard vecchie e nuove.

### 2. Big bang

Rimuovere subito ogni uso di `checkRole()` e `hasRole()` in tutto il repo.

**Pro:** stato finale piu pulito.

**Contro:** blast radius troppo alto per uno step singolo, rischio di regressioni maggiore.

### 3. DB-first

Aggiornare solo schema, seed e resolver, rimandando enforcement e frontend.

**Pro:** rollout prudente.

**Contro:** non soddisfa i criteri di accettazione di `AUTHORIZATION.md` e non porta valore runtime immediato.

---

## Architettura target

### Source of truth runtime

La sessione conserva solo:
- `userId`

Per ogni request protetta il backend costruisce un auth context request-level con:
- `request.auth.userId`
- `request.auth.roles`
- `request.auth.permissions`

Questo elimina il problema attuale per cui un cambio ruolo resta invisibile fino al logout/login.

### Building block backend

Nuovi moduli in `backend/src/lib/authorization/`:
- `permissions.ts`: catalogo centrale dei permission code e dei relativi metadata;
- `role-defaults.ts`: matrice default ruolo -> permessi;
- `get-effective-permissions.ts`: unione di permessi da ruoli e grant diretti utente;
- `checks.ts`: helper runtime condivisi per verifiche `any` e `all`.

### Plugin auth

`backend/src/plugins/auth.ts` viene evoluto per esporre:
- `authenticate`
- `loadAuthorizationContext`
- `checkPermission(permissionCode)`
- `checkAnyPermission(permissionCodes)`
- `checkAllPermissions(permissionCodes)`

`checkRole()` puo restare solo come compatibilita temporanea finche il refactor del perimetro core non e chiuso, ma non deve piu essere la guard primaria delle route migrate.

---

## Modello dati

### Estensione `Permission`

`backend/prisma/schema.prisma` aggiorna `Permission` con:
- `code: String @unique`
- `resource: String`
- `action: String`
- `scope: String?`
- `label: String`
- `description: String`
- `isSystem: Boolean @default(true)`

La chiave logica runtime diventa `code`.

### Nuova tabella `UserPermission`

Nuova join table:
- `userId`
- `permissionId`
- `createdAt`
- `grantedByUserId?`

Relazioni:
- `User` -> `userPermissions[]`
- `Permission` -> `userPermissions[]`

I grant diretti sono solo additivi.

### Seed e catalogo

Il seed smette di creare permessi minimali `resource/action` scollegati dal runtime.

Il nuovo seed:
- definisce il catalogo completo in TypeScript;
- sincronizza tutti i `Permission` di sistema;
- sincronizza la matrice ruolo -> permessi per i ruoli di sistema;
- lascia i ruoli come bundle di capability, non come logica applicativa implicita.

I default ruolo -> permessi seguono la baseline di `AUTHORIZATION.md`, inclusa la correzione del ruolo `collaboratore` come profilo editoriale senza accesso di default ai listini.

---

## Flusso runtime

### Login

`POST /api/auth/login`:
1. valida credenziali;
2. salva in sessione solo `userId`;
3. restituisce `user`, `roles[]`, `permissions[]`.

### Request protetta

Per ogni request protetta:
1. `authenticate` verifica la presenza di `userId`;
2. `loadAuthorizationContext` carica utente, ruoli e permessi effettivi dal DB;
3. le guard permission-based validano la capability richiesta;
4. route e service applicano le regole di scope query.

### `/api/auth/me`

`GET /api/auth/me` restituisce:
- `user`
- `roles[]`
- `permissions[]`

I ruoli restano nel payload solo per label profilo, grouping UI e reportistica. L'enforcement avviene sui permessi.

---

## Backend — migrazione route

### `auth`

- `POST /api/auth/login`: sessione `userId` only.
- `POST /api/auth/logout`: invariato.
- `GET /api/auth/me`: aggiunge `permissions[]` e smette di leggere i ruoli dalla sessione.

### `users`

Le operazioni utenti passano a capability esplicite:
- lista utenti: `users.read.team` oppure `users.read.all`;
- dettaglio utente: `users.read.team` oppure `users.read.all` con scope coerente;
- creazione utente: `users.create`;
- modifica utente: `users.update.team` oppure `users.update.all`;
- disattivazione: `users.disable`;
- assegnazione manager: `users.assign_manager`;
- assegnazione listino cliente: `users.assign_pricelist`;
- visibilita super admin: `users.super_admin.read`;
- gestione super admin: `users.super_admin.manage`.

Regole richieste:
- `users.read.team` e `users.update.team` filtrano il perimetro del manager;
- `users.read.all` non implica `users.super_admin.read`;
- `users.update.all` non implica `users.super_admin.manage`.

### `roles`

- lista ruoli: `roles.read`;
- create/delete ruoli: `roles.manage`.

### `pricelists`

Separazione esplicita fra vendita e acquisto:
- accesso listini vendita: `pricelists.sale.read`;
- modifica listini vendita: `pricelists.sale.write`;
- delete listini vendita: `pricelists.sale.delete`;
- preview vendita: `pricelists.sale.preview`;
- ricalcolo vendita: `pricelists.sale.recalculate`;
- assegnazione listini a utenti: `pricelists.sale.assign`;
- accesso listini acquisto: `pricelists.purchase.read`;
- modifica listini acquisto: `pricelists.purchase.write`;
- delete listini acquisto: `pricelists.purchase.delete`;
- preview acquisto: `pricelists.purchase.preview`;
- ricalcolo acquisto: `pricelists.purchase.recalculate`.

Il ruolo `collaboratore` perde accesso di default ai listini, in linea con la matrice documentata.

### `client`

- `/api/client/me`: `client.profile.read`;
- `/api/client/change-password`: `client.password.change`;
- `/api/client/catalog/funeral*`: `client.catalog.funeral.read`;
- `/api/client/catalog/marmista*`: `client.catalog.marmista.read`.

Le route continuano a leggere solo il listino assegnato all'utente corrente, senza accettare `priceListId` dal client.

### `admin`

Le route o endpoint di dashboard amministrativa usano `dashboard.admin.read`.

### `articles` e `lookups`

Per evitare un enforcement ibrido sulle aree gia esposte dalla sidebar admin, il perimetro core include anche:
- `articles.coffins.*`
- `articles.accessories.*`
- `articles.marmista.*`
- `lookups.*`
- `measures.*`
- `catalog.pdf.*`

Mappatura sintetica:
- lettura articoli: `articles.*.read`;
- create/update articoli: `articles.*.write`;
- delete articoli: `articles.*.delete`;
- import articoli: `articles.*.import`;
- upload immagini cofani: `articles.coffins.upload_image`;
- lookup readonly: `lookups.read` o `measures.read`;
- gestione lookup: `lookups.manage` o `measures.manage`;
- catalogo PDF: `catalog.pdf.read` e `catalog.pdf.write`.

---

## Scope rules

I permessi verificano la capability. Lo scope resta applicato dalla route o dal service.

Regole operative obbligatorie:
- `users.read.team` e `users.update.team` restano limitati al perimetro del manager;
- i permessi `users.*.all` non sbloccano automaticamente visibilita o gestione dei super admin;
- `client.catalog.funeral.read` mostra solo i prezzi del listino assegnato all'utente corrente;
- `client.catalog.marmista.read` mostra solo i prezzi del listino assegnato all'utente corrente;
- `pricelists.purchase.*` resta sempre separato da `pricelists.sale.*`.

---

## Frontend

### `AuthContext`

`frontend/src/context/AuthContext.tsx` espone:
- `user`
- `roles[]`
- `permissions[]`
- `hasPermission()`
- `hasAnyPermission()`
- `refresh()`
- `login()`
- `logout()`

I ruoli restano disponibili per label e instradamento UX, ma non per enforcement.

### `ProtectedRoute`

`frontend/src/components/admin/ProtectedRoute.tsx` viene esteso con:
- `requiredPermissions?: string[]`
- `match?: 'any' | 'all'`

Comportamento:
- se manca autenticazione -> redirect a `/login`;
- se i permessi richiesti non sono soddisfatti -> redirect alla dashboard coerente con l'area.

### `AdminSidebar`

`frontend/src/components/admin/AdminSidebar.tsx` diventa permission-based.

Mappatura minima:
- `Dashboard` admin -> `dashboard.admin.read`
- `Ruoli` -> `roles.read`
- `Utenti` -> `users.read.team` o `users.read.all`
- `Listini` -> `pricelists.sale.read` o `pricelists.purchase.read`
- `Catalogo PDF` -> `catalog.pdf.read`
- `Dashboard` client -> `dashboard.client.read`
- voci cliente -> permessi `client.*`

Le voci relative ad articoli, lookup e misure usano i rispettivi permessi `read`.

### Routing app

`frontend/src/App.tsx` sostituisce `requiredRoles` con `requiredPermissions` su:
- area admin;
- pagina ruoli;
- area client;
- cataloghi e dettagli cliente.

Regola di routing:
- la route layout `/admin` richiede `match='any'` su almeno un permesso valido dell'area admin, per non vincolare l'accesso all'intera area al solo `dashboard.admin.read`;
- `/admin/dashboard` richiede `dashboard.admin.read`;
- la route layout `/client` richiede `match='any'` su almeno un permesso valido dell'area cliente;
- `/client/dashboard` richiede `dashboard.client.read`;
- le singole pagine continuano a richiedere il proprio permesso specifico.

La scelta della dashboard iniziale puo continuare a basarsi sui ruoli, perche e una decisione di UX e non di sicurezza.

---

## Strategia test

### Backend

Nuovi o aggiornati test per:
- resolver `getEffectivePermissions(userId)`;
- guard `checkPermission`, `checkAnyPermission`, `checkAllPermissions`;
- `/api/auth/me` con `permissions[]`;
- `users` con coverage capability + scope;
- `roles` con coverage `roles.read/manage`;
- `pricelists` con separazione `sale` vs `purchase`;
- `client` con enforcement `client.*`.

Regressioni obbligatorie:
- i prezzi di acquisto non sono visibili a chi non ha `pricelists.purchase.*`;
- un cambio ruolo o grant utente ha effetto alla request successiva senza nuovo login;
- `collaboratore` non vede i listini di default.

### Frontend

Aggiornare test per:
- `AuthContext` con `permissions[]`;
- `ProtectedRoute` con match `any/all`;
- `AdminSidebar` con visibilita basata su permission set;
- route cliente e admin che dipendono da `requiredPermissions`.

---

## Documentazione

Questo step include documentazione esplicita del nuovo modello.

Deliverable documentali:
- spec di design in `docs/superpowers/specs/2026-04-08-authorization-migration-design.md`;
- aggiornamento documentazione tecnica del repo per spiegare:
  - catalogo permessi;
  - matrice ruolo -> permessi;
  - differenza fra ruoli, grant diretti e permessi effettivi;
  - mappa route -> permission;
  - scope rules applicate lato backend;
  - strategia di migrazione e compatibilita temporanea.

La documentazione deve essere sufficientemente completa da diventare il riferimento operativo per future feature e nuove route protette.

---

## Compatibilita temporanea e cleanup

Durante la migrazione e accettabile mantenere `checkRole()` solo come supporto transitorio, ma il perimetro core implementato in questo step deve gia usare i permessi come autorita di accesso.

Cleanup previsto a valle della core migration:
- deprecazione del role enforcement nelle route applicative migrate;
- rimozione dell'enforcement frontend basato su ruoli;
- consolidamento dei test permission-based come baseline.

---

## Criteri di accettazione

- tutte le route protette del perimetro core usano permessi e non ruoli hardcoded;
- `/api/auth/me` restituisce `permissions[]` oltre a `roles[]`;
- `AuthContext`, `ProtectedRoute`, `AdminSidebar` e routing frontend usano permessi per l'enforcement;
- i grant diretti utente funzionano nel resolver runtime anche senza UI amministrativa dedicata;
- un cambio ruolo o grant utente ha effetto senza logout/login;
- il comportamento del `collaboratore` e coerente tra UI, API e seed;
- i listini `purchase` restano visibili solo a chi ha permessi `pricelists.purchase.*`;
- la suite test copre backend e frontend sui domini sensibili;
- la documentazione tecnica del modello autorizzativo viene aggiornata in modo completo.

# AUTHORIZATION.md

Documento di riferimento per evolvere Mirigliani da un modello `role-based` hardcoded a un modello `permission-based` fine-grained, mantenendo i ruoli come bundle di permessi predefiniti.

---

## 1. Scopo

Questo documento definisce:

- il modello di autorizzazione target;
- il catalogo minimo dei permessi di sistema;
- la descrizione operativa di ogni ruolo;
- la matrice di assegnazione default ruolo -> permessi;
- il piano tecnico di implementazione backend e frontend;
- i criteri di accettazione per considerare la migrazione completata.

---

## 2. Stato attuale

Oggi il progetto usa un RBAC semplice:

- login tramite `@fastify/secure-session`;
- in sessione vengono salvati `userId` e `roles[]`;
- le route protette usano `fastify.authenticate` e `fastify.checkRole(...)`;
- il frontend usa `hasRole()` per proteggere pagine e mostrare voci di navigazione;
- nel database esistono gia `Permission` e `RolePermission`, ma non sono ancora la source of truth del runtime.

### File attuali coinvolti

- `backend/src/plugins/auth.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/users.ts`
- `backend/src/routes/roles.ts`
- `backend/src/routes/pricelists.ts`
- `backend/src/routes/client.ts`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/components/admin/ProtectedRoute.tsx`
- `frontend/src/components/admin/AdminSidebar.tsx`
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`

### Limiti dell'approccio attuale

- i controlli sono basati su nomi ruolo, non su capability atomiche;
- il ruolo `collaboratore` e incoerente tra UI e API;
- i permessi per singolo utente non sono gestibili;
- un cambio ruolo non e applicato immediatamente se la sessione contiene ancora `roles[]`;
- il sistema `Permission` esiste, ma non governa davvero l'accesso runtime.

---

## 3. Obiettivi

- Rendere il backend l'unica autorita sui permessi.
- Passare da `checkRole()` a `checkPermission()`.
- Mantenere i ruoli, ma solo come bundle di permessi.
- Consentire grant aggiuntivi per singolo utente.
- Allineare backend, frontend e seed sulla stessa matrice autorizzativa.
- Rendere espliciti gli accessi sensibili, soprattutto su utenti, ruoli e listini acquisto.

## 4. Non obiettivi v1

- Nessun sistema di `deny` esplicito.
- Nessuna wildcard tipo `articles.*`.
- Nessuna policy engine esterna.
- Nessun affidamento su controlli frontend per la sicurezza.

---

## 5. Principi di progetto

- I permessi sono additivi.
- Il backend decide sempre; il frontend puo solo riflettere lo stato.
- I ruoli non devono contenere logica applicativa implicita.
- I controlli di scopo restano separati dai controlli di capability.
- I permessi devono avere nomi stabili, leggibili e testabili.

### Convenzione naming

Formato raccomandato:

`<dominio>.<risorsa>[.<contesto>].<azione>[.<scope>]`

Esempi:

- `users.read.team`
- `users.read.all`
- `articles.coffins.write`
- `pricelists.purchase.read`
- `client.catalog.funeral.read`

---

## 6. Modello target

### 6.1 Decisione architetturale

Il modello target e ibrido:

- `Role`: bundle di permessi assegnabili a molti utenti;
- `Permission`: capability atomica verificabile a runtime;
- `RolePermission`: join ruolo -> permesso;
- `UserPermission`: grant diretto utente -> permesso;
- `UserRole`: join utente -> ruolo;
- `effectivePermissions`: unione di permessi derivati dai ruoli e permessi diretti utente.

### 6.2 Source of truth runtime

La sessione deve contenere solo:

- `userId`

Per ogni request protetta il backend deve costruire un contesto auth con:

- `userId`
- `roles[]`
- `permissions[]`

Questo evita che un cambio ruolo o un grant diretto richieda logout/login per diventare effettivo.

### 6.3 Modello dati consigliato

`Permission` va esteso per diventare realmente utile al runtime:

- `code: string @unique`
- `resource: string`
- `action: string`
- `scope: string?`
- `label: string`
- `description: string`
- `isSystem: boolean`

Nuova tabella:

- `UserPermission`
  - `userId`
  - `permissionId`
  - `createdAt`
  - `grantedByUserId?` opzionale ma consigliato

### 6.4 Decisione v1 su grant per utente

In v1 i grant diretti utente sono solo aggiuntivi.

Esempio:

- un `collaboratore` puo ricevere temporaneamente `lookups.manage`;
- un `manager` puo ricevere `roles.read` senza diventare `super_admin`.

Non sono previsti deny espliciti. Se serve restringere, si cambia ruolo o si tolgono grant aggiuntivi.

---

## 7. Catalogo minimo dei permessi

### 7.1 Dashboard

| Permesso | Descrizione |
|---|---|
| `dashboard.admin.read` | Vedere dashboard, metriche e riepiloghi dell'area amministrativa. |
| `dashboard.client.read` | Vedere dashboard e riepilogo dell'area cliente. |

### 7.2 Utenti

| Permesso | Descrizione |
|---|---|
| `users.read.team` | Vedere gli utenti del proprio perimetro operativo o commerciale. |
| `users.read.all` | Vedere tutti gli utenti non limitati da scope di team. |
| `users.create` | Creare nuovi utenti. |
| `users.update.team` | Modificare utenti del proprio perimetro. |
| `users.update.all` | Modificare utenti fuori dal proprio team. |
| `users.disable` | Disattivare utenti. |
| `users.assign_manager` | Assegnare o cambiare il manager di un utente. |
| `users.assign_pricelist` | Assegnare listini a utenti cliente. |
| `users.super_admin.read` | Vedere utenti con ruolo `super_admin`. |
| `users.super_admin.manage` | Creare, modificare o disattivare utenti `super_admin`. |

### 7.3 Ruoli

| Permesso | Descrizione |
|---|---|
| `roles.read` | Vedere elenco ruoli e relativi permessi. |
| `roles.manage` | Creare, modificare o eliminare ruoli custom e assegnare permessi ai ruoli. |

### 7.4 Articoli cofano

| Permesso | Descrizione |
|---|---|
| `articles.coffins.read` | Vedere articoli cofani. |
| `articles.coffins.write` | Creare e modificare articoli cofani. |
| `articles.coffins.delete` | Eliminare articoli cofani. |
| `articles.coffins.import` | Importare cofani da Excel. |
| `articles.coffins.upload_image` | Caricare o sostituire immagini per i cofani. |

### 7.5 Articoli accessori

| Permesso | Descrizione |
|---|---|
| `articles.accessories.read` | Vedere articoli accessori. |
| `articles.accessories.write` | Creare e modificare articoli accessori. |
| `articles.accessories.delete` | Eliminare articoli accessori. |
| `articles.accessories.import` | Importare accessori da Excel. |

### 7.6 Articoli marmista

| Permesso | Descrizione |
|---|---|
| `articles.marmista.read` | Vedere articoli marmista. |
| `articles.marmista.write` | Creare e modificare articoli marmista. |
| `articles.marmista.delete` | Eliminare articoli marmista. |
| `articles.marmista.import` | Importare articoli marmista da Excel. |

### 7.7 Lookup e misure

| Permesso | Descrizione |
|---|---|
| `lookups.read` | Vedere categorie, sottocategorie, essenze, figure, colori e finiture. |
| `lookups.manage` | Creare, modificare o eliminare lookup. |
| `measures.read` | Vedere misure dei cofani. |
| `measures.manage` | Creare, modificare o eliminare misure dei cofani. |

### 7.8 Listini vendita

| Permesso | Descrizione |
|---|---|
| `pricelists.sale.read` | Vedere listini di vendita. |
| `pricelists.sale.write` | Creare e modificare listini di vendita, regole e struttura. |
| `pricelists.sale.delete` | Eliminare listini di vendita. |
| `pricelists.sale.assign` | Assegnare listini di vendita agli utenti. |
| `pricelists.sale.preview` | Vedere anteprima prezzi calcolati per listini di vendita. |
| `pricelists.sale.recalculate` | Rigenerare snapshot prezzi per listini di vendita. |

### 7.9 Listini acquisto

| Permesso | Descrizione |
|---|---|
| `pricelists.purchase.read` | Vedere listini acquisto e prezzi di acquisto. |
| `pricelists.purchase.write` | Creare e modificare listini acquisto. |
| `pricelists.purchase.delete` | Eliminare listini acquisto. |
| `pricelists.purchase.preview` | Vedere anteprima prezzi calcolati per listini acquisto. |
| `pricelists.purchase.recalculate` | Rigenerare snapshot prezzi per listini acquisto. |

### 7.10 Catalogo PDF

| Permesso | Descrizione |
|---|---|
| `catalog.pdf.read` | Vedere stato e metadati del catalogo PDF. |
| `catalog.pdf.write` | Caricare o sostituire PDF catalogo. |

### 7.11 Area cliente

| Permesso | Descrizione |
|---|---|
| `client.profile.read` | Vedere il proprio profilo cliente, il manager assegnato e i listini collegati. |
| `client.password.change` | Cambiare la propria password. |
| `client.catalog.funeral.read` | Consultare il catalogo funebre del proprio listino cliente. |
| `client.catalog.marmista.read` | Consultare il catalogo marmista del proprio listino cliente. |

---

## 8. Descrizione dei ruoli

| Ruolo | Cosa fa il ruolo |
|---|---|
| `super_admin` | Amministratore di piattaforma. Governa sicurezza, ruoli, utenti, contenuti, listini e configurazioni sensibili. E l'unico profilo che puo amministrare i ruoli e gestire altri super admin. |
| `manager` | Responsabile operativo e commerciale. Gestisce utenti ordinari, contenuti catalogo, lookup, PDF e listini, inclusi quelli di acquisto. Non governa l'architettura dei ruoli di sistema. |
| `collaboratore` | Operatore editoriale di backoffice. Aggiorna articoli, importa dati, gestisce immagini e consulta contenuti amministrativi operativi, ma non gestisce ruoli, sicurezza o prezzi di acquisto. |
| `impresario_funebre` | Cliente professionale area funebre. Consulta il proprio catalogo funebre, i propri prezzi e il proprio contesto commerciale. |
| `marmista` | Cliente professionale area marmista. Consulta il proprio catalogo marmista, i propri prezzi e il proprio contesto commerciale. |

---

## 9. Matrice default ruolo -> permessi

| Permesso | super_admin | manager | collaboratore | impresario_funebre | marmista |
|---|---|---|---|---|---|
| `dashboard.admin.read` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `dashboard.client.read` | ✗ | ✗ | ✗ | ✅ | ✅ |
| `users.read.team` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `users.read.all` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `users.create` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `users.update.team` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `users.update.all` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `users.disable` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `users.assign_manager` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `users.assign_pricelist` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `users.super_admin.read` | ✅ | ✗ | ✗ | ✗ | ✗ |
| `users.super_admin.manage` | ✅ | ✗ | ✗ | ✗ | ✗ |
| `roles.read` | ✅ | ✗ | ✗ | ✗ | ✗ |
| `roles.manage` | ✅ | ✗ | ✗ | ✗ | ✗ |
| `articles.coffins.read` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `articles.coffins.write` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `articles.coffins.delete` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `articles.coffins.import` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `articles.coffins.upload_image` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `articles.accessories.read` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `articles.accessories.write` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `articles.accessories.delete` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `articles.accessories.import` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `articles.marmista.read` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `articles.marmista.write` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `articles.marmista.delete` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `articles.marmista.import` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `lookups.read` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `lookups.manage` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `measures.read` | ✅ | ✅ | ✅ | ✗ | ✗ |
| `measures.manage` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `pricelists.sale.read` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `pricelists.sale.write` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `pricelists.sale.delete` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `pricelists.sale.assign` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `pricelists.sale.preview` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `pricelists.sale.recalculate` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `pricelists.purchase.read` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `pricelists.purchase.write` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `pricelists.purchase.delete` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `pricelists.purchase.preview` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `pricelists.purchase.recalculate` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `catalog.pdf.read` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `catalog.pdf.write` | ✅ | ✅ | ✗ | ✗ | ✗ |
| `client.profile.read` | ✗ | ✗ | ✗ | ✅ | ✅ |
| `client.password.change` | ✗ | ✗ | ✗ | ✅ | ✅ |
| `client.catalog.funeral.read` | ✗ | ✗ | ✗ | ✅ | ✗ |
| `client.catalog.marmista.read` | ✗ | ✗ | ✗ | ✗ | ✅ |

### Nota sul collaboratore

Per il nuovo modello il `collaboratore` va allineato in modo netto al profilo "catalog editor". Non deve avere accesso di default a ruoli, utenti globali o listini.

---

## 10. Scope rules da mantenere anche con i permessi

I permessi non sostituiscono le regole di scopo.

### Regole richieste

- `users.read.team` e `users.update.team` devono filtrare sugli utenti appartenenti al proprio perimetro.
- `users.read.all` non implica automaticamente `users.super_admin.read`.
- `users.update.all` non implica automaticamente `users.super_admin.manage`.
- `client.catalog.funeral.read` deve mostrare solo i prezzi del listino assegnato all'utente corrente.
- `client.catalog.marmista.read` deve mostrare solo i prezzi del listino assegnato all'utente corrente.
- `pricelists.purchase.*` resta separato dai listini vendita.

### Regola pratica

Il guard verifica la capability; il service o la route applica lo scope query.

---

## 11. Strategia backend

### 11.1 Nuovi building block

Creare:

- `backend/src/lib/authorization/permissions.ts`
- `backend/src/lib/authorization/role-defaults.ts`
- `backend/src/lib/authorization/get-effective-permissions.ts`
- `backend/src/lib/authorization/checks.ts`

### 11.2 Contesto auth request-level

Estendere il request context con:

- `request.auth.userId`
- `request.auth.roles`
- `request.auth.permissions`

### 11.3 Guardie consigliate

- `authenticate`
- `loadAuthorizationContext`
- `checkPermission(permissionCode)`
- `checkAnyPermission(permissionCodes[])`
- `checkAllPermissions(permissionCodes[])`

### 11.4 Cambi richiesti al login

- al login salvare in sessione solo `userId`;
- `GET /api/auth/me` deve restituire anche `permissions[]`;
- `roles[]` possono restare nel payload per UI o reporting, ma non devono piu essere l'autorita di accesso.

### 11.5 Compatibilita temporanea

Per la migrazione incrementale e accettabile mantenere `checkRole()` per poco tempo, ma ogni route migrata deve passare esplicitamente a permessi.

---

## 12. Strategia frontend

### 12.1 AuthContext

`AuthContext` deve esporre:

- `user`
- `roles[]`
- `permissions[]`
- `hasPermission()`
- `hasAnyPermission()`
- `refresh()`

### 12.2 ProtectedRoute

`ProtectedRoute` deve supportare:

- `requiredPermissions?: string[]`
- opzionalmente `match: 'any' | 'all'`

### 12.3 Navigazione

`AdminSidebar` e le pagine admin devono usare i permessi, non i ruoli.

Esempi:

- voce `Ruoli` -> `roles.read`
- pagina `Users` -> almeno `users.read.team`
- pagina `Price Lists` -> `pricelists.sale.read` o `pricelists.purchase.read`

### 12.4 Ruoli nel frontend

I ruoli devono restare nel frontend solo per:

- etichette profilo;
- grouping visuale;
- reportistica;
- schermate di amministrazione ruoli.

Non devono piu essere usati per enforcement.

---

## 13. Piano di implementazione

### Fase 1 - Schema Prisma

- Estendere `Permission` con metadata utili al runtime.
- Creare `UserPermission`.
- Preparare migration dati dai permessi seed attuali al nuovo catalogo.

### Fase 2 - Seed e catalogo centrale

- Definire il catalogo permessi in un unico file TypeScript.
- Seedare tutti i permessi di sistema con `code`, `label`, `description`.
- Seedare la matrice default ruolo -> permessi.

### Fase 3 - Authorization service backend

- Implementare il resolver `getEffectivePermissions(userId)`.
- Hydrare `request.auth` ad ogni request protetta.
- Aggiungere i nuovi helper `checkPermission`.

### Fase 4 - Migrazione delle route backend

Priorita:

1. `auth`
2. `users`
3. `roles`
4. `articles/*`
5. `lookups`
6. `pricelists`
7. `client`

### Fase 5 - Migrazione frontend

- estendere `/api/auth/me`;
- aggiornare `AuthContext`;
- sostituire `hasRole()` con `hasPermission()` in layout, sidebar e guardie;
- adattare CTA e bottoni pagina per le nuove capability.

### Fase 6 - UI amministrazione permessi

- pagina ruoli con assegnazione permessi;
- pagina utenti con grant diretti utente;
- vista "permessi effettivi" per debug amministrativo.

### Fase 7 - Test

- test unit sul resolver permessi;
- test unit sui guard backend;
- test route-level per ogni endpoint sensibile;
- test frontend su sidebar e protected routes;
- test di regressione su listini acquisto e area cliente.

### Fase 8 - Cleanup

- deprecare `checkRole()` dalle route applicative;
- rimuovere logica di enforcement basata sui ruoli nel frontend;
- aggiornare documentazione tecnica e seed.

---

## 14. File map proposta

### Backend

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/plugins/auth.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/users.ts`
- `backend/src/routes/roles.ts`
- `backend/src/routes/articles/coffins.ts`
- `backend/src/routes/articles/accessories.ts`
- `backend/src/routes/articles/marmista.ts`
- `backend/src/routes/lookups.ts`
- `backend/src/routes/pricelists.ts`
- `backend/src/routes/client.ts`
- `backend/src/lib/authorization/*`

### Frontend

- `frontend/src/context/AuthContext.tsx`
- `frontend/src/components/admin/ProtectedRoute.tsx`
- `frontend/src/components/admin/AdminSidebar.tsx`
- `frontend/src/pages/admin/*`

---

## 15. Criteri di accettazione

La migrazione e considerata completata quando:

- tutte le route protette usano permessi e non ruoli hardcoded;
- `/api/auth/me` restituisce `permissions[]`;
- la sidebar e le route frontend si basano su permessi;
- i grant diretti utente funzionano;
- un cambio di ruolo o grant utente ha effetto senza dover riloggare;
- il comportamento del `collaboratore` e coerente tra UI e API;
- `purchase` resta visibile solo a chi ha permessi `pricelists.purchase.*`;
- esiste una suite di test endpoint -> permission per i domini sensibili.

---

## 16. Decisioni operative raccomandate

- Mantenere i ruoli di sistema correnti.
- Usare il ruolo `collaboratore` come profilo editoriale, non come admin generico.
- Tenere `super_admin` come unico ruolo con `roles.manage` e `users.super_admin.manage`.
- Non modellare eccezioni speciali con if/else sui nomi ruolo quando esiste gia un permesso che le esprime.
- Introdurre ogni nuova pagina o endpoint futuro solo con permessi espliciti.

---

## 17. Open questions da chiudere prima della migration finale

- Un `manager` puo leggere i ruoli senza gestirli oppure no.
- Un `collaboratore` deve poter vedere parte della lista utenti o va rimosso del tutto dall'area utenti.
- Serve distinguere `catalog.pdf.read` da `catalog.pdf.download`.
- Serve aggiungere permessi separati per export o reportistica futura.

Finche queste domande non sono chiuse, i default in questo documento sono da considerare la baseline consigliata per l'implementazione.

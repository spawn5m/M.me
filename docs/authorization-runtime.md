# Authorization Runtime Model

Il runtime calcola i permessi effettivi unendo:

- permessi derivati dai ruoli assegnati (`UserRole -> RolePermission -> Permission`)
- grant diretti utente (`UserPermission -> Permission`)

L'aggregazione avviene in `getEffectivePermissions()`: ruoli e permessi vengono deduplicati e ordinati. `POST /api/auth/login` restituisce subito `roles` e `permissions`; `GET /api/auth/me` li ricalcola a ogni chiamata.

## Catalogo permessi

Permission code di sistema attualmente definiti in `backend/src/lib/authorization/permissions.ts`:

```text
dashboard.admin.read
dashboard.client.read
users.read.team
users.read.all
users.create
users.update.team
users.update.all
users.disable
users.assign_manager
users.assign_pricelist
users.super_admin.read
users.super_admin.manage
roles.read
roles.manage
articles.coffins.read
articles.coffins.write
articles.coffins.delete
articles.coffins.import
articles.coffins.upload_image
articles.accessories.read
articles.accessories.write
articles.accessories.delete
articles.accessories.import
articles.marmista.read
articles.marmista.write
articles.marmista.delete
articles.marmista.import
lookups.read
lookups.manage
measures.read
measures.manage
pricelists.sale.read
pricelists.sale.write
pricelists.sale.delete
pricelists.sale.assign
pricelists.sale.preview
pricelists.sale.recalculate
pricelists.purchase.read
pricelists.purchase.write
pricelists.purchase.delete
pricelists.purchase.preview
pricelists.purchase.recalculate
catalog.pdf.read
catalog.pdf.write
client.profile.read
client.password.change
client.catalog.funeral.read
client.catalog.marmista.read
```

## Matrice ruolo -> permessi

Default runtime da `backend/src/lib/authorization/role-defaults.ts`:

Nota: la matrice include anche `users.assign_pricelist` per continuita' di catalogo/default, ma il runtime di assegnazione listini usa oggi `pricelists.sale.assign` per i listini vendita e `pricelists.purchase.write` per i listini acquisto.

| Ruolo | Permessi |
| --- | --- |
| `super_admin` | `dashboard.admin.read`, `users.read.team`, `users.read.all`, `users.create`, `users.update.team`, `users.update.all`, `users.disable`, `users.assign_manager`, `users.assign_pricelist`, `users.super_admin.read`, `users.super_admin.manage`, `roles.read`, `roles.manage`, `articles.coffins.read`, `articles.coffins.write`, `articles.coffins.delete`, `articles.coffins.import`, `articles.coffins.upload_image`, `articles.accessories.read`, `articles.accessories.write`, `articles.accessories.delete`, `articles.accessories.import`, `articles.marmista.read`, `articles.marmista.write`, `articles.marmista.delete`, `articles.marmista.import`, `lookups.read`, `lookups.manage`, `measures.read`, `measures.manage`, `pricelists.sale.read`, `pricelists.sale.write`, `pricelists.sale.delete`, `pricelists.sale.assign`, `pricelists.sale.preview`, `pricelists.sale.recalculate`, `pricelists.purchase.read`, `pricelists.purchase.write`, `pricelists.purchase.delete`, `pricelists.purchase.preview`, `pricelists.purchase.recalculate`, `catalog.pdf.read`, `catalog.pdf.write` |
| `manager` | `dashboard.admin.read`, `users.read.team`, `users.read.all`, `users.create`, `users.update.team`, `users.update.all`, `users.disable`, `users.assign_manager`, `users.assign_pricelist`, `articles.coffins.read`, `articles.coffins.write`, `articles.coffins.delete`, `articles.coffins.import`, `articles.coffins.upload_image`, `articles.accessories.read`, `articles.accessories.write`, `articles.accessories.delete`, `articles.accessories.import`, `articles.marmista.read`, `articles.marmista.write`, `articles.marmista.delete`, `articles.marmista.import`, `lookups.read`, `lookups.manage`, `measures.read`, `measures.manage`, `pricelists.sale.read`, `pricelists.sale.write`, `pricelists.sale.delete`, `pricelists.sale.assign`, `pricelists.sale.preview`, `pricelists.sale.recalculate`, `pricelists.purchase.read`, `pricelists.purchase.write`, `pricelists.purchase.delete`, `pricelists.purchase.preview`, `pricelists.purchase.recalculate`, `catalog.pdf.read`, `catalog.pdf.write` |
| `collaboratore` | `dashboard.admin.read`, `users.read.team`, `users.update.team`, `articles.coffins.read`, `articles.coffins.write`, `articles.coffins.import`, `articles.coffins.upload_image`, `articles.accessories.read`, `articles.accessories.write`, `articles.accessories.import`, `articles.marmista.read`, `articles.marmista.write`, `articles.marmista.import`, `lookups.read`, `measures.read` |
| `impresario_funebre` | `dashboard.client.read`, `client.profile.read`, `client.password.change`, `client.catalog.funeral.read` |
| `marmista` | `dashboard.client.read`, `client.profile.read`, `client.password.change`, `client.catalog.marmista.read` |

## Grant diretti utente

`UserPermission` e' la tabella ponte che collega un utente a un `Permission`, con chiave primaria composta (`userId`, `permissionId`), `grantedByUserId` opzionale e `createdAt`.

I grant diretti sono solo additivi: il runtime fa unione tra permessi di ruolo e permessi utente, non sottrazione. Diventano effettivi alla request successiva, perche' i permessi vengono ricalcolati da database su `GET /api/auth/me` e nel contesto di autorizzazione delle route protette.

Nel workflow amministrativo normale la gestione dei permessi resta role-first dalla sezione `Ruoli`; i grant diretti utente non fanno parte del normale flusso UI, anche se il supporto runtime e le relative route restano disponibili.

## Route map

| Route | Runtime authorization |
| --- | --- |
| `/api/auth/me` | risposta con `user.roles[]` e `permissions[]`, ricalcolati a ogni chiamata |
| `/api/permissions` | `GET` richiede `roles.read`; restituisce il catalogo permessi di sistema in formato `{ data, pagination }` |
| `/api/users` | `GET` richiede `users.read.team` o `users.read.all`; `POST` richiede `users.create`; `GET/:id` riusa `users.read.team` o `users.read.all`; `PUT/:id` richiede `users.update.team` o `users.update.all`; `DELETE/:id` richiede `users.disable` |
| `/api/users/:id/permissions` | `GET` richiede `roles.manage` e (`users.read.team` o `users.read.all`); restituisce `user`, `roles`, `directPermissions`, `effectivePermissions`; `PUT` richiede `roles.manage` e (`users.update.team` o `users.update.all`), sostituisce integralmente i grant diretti utente e rifiuta permission code che il chiamante non possiede gia |
| `/api/roles` | `GET` richiede `roles.read` oppure almeno uno tra `users.create`, `users.update.team`, `users.update.all` per supportare il workflow di assegnazione ruoli nella gestione utenti; `POST` e `DELETE /:id` richiedono `roles.manage` |
| `/api/roles/:id/permissions` | `GET` richiede `roles.read`; restituisce `role` e `permissions`; `PUT` richiede `roles.manage`, sostituisce integralmente i permessi del ruolo, rifiuta i ruoli di sistema e rifiuta permission code che il chiamante non possiede gia |
| `/api/admin/pricelists` | controlli per tipo listino: `pricelists.sale.*` per listini `sale`, `pricelists.purchase.*` per listini `purchase`; `GET /` e `GET /:id` richiedono read; `POST`, `PUT`, `POST /:id/rules`, `DELETE /:id/rules/:ruleId`, `POST /:id/items` richiedono write sul tipo; `DELETE /:id` richiede delete; `GET /:id/preview` richiede preview; `POST /:id/recalculate` richiede recalculate; `PUT /:id/assign/:userId` richiede `pricelists.sale.assign` per sale e `pricelists.purchase.write` per purchase |
| `/api/admin/catalog/pdf` | `GET` richiede `catalog.pdf.read`; `POST` richiede `catalog.pdf.write`; entrambi restano placeholder `501`, ma il guard runtime e' gia basato su permessi espliciti |
| `/api/client/*` | `/me` richiede `client.profile.read`; `/change-password` richiede `client.password.change`; `/catalog/funeral*` richiede `client.catalog.funeral.read`; `/catalog/marmista*` richiede `client.catalog.marmista.read` |

## Scope rules

- `super_admin` e' separato da `users.read.all` e `users.update.all`: le route utenti escludono comunque i super admin se manca `users.super_admin.read`, e ne bloccano modifica/disattivazione se manca `users.super_admin.manage`.
- I listini `purchase` sono separati dai `sale`: ogni route `pricelists` controlla il permission set in base a `priceList.type`, quindi avere i permessi `sale.*` non abilita accesso ai `purchase`.
- I cataloghi client sono limitati al listino assegnato all'utente autenticato: `/api/client/catalog/funeral*` usa solo `funeralPriceListId`, `/api/client/catalog/marmista*` usa solo `marmistaPriceListId`; senza listino assegnato la lista torna vuota con warning e il dettaglio torna `404`.

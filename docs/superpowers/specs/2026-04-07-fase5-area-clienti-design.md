# Design Spec — Fase 5: Area Clienti
**Data:** 2026-04-07
**Progetto:** Mirigliani B2B
**Fase:** 5 di 6

---

## Obiettivo

Vista personalizzata per Impresario Funebre e Marmista: catalogo articoli con prezzi del listino assegnato, dashboard personale, viewer PDF, modifica password.

---

## Architettura

### Approccio scelto: endpoint `/api/client/` dedicati + route `/client/*` frontend

Separazione netta tra area admin e area clienti. Gli endpoint client leggono il listino assegnato direttamente dall'utente in sessione — nessun parametro priceListId accettato dal client.

---

## Backend

### Nuovo file: `backend/src/routes/client.ts`

Registrato sotto `/api/client/` con middleware:
- `fastify.authenticate`
- `fastify.checkRole(['impresario_funebre', 'marmista'])`

| Endpoint | Metodo | Descrizione |
|---|---|---|
| `/api/client/me` | GET | Dati utente + listino assegnato + info manager (nome, email, telefono) |
| `/api/client/catalog/funeral` | GET | Cofani + accessori con prezzi listino assegnato, filtri, paginazione |
| `/api/client/catalog/funeral/:id` | GET | Dettaglio cofano: misure interne, immagine, prezzo |
| `/api/client/catalog/marmista` | GET | Articoli marmisti con prezzi listino assegnato, filtri categoria |
| `/api/client/catalog/marmista/:id` | GET | Dettaglio marmista: accessori collegati, pagina PDF, prezzo |
| `/api/client/change-password` | POST | Cambia password — richiede vecchia password (bcrypt verify) |

### Logica prezzi

Ogni endpoint catalogo:
1. Legge `funeralPriceListId` o `marmistaPriceListId` dall'utente in sessione (via `userId`)
2. Se nessun listino assegnato → restituisce `{ data: [], pagination: {...}, warning: 'Nessun listino assegnato' }`
3. Chiama le funzioni `loadPriceListTree` e `buildComputedItems` (estratte da `pricelists.ts` in un modulo condiviso `lib/priceListUtils.ts`)
4. Non restituisce mai listini di tipo `purchase`

### Aggiornamento `GET /api/auth/me`

Aggiungere `funeralPriceList` e `marmistaPriceList` alla risposta (solo `id` e `name`) — necessario al frontend per il redirect post-login.

### Filtri catalogo funebre

Query string: `category`, `subcategory`, `essence`, `finish`, `color`, `page`, `pageSize`

### Filtri catalogo marmista

Query string: `category`, `page`, `pageSize`

---

## Frontend

### Routing — `App.tsx`

Nuove route protette con `requiredRoles={['impresario_funebre', 'marmista']}`:

```
/client/dashboard
/client/catalog/funeral          (impresario_funebre)
/client/catalog/funeral/:id      (impresario_funebre)
/client/catalog/marmista         (marmista)
/client/catalog/marmista/:id     (marmista)
/client/change-password
```

### Redirect post-login

`LoginPage.tsx` — dopo login controlla i ruoli dall'API `/auth/me`:
- Ruoli `impresario_funebre` o `marmista` → redirect a `/client/dashboard`
- Altri ruoli → redirect a `/admin/dashboard` (comportamento attuale)

### Layout — `AdminLayout` con variante client

`AdminLayout` riceve `variant: 'admin' | 'client'`. In modalità `client`:
- Sidebar mostra: Dashboard, Catalogo (funebre o marmista in base al ruolo), Cambia Password
- Header identico
- Nessun accesso alle voci admin

### Nuove pagine — `frontend/src/pages/client/`

| File | Contenuto |
|---|---|
| `ClientDashboard.tsx` | Listino assegnato, dati manager (nome/email/telefono), link rapido al catalogo |
| `FuneralCatalogPage.tsx` | Griglia cofani + accessori, filtri sidebar, prezzi listino, paginazione |
| `FuneralDetailPage.tsx` | Scheda cofano: misure interne, immagine, prezzo |
| `MarmistaClientCatalogPage.tsx` | Griglia articoli marmisti, filtri categoria, prezzi listino |
| `MarmistaClientDetailPage.tsx` | Dettaglio marmista: accessori collegati, viewer PDF, prezzo |
| `ChangePasswordPage.tsx` | Form: vecchia password + nuova + conferma |

### PDF Viewer

Componente condiviso `frontend/src/components/client/PdfViewer.tsx` basato su `react-pdf`.
- Apre il file alla pagina specificata dal campo `paginaPdf` dell'articolo
- Navigazione pagina avanti/indietro
- PDF serviti dalla cartella `uploads/pdf/` via Fastify static

### API client frontend

Nuovo file `frontend/src/lib/api/client.ts` con tutte le chiamate agli endpoint `/api/client/*`.

---

## Sicurezza

- Nessun parametro `priceListId` accettato dal client — il listino viene sempre letto dalla sessione server
- Tipo `purchase` filtrato server-side, mai nel payload risposta
- `change-password`: bcrypt verify della vecchia password prima di aggiornare
- Accesso granulare: `/client/catalog/funeral` → solo `impresario_funebre`; `/client/catalog/marmista` → solo `marmista`
- `ProtectedRoute` sul frontend + `checkRole` sul backend (doppia protezione)

---

## Testing — `backend/src/routes/__tests__/client.test.ts`

- Impresario funebre vede prezzi del proprio listino assegnato
- Impresario funebre NON può accedere a `/client/catalog/marmista`
- Marmista NON può accedere a `/client/catalog/funeral`
- Listino acquisto (`type: purchase`) non compare mai nella risposta
- `change-password` rifiuta vecchia password errata (401)
- `change-password` aggiorna correttamente con password valida
- Utente senza listino assegnato riceve `warning` e array vuoto (non 500)

---

## Checklist completamento (spec 18.4)

- [ ] Login Impresario Funebre → redirect a `/client/dashboard`, catalogo funebre con prezzi listino assegnato
- [ ] Login Marmista → redirect a `/client/dashboard`, catalogo marmisti con prezzi listino assegnato
- [ ] Filtri catalogo funzionanti per entrambi i ruoli
- [ ] Scheda dettaglio prodotto completa
- [ ] Viewer PDF con apertura alla pagina corretta dell'accessorio
- [ ] Nessuna fuga dati — prezzi acquisto non accessibili lato client
- [ ] Dashboard personale con info manager
- [ ] Modifica password funzionante

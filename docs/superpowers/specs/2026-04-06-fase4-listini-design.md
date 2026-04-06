# Fase 4 — Articoli, Lookup e Listini

**Data:** 2026-04-06
**Branch:** main
**Obiettivo:** Implementare la gestione completa degli articoli (CRUD + import Excel) e il sistema listini prezzi con logica derivata e assegnazione utenti.

---

## 1. Scope

Fase 4 copre tre aree interdipendenti:

1. **Lookup tables** — categorie, sottocategorie e altri attributi degli articoli
2. **Articoli** — CRUD manuale + import batch da Excel (cofani, accessori, marmisti)
3. **Listini** — CRUD listini base/derivati, motore prezzi, assegnazione a utenti

L'approccio è **backend-first per layer**: schema → lookup API → articoli API → listini API → frontend.

---

## 2. Schema DB — Modifiche Prisma

### 2.1 Nuovo enum `ArticleType`

```prisma
enum ArticleType {
  funeral   // cofani + accessori
  marmista
}
```

### 2.2 Modifica `PriceList`

Aggiungere campo:

```prisma
articleType ArticleType
```

- `type: purchase | sale` → visibilità (chi può vedere)
- `articleType: funeral | marmista` → dominio (quale catalogo copre)

### 2.3 Modifica `User`

Aggiungere due FK opzionali per l'assegnazione listini:

```prisma
funeralPriceListId  String?
marmistaPriceListId String?
funeralPriceList    PriceList? @relation("UserFuneralPriceList", fields: [funeralPriceListId], references: [id])
marmistaPriceList   PriceList? @relation("UserMarmistaPriceList", fields: [marmistaPriceListId], references: [id])
```

**Regole assegnazione:**
- Impresario Funebre → può avere `funeralPriceListId` + opzionale `marmistaPriceListId`
- Marmista → solo `marmistaPriceListId`

Nessun'altra modifica allo schema: `PriceListItem`, `PriceRule` e tutti i lookup sono già corretti.

---

## 3. Backend API

### 3.1 Lookup Tables — `/api/admin/lookups`

Un set di endpoint per ciascun tipo di lookup. Tutti richiedono ruolo `manager | super_admin`.

**Tipi lookup:**

| Route base | Entità Prisma |
|---|---|
| `/coffin-categories` | `CoffinCategory` |
| `/coffin-subcategories` | `CoffinSubcategory` |
| `/essences` | `Essence` |
| `/figures` | `Figure` |
| `/colors` | `Color` |
| `/finishes` | `Finish` |
| `/accessory-categories` | `AccessoryCategory` |
| `/accessory-subcategories` | `AccessorySubcategory` |
| `/marmista-categories` | `MarmistaCategory` |

**Operazioni (stesso pattern per tutti):**
```
GET    /api/admin/lookups/:type        → lista paginata { data, pagination }
POST   /api/admin/lookups/:type        → crea { code, label }
PUT    /api/admin/lookups/:type/:id    → aggiorna
DELETE /api/admin/lookups/:type/:id    → elimina (blocca se usato da articoli)
```

### 3.2 Articoli — `/api/admin/articles`

Ruolo richiesto: `manager | super_admin`.

**Cofani:**
```
GET    /api/admin/articles/coffins              → lista paginata + filtri (category, search)
POST   /api/admin/articles/coffins              → crea articolo
GET    /api/admin/articles/coffins/:id          → dettaglio
PUT    /api/admin/articles/coffins/:id          → aggiorna
DELETE /api/admin/articles/coffins/:id          → elimina
POST   /api/admin/articles/coffins/import       → upload Excel → { imported, skipped, errors[] }
POST   /api/admin/articles/coffins/:id/image    → upload immagine (multipart)
```

**Accessori** e **Marmisti**: stesso pattern con rispettivi campi.

**Risposta import:**
```ts
{
  imported: number
  skipped: number
  errors: Array<{ row: number; code: string; reason: string }>
  warnings: Array<{ row: number; code: string; reason: string }> // immagini mancanti
}
```

### 3.3 Listini — `/api/admin/pricelists`

Estende lo stub esistente. Ruolo richiesto: `manager | super_admin`.

```
GET    /api/admin/pricelists                    → lista { id, name, type, articleType, parentId, autoUpdate, _count }
POST   /api/admin/pricelists                    → crea listino base o derivato
GET    /api/admin/pricelists/:id                → dettaglio con regole
PUT    /api/admin/pricelists/:id                → aggiorna metadati e regole
DELETE /api/admin/pricelists/:id                → elimina (blocca se ha figli o utenti assegnati)
POST   /api/admin/pricelists/:id/items          → imposta prezzi (solo listino base)
GET    /api/admin/pricelists/:id/preview        → anteprima prezzi calcolati (non salva)
POST   /api/admin/pricelists/:id/recalculate    → ricalcola snapshot (solo autoUpdate: false)
PUT    /api/admin/pricelists/:id/assign/:userId → assegna listino a utente
```

**Sicurezza prezzi acquisto:** ogni endpoint che restituisce prezzi filtra i listini `type: purchase` se il ruolo non è `manager | super_admin`.

**Calcolo prezzi:** usa `priceEngine.computePrice()` esistente. Per `autoUpdate: true` calcolo dinamico ad ogni lettura; per `autoUpdate: false` i prezzi sono snapshot in `PriceListItem.price`.

---

## 4. Import Excel — Formato

Le immagini devono essere caricate in `uploads/images/` prima dell'import. Il campo immagine nell'Excel è un path relativo a quella cartella.

### 4.1 `cofani.xlsx`

| codice | descrizione | note | misura | categorie | sottocategorie | essenze | figure | colori | finiture | immagine |
|---|---|---|---|---|---|---|---|---|---|---|
| COF001 | Bara rovere classica | Testo libero | M01 | CAT01 | SUB01 | ESS01 | | COL01 | FIN01 | coffins/cof001.jpg |

- `misura`: codice singolo (`CoffinMeasure.code`) — opzionale
- `categorie`, `sottocategorie`, `essenze`, `figure`, `colori`, `finiture`: valori multipli separati da `;`
- `immagine`: path relativo a `uploads/images/` — opzionale, warning se il file non esiste

### 4.2 `accessori.xlsx`

| codice | descrizione | note | categorie | sottocategorie | pagina_pdf | immagine |
|---|---|---|---|---|---|---|
| ACC001 | Crocifisso dorato | | CAT01 | SUB01 | 42 | accessories/acc001.jpg |

### 4.3 `marmisti.xlsx`

| codice | descrizione | note | categorie | prezzo_pubblico | pagina_pdf | accessorio_id |
|---|---|---|---|---|---|---|
| MAR001 | Cippo in granito | | CAT01 | 250.00 | 15 | ACC001 |

- `accessorio_id`: codice di un `AccessoryArticle` già esistente — opzionale
- `prezzo_pubblico`: visibile nel frontend pubblico

### 4.4 Comportamento import

| Situazione | Comportamento |
|---|---|
| Codice articolo già esistente | Upsert (aggiorna) |
| Codice lookup non trovato | `skipped` con messaggio specifico |
| Path immagine senza file corrispondente | Warning (non blocca l'import) |
| Riga con codice mancante | `error` — riga saltata |
| File Excel malformato | Errore 400 con messaggio |

---

## 5. Frontend Admin

### 5.1 Nuove pagine

| Percorso | Componente | Descrizione |
|---|---|---|
| `/admin/lookups/:type` | `LookupPage` | Pagina generica riutilizzabile per tutti i lookup |
| `/admin/articles/coffins` | `CoffinsPage` | Lista + import |
| `/admin/articles/accessories` | `AccessoriesPage` | Lista + import |
| `/admin/articles/marmista` | `MarmistaArticlesPage` | Lista + import |
| `/admin/pricelists` | `PriceListsPage` | Lista listini |
| `/admin/pricelists/:id` | `PriceListDetailPage` | Dettaglio con tab Prezzi e Regole |

### 5.2 Componenti riutilizzati

- `DataTable` — tabelle con paginazione e filtri
- `FormModal` — modal creazione/modifica
- `ConfirmDialog` — conferma eliminazione

### 5.3 Sidebar admin

Aggiungere sezioni:
```
Catalogo
  ├── Cofani
  ├── Accessori
  └── Articoli Marmisti
Lookup
  ├── Categorie Cofani
  ├── Essenze / Figure / Colori / Finiture
  └── Categorie Accessori / Marmisti
Listini
```

### 5.4 Wizard creazione listino

Step 1 — Metadati:
- Nome, tipo (`purchase | sale`), dominio (`funeral | marmista`)
- Scegli: "Da zero" o "Derivato da listino esistente"
- Se derivato: seleziona padre + flag `autoUpdate`

Step 2 — Regole (solo per listini derivati):
- Aggiungi regole: scope (tutti / categoria / sottocategoria), tipo (sconto/maggiorazione), valore (% o assoluto)

### 5.5 Dettaglio listino

Tab **Prezzi**: tabella articoli con prezzo calcolato/snapshot. Bottone "Ricalcola snapshot" visibile solo se `autoUpdate: false`.

Tab **Regole**: lista regole modificabile.

### 5.6 Assegnazione listino a utente

Estendere `UsersPage` (o scheda utente): dropdown per selezionare `funeralPriceList` e `marmistaPriceList` in base al ruolo dell'utente.

---

## 6. Tipi TypeScript condivisi (`shared.ts`)

Aggiungere:

```ts
export type ArticleType = 'funeral' | 'marmista'

export interface AdminPriceList {
  id: string
  name: string
  type: PriceListType
  articleType: ArticleType
  parentId: string | null
  autoUpdate: boolean
  _count: { items: number }
}

export interface AdminLookup {
  id: string
  code: string
  label: string
}

export interface AdminCoffinArticle {
  id: string
  code: string
  description: string
  notes: string | null
  imageUrl: string | null
  measure: AdminLookup | null
  categories: AdminLookup[]
  subcategories: AdminLookup[]
  essences: AdminLookup[]
  figures: AdminLookup[]
  colors: AdminLookup[]
  finishes: AdminLookup[]
}

export interface AdminAccessoryArticle {
  id: string
  code: string
  description: string
  notes: string | null
  imageUrl: string | null
  pdfPage: number | null
  categories: AdminLookup[]
  subcategories: AdminLookup[]
}

export interface AdminMarmistaArticle {
  id: string
  code: string
  description: string
  notes: string | null
  pdfPage: number | null
  publicPrice: number | null
  accessory: AdminLookup | null
  categories: AdminLookup[]
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: Array<{ row: number; code: string; reason: string }>
  warnings: Array<{ row: number; code: string; reason: string }>
}
```

---

## 7. Testing

- **priceEngine.ts**: già coperto (13/13 test), nessuna modifica
- **Route lookup**: happy path CRUD + errore 409 se lookup in uso
- **Route articoli**: happy path CRUD + import valido/invalido
- **Route listini**: CRUD + calcolo prezzo dinamico vs snapshot + blocco prezzi acquisto per ruoli non autorizzati
- **Import Excel**: file valido, codici lookup inesistenti, path immagine mancante, upsert

---

## 8. Checklist completamento Fase 4

- [ ] Migration Prisma applicata (`ArticleType` enum + `User.funeralPriceListId` + `User.marmistaPriceListId` + `PriceList.articleType`)
- [ ] CRUD lookup API funzionante (tutti i tipi)
- [ ] CRUD articoli API (cofani, accessori, marmisti)
- [ ] Import Excel funzionante con validazione lookup e immagini
- [ ] CRUD listini API (base e derivati)
- [ ] Calcolo prezzo dinamico (`autoUpdate: true`) corretto
- [ ] Snapshot ricalcolabile (`autoUpdate: false`)
- [ ] Listino acquisto non visibile a ruoli Collaboratore e inferiori
- [ ] Assegnazione listino a utente funzionante
- [ ] Frontend: pagine lookup, articoli, listini
- [ ] Assegnazione listino visibile nella scheda utente
- [ ] Test API coperti

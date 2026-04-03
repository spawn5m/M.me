# Fase 3 — Back End Area Riservata: Design

**Data:** 2026-04-03  
**Fase:** 3 di 6  
**Approccio:** B — Admin shell + vertical slices (API + UI per dominio)

---

## 1. Scope

Fase 3 implementa:

1. Tutte le **API backend** (route stub 501 → CRUD completi)
2. La **dashboard admin** (`/admin/*`) nel SPA React esistente
3. L'**upload immagini** articoli (multipart via `@fastify/multipart`)
4. L'**upload PDF** catalogo (due PDF distinti: accessori e marmisti)
5. Una **migration Prisma** per aggiungere `type` enum a `PdfCatalog`

**Escluso dalla Fase 3:** logica listini (Fase 4), viste Impresario/Marmista (Fase 5).

---

## 2. Architettura

### 2.1 Backend — Route map

```
/api/auth/*                               ← già completo
/api/users/*                              ← CRUD utenti + assegnazione manager
/api/roles/*                              ← CRUD ruoli + permessi (solo super_admin)
/api/articles/coffins/*                   ← CRUD cofani
/api/articles/coffins/categories/*        ← CRUD lookup CoffinCategory
/api/articles/coffins/subcategories/*     ← CRUD lookup CoffinSubcategory
/api/articles/coffins/essences/*          ← CRUD lookup Essence
/api/articles/coffins/figures/*           ← CRUD lookup Figure
/api/articles/coffins/colors/*            ← CRUD lookup Color
/api/articles/coffins/finishes/*          ← CRUD lookup Finish
/api/articles/accessories/*               ← CRUD accessori
/api/articles/accessories/categories/*    ← CRUD lookup AccessoryCategory
/api/articles/accessories/subcategories/* ← CRUD lookup AccessorySubcategory
/api/articles/marmista/*                  ← CRUD articoli marmisti
/api/articles/marmista/categories/*       ← CRUD lookup MarmistaCategory
/api/uploads/coffins/:id/image            ← upload immagine cofano (multipart)
/api/uploads/accessories/:id/image        ← upload immagine accessorio (multipart)
/api/catalog/pdf?type=accessories|marmista ← GET info + POST upload PDF
```

Ogni route protetta: `fastify.authenticate` + `fastify.checkRole(...)`.  
Il Listino Acquisto (`type: "purchase"`) non è mai esposto a ruoli Impresario/Marmista.

### 2.2 Frontend — Routing

```
/login                    ← pagina login (da creare)
/admin                    ← redirect → /admin/dashboard
/admin/dashboard          ← card riassuntive
/admin/users              ← gestione utenti
/admin/roles              ← gestione ruoli (solo super_admin)
/admin/coffins            ← gestione cofani
/admin/accessories        ← gestione accessori
/admin/marmista           ← gestione articoli marmisti
/admin/catalog            ← upload PDF catalogo (due sezioni)
```

---

## 3. Schema Prisma — Migration

Aggiungere enum `PdfCatalogType` e campo `type` al modello `PdfCatalog`:

```prisma
enum PdfCatalogType {
  accessories
  marmista
}

model PdfCatalog {
  id         String          @id @default(cuid())
  type       PdfCatalogType  @unique   // un solo PDF attivo per tipo
  filePath   String
  fileName   String
  uploadedAt DateTime        @default(now())
}
```

Il constraint `@unique` su `type` garantisce un solo PDF attivo per categoria.

---

## 4. Permessi per ruolo

| Risorsa | super_admin | manager | collaboratore |
|---|---|---|---|
| Utenti — lista | tutti | tutti | solo i propri |
| Utenti — CRUD | ✅ | ✅ (escluso super_admin) | solo i propri |
| Ruoli — CRUD | ✅ | ✗ | ✗ |
| Cofani — CRUD | ✅ | ✅ | ✗ |
| Accessori — CRUD | ✅ | ✅ | ✗ |
| Marmista — CRUD | ✅ | ✅ | ✗ |
| Lookup tables — CRUD | ✅ | ✅ | ✗ |
| Catalog PDF — upload | ✅ | ✅ | ✗ |

---

## 5. API Backend — Pattern e dettagli

### 5.1 Pattern comune

```
GET    /api/{resource}      → { data: [], pagination: { page, pageSize, total } }
POST   /api/{resource}      → body validato Zod → 201 Created
GET    /api/{resource}/:id  → record singolo o 404
PUT    /api/{resource}/:id  → aggiorna, 200 OK
DELETE /api/{resource}/:id  → 204 No Content
```

Errori sempre nel formato: `{ error: string, message: string, statusCode: number }`.

### 5.2 Users (`/api/users`)

- **Filtri GET:** `?role=`, `?isActive=`, `?managerId=`, `?search=` (nome/email)
- **Creazione:** `{ email, password, firstName, lastName, roleIds[], managerId? }`
- **Update:** tutti i campi + `roleIds[]` + `managerId`
- **Delete:** soft delete (`isActive: false`), mai cancellazione fisica
- **Endpoint extra:** `GET /api/users/me/subordinates` → utenti gestiti dal richiedente
- **Sicurezza:** Manager non può modificare Super Admin; Collaboratore non può uscire dal proprio scope

### 5.3 Roles (`/api/roles`) — solo `super_admin`

- Creazione: `{ name, label, permissionIds[] }`
- Ruoli con `isSystem: true` non eliminabili
- `GET /api/roles/:id/permissions` → lista permessi assegnati

### 5.4 Coffins (`/api/articles/coffins`)

- Body include: `{ code, description, notes?, categoryIds[], subcategoryIds[], essenceIds[], figureIds[], colorIds[], finishIds[], measure?: { head, feet, shoulder, height, width, depth } }`
- Relazioni many-to-many gestite via `connect`/`set` Prisma
- **Upload immagine:** `POST /api/uploads/coffins/:id/image` (multipart, campo `file`)
  - Validazione MIME lato server: solo `image/jpeg`, `image/png`, `image/webp`
  - Salvataggio in `uploads/images/coffins/{id}.{ext}`
  - Aggiorna `CoffinArticle.imageUrl`

### 5.5 Accessories (`/api/articles/accessories`)

- Body: `{ code, description, notes?, pdfPage?, categoryIds[], subcategoryIds[] }`
- Upload immagine identico a Coffins → `uploads/images/accessories/`

### 5.6 Marmista (`/api/articles/marmista`)

- Body: `{ code, description, notes?, pdfPage?, publicPrice?, accessoryId?, categoryIds[] }`
- Nessun upload immagine

### 5.7 Catalog PDF (`/api/catalog`)

- `GET /api/catalog/pdf?type=accessories|marmista` → `{ id, type, fileName, uploadedAt }`
- `POST /api/catalog/pdf?type=accessories|marmista` (multipart, campo `file`)
  - MIME: solo `application/pdf`
  - Salvataggio: `uploads/pdf/catalog-{type}.pdf` (sovrascrive il precedente)
  - Upsert su `PdfCatalog` (crea se non esiste, aggiorna se esiste)

---

## 6. Admin Shell (Frontend)

### 6.1 Struttura file

```
frontend/src/
├── pages/
│   ├── LoginPage.tsx
│   └── admin/
│       ├── DashboardPage.tsx
│       ├── UsersPage.tsx
│       ├── RolesPage.tsx
│       ├── CoffinsPage.tsx
│       ├── AccessoriesPage.tsx
│       ├── MarmistaPage.tsx     ← rinominare per evitare conflitto con public
│       └── CatalogPage.tsx
├── components/
│   └── admin/
│       ├── AdminLayout.tsx      ← sidebar + header + outlet
│       ├── AdminSidebar.tsx     ← nav adattiva per ruolo
│       ├── ProtectedRoute.tsx   ← auth guard
│       ├── DataTable.tsx        ← tabella riusabile con paginazione
│       ├── FormModal.tsx        ← modal con form
│       ├── ConfirmDialog.tsx    ← conferma DELETE
│       ├── ImageUpload.tsx      ← drag & drop immagine con preview
│       └── FileUpload.tsx       ← upload PDF
└── context/
    └── AuthContext.tsx          ← user, roles, hasRole(), login(), logout()
```

### 6.2 Design System

Sistema B — Light Professional:
- Sidebar: `#1A2B4A` (navy), testo `#FFFFFF`, voce attiva bordo sinistro oro `#C9A96E`
- Contenuto: background `#F8F7F4`, card `#FFFFFF`
- Font: Playfair Display (heading), Inter (body), JetBrains Mono (codici/prezzi)
- Border radius: 6-8px

### 6.3 AuthContext

```tsx
interface AuthContextValue {
  user: AuthUser | null
  roles: string[]
  isLoading: boolean
  hasRole: (role: string | string[]) => boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}
```

### 6.4 Navigazione sidebar — voci visibili per ruolo

| Voce | super_admin | manager | collaboratore |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Utenti | ✅ | ✅ | ✅ |
| Ruoli | ✅ | ✗ | ✗ |
| Cofani | ✅ | ✅ | ✗ |
| Accessori | ✅ | ✅ | ✗ |
| Articoli Marmisti | ✅ | ✅ | ✗ |
| Catalogo PDF | ✅ | ✅ | ✗ |

---

## 7. Schermate Admin — Dettaglio

### Dashboard (`/admin/dashboard`)
Card con conteggi: utenti attivi, cofani, accessori, articoli marmisti. Nessun dato sensibile.

### Utenti (`/admin/users`)
- `DataTable`: nome, email, ruoli (chip colorati), manager, stato (badge Attivo/Inattivo)
- `FormModal`: nome, cognome, email, password, ruoli (multi-select), manager (select)
- Collaboratore: lista filtrata ai propri subordinati; non può assegnare ruoli superiori al proprio

### Ruoli (`/admin/roles`) — solo super_admin
- Lista ruoli con badge permessi
- `FormModal`: nome, label, checkbox permessi raggruppati per risorsa (`users`, `articles`, `catalog`…)
- Ruoli di sistema: non eliminabili, badge "Sistema"

### Cofani (`/admin/coffins`)
- `DataTable`: codice, descrizione, categorie, thumbnail immagine, azioni
- `FormModal` con 2 tab:
  - **Dati**: codice, descrizione, note + multi-select per ogni campo multiplo + 6 campi misure
  - **Immagine**: `<ImageUpload>` con preview
- Sezione "Valori di riferimento": accordion con una tabella per tipo (categorie, essenze, ecc.), CRUD inline

### Accessori (`/admin/accessories`)
- Identico a Cofani senza misure interne; aggiunge campo "Pagina PDF"

### Articoli Marmisti (`/admin/marmista`)
- `DataTable`: codice, descrizione, prezzo pubblico, categoria
- `FormModal`: codice, descrizione, note, pagina PDF, prezzo pubblico, select "Articolo Accessorio", categorie
- Sezione "Valori di riferimento": categorie marmisti

### Catalogo PDF (`/admin/catalog`)
- Due card affiancate: **Catalogo Accessori** e **Catalogo Marmisti**
- Ogni card: nome file attuale, data upload, bottone "Sostituisci PDF"
- `<FileUpload>`: drag & drop, anteprima nome, conferma prima invio

---

## 8. Ordine di implementazione (vertical slices)

1. **Admin shell** — `AuthContext`, `ProtectedRoute`, `AdminLayout`, `AdminSidebar`, `LoginPage`, componenti condivisi (`DataTable`, `FormModal`, `ConfirmDialog`, `ImageUpload`, `FileUpload`)
2. **Migration Prisma** — `PdfCatalogType` enum + campo `type`
3. **Users** — API `/api/users` + pagina `/admin/users`
4. **Roles** — API `/api/roles` + pagina `/admin/roles`
5. **Coffins** — API `/api/articles/coffins` + lookup routes + upload immagine + pagina `/admin/coffins`
6. **Accessories** — API `/api/articles/accessories` + lookup routes + upload immagine + pagina `/admin/accessories`
7. **Marmista** — API `/api/articles/marmista` + lookup routes + pagina `/admin/marmista`
8. **Catalog PDF** — API `/api/catalog` + pagina `/admin/catalog`

---

## 9. Sicurezza

- Ogni route verifica il ruolo **lato server** — il frontend non è autoritativo
- Il prezzo di acquisto non è mai esposto in endpoint accessibili a Impresario/Marmista
- Upload immagini: validazione MIME server-side (`image/jpeg | image/png | image/webp`)
- Upload PDF: validazione MIME server-side (`application/pdf`)
- Password: mai restituita in nessuna risposta API
- Soft delete utenti: `isActive: false`, i dati restano intatti
- Rate limiting login: già attivo (max 5 in 15 min)

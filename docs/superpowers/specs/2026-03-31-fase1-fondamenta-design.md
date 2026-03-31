# Fase 1 — Fondamenta: Design Spec
**Data:** 2026-03-31
**Progetto:** Mirigliani
**Stato:** Approvato

---

## Obiettivo

Progetto funzionante end-to-end con autenticazione, schema DB completo e routing base.
Nessuna UI definitiva — l'importante è che tutto giri e che le fondamenta reggano le fasi successive.

---

## 1. Struttura Progetto — Monorepo npm workspaces

```
/Users/spawn5m/Documents/DEV/M.me/
├── package.json              ← workspace root
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app.ts
│   │   ├── plugins/
│   │   │   ├── prisma.ts
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── roles.ts
│   │   │   ├── articles/
│   │   │   │   ├── coffins.ts
│   │   │   │   ├── accessories.ts
│   │   │   │   └── marmista.ts
│   │   │   ├── pricelists.ts
│   │   │   ├── catalog.ts
│   │   │   └── public.ts
│   │   ├── lib/
│   │   │   ├── priceEngine.ts
│   │   │   └── priceEngine.test.ts
│   │   └── types/
│   │       └── shared.ts
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   ├── components/
│   │   ├── lib/
│   │   │   └── api.ts
│   │   └── locales/
│   │       └── it.json
│   └── index.html
└── docs/
    └── superpowers/
        └── specs/
```

### Script npm root

```json
{
  "workspaces": ["backend", "frontend"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w backend\" \"npm run dev -w frontend\"",
    "build": "npm run build -w frontend",
    "db:migrate": "npm run db:migrate -w backend",
    "db:seed": "npm run db:seed -w backend"
  }
}
```

---

## 2. Schema Prisma — Completo

Lo schema copre tutte le entità fin dalla Fase 1. Modificarlo dopo è costoso.

### Utenti e Auth

```prisma
model User {
  id           String        @id @default(cuid())
  email        String        @unique
  password     String
  firstName    String
  lastName     String
  isActive     Boolean       @default(true)
  userRoles    UserRole[]
  managers     UserManager[] @relation("UserManaged")
  managing     UserManager[] @relation("UserManager")
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

model UserManager {
  managerId  String
  userId     String
  manager    User @relation("UserManager", fields: [managerId], references: [id], onDelete: Cascade)
  user       User @relation("UserManaged", fields: [userId], references: [id], onDelete: Cascade)
  @@id([managerId, userId])
}

model Role {
  id              String           @id @default(cuid())
  name            String           @unique
  label           String
  isSystem        Boolean          @default(false)
  userRoles       UserRole[]
  rolePermissions RolePermission[]
}

model Permission {
  id              String           @id @default(cuid())
  resource        String
  action          String
  rolePermissions RolePermission[]
  @@unique([resource, action])
}

model UserRole {
  userId String
  roleId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@id([userId, roleId])
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([roleId, permissionId])
}
```

### Articoli Funebri — Cofani

```prisma
model CoffinArticle {
  id            String               @id @default(cuid())
  code          String               @unique
  description   String
  notes         String?
  imageUrl      String?
  categories    CoffinCategory[]
  subcategories CoffinSubcategory[]
  essences      Essence[]
  figures       Figure[]
  colors        Color[]
  finishes      Finish[]
  measure       InternalMeasure?
  priceListItems PriceListItem[]
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
}

model InternalMeasure {
  id        String        @id @default(cuid())
  articleId String        @unique
  article   CoffinArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)
  head      Float
  feet      Float
  shoulder  Float
  height    Float
  width     Float
  depth     Float
}

model CoffinCategory    { id String @id @default(cuid()); code String @unique; label String; articles CoffinArticle[] }
model CoffinSubcategory { id String @id @default(cuid()); code String @unique; label String; articles CoffinArticle[] }
model Essence           { id String @id @default(cuid()); code String @unique; label String; articles CoffinArticle[] }
model Figure            { id String @id @default(cuid()); code String @unique; label String; articles CoffinArticle[] }
model Color             { id String @id @default(cuid()); code String @unique; label String; articles CoffinArticle[] }
model Finish            { id String @id @default(cuid()); code String @unique; label String; articles CoffinArticle[] }
```

### Articoli Funebri — Accessori

```prisma
model AccessoryArticle {
  id            String                @id @default(cuid())
  code          String                @unique
  description   String
  notes         String?
  imageUrl      String?
  pdfPage       Int?
  categories    AccessoryCategory[]
  subcategories AccessorySubcategory[]
  priceListItems PriceListItem[]
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt
}

model AccessoryCategory    { id String @id @default(cuid()); code String @unique; label String; articles AccessoryArticle[] }
model AccessorySubcategory { id String @id @default(cuid()); code String @unique; label String; articles AccessoryArticle[] }
```

### Articoli Marmisti

```prisma
model MarmistaArticle {
  id             String            @id @default(cuid())
  code           String            @unique
  description    String
  notes          String?
  pdfPage        Int?
  publicPrice    Float?
  accessoryId    String?
  accessory      MarmistaArticle?  @relation("MarmistaAccessory", fields: [accessoryId], references: [id])
  accessories    MarmistaArticle[] @relation("MarmistaAccessory")
  categories     MarmistaCategory[]
  priceListItems PriceListItem[]
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
}

model MarmistaCategory { id String @id @default(cuid()); code String @unique; label String; articles MarmistaArticle[] }
```

### Listini

```prisma
enum PriceListType { purchase sale }
enum DiscountType  { percentage absolute }

model PriceList {
  id         String        @id @default(cuid())
  name       String
  type       PriceListType
  parentId   String?
  parent     PriceList?    @relation("PriceListParent", fields: [parentId], references: [id])
  children   PriceList[]   @relation("PriceListParent")
  autoUpdate Boolean       @default(false)
  rules      PriceRule[]
  items      PriceListItem[]
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
}

model PriceRule {
  id            String       @id @default(cuid())
  priceListId   String
  priceList     PriceList    @relation(fields: [priceListId], references: [id], onDelete: Cascade)
  filterType    String?
  filterValue   String?
  discountType  DiscountType
  discountValue Float
}

model PriceListItem {
  id                 String           @id @default(cuid())
  priceListId        String
  priceList          PriceList        @relation(fields: [priceListId], references: [id], onDelete: Cascade)
  coffinArticleId    String?
  coffinArticle      CoffinArticle?   @relation(fields: [coffinArticleId], references: [id])
  accessoryArticleId String?
  accessoryArticle   AccessoryArticle? @relation(fields: [accessoryArticleId], references: [id])
  marmistaArticleId  String?
  marmistaArticle    MarmistaArticle? @relation(fields: [marmistaArticleId], references: [id])
  price              Float
}
```

### PDF Catalogo

```prisma
model PdfCatalog {
  id         String   @id @default(cuid())
  filePath   String
  fileName   String
  uploadedAt DateTime @default(now())
}
```

---

## 3. Autenticazione

### Plugin Fastify (`plugins/auth.ts`)

- `fastify.authenticate` — preHandler, verifica sessione attiva, risponde `401` se assente
- `fastify.checkRole(roles[])` — preHandler factory, verifica ruolo in sessione, risponde `403` se non autorizzato
- La sessione memorizza `{ userId: string, roles: string[] }` — nessuna password

### Endpoint

| Metodo | Path | Auth | Descrizione |
|---|---|---|---|
| `POST` | `/api/auth/login` | No | Login con email + password |
| `POST` | `/api/auth/logout` | Sì | Distrugge la sessione |
| `GET` | `/api/auth/me` | Sì | Restituisce utente corrente (senza password) |

### Regole di sicurezza

- Rate limiting login: **5 tentativi / IP / 15 minuti** (`@fastify/rate-limit`)
- Password: `bcrypt` con `rounds: 12`
- Cookie sessione: `HttpOnly`, `SameSite: Strict`
- Ogni route protetta verifica ruolo server-side — non fidarsi mai del frontend

---

## 4. Route Fastify — Fase 1

Le route non-auth sono **stub** in Fase 1: rispondono `501 Not Implemented` ma hanno già `preHandler` con auth e ruoli corretti. Questo permette di verificare l'intera catena auth senza implementare il CRUD.

> **Nota ruoli:** `manager+` = ruolo `manager` OPPURE `super_admin`. `super_admin` ha accesso a tutto.

```
/api/auth/*                  → implementato completo
/api/users/*                 → stub (authenticate + manager+)
/api/roles/*                 → stub (authenticate + super_admin)
/api/articles/coffins/*      → stub (authenticate + manager+)
/api/articles/accessories/*  → stub (authenticate + manager+)
/api/articles/marmista/*     → stub (authenticate + manager+)
/api/pricelists/*            → stub (authenticate + manager+)
/api/catalog/pdf             → stub (authenticate + manager+)
/api/public/health           → implementato (ping, nessuna auth)
/*                           → @fastify/static → /frontend/dist
```

---

## 5. Seed Interattivo Super Admin

`backend/prisma/seed.ts` — eseguibile con `npm run db:seed`

Flusso:
1. Chiede email e password interattivamente
2. Crea i ruoli di sistema (`super_admin`, `manager`, `collaboratore`, `impresario_funebre`, `marmista`) con `isSystem: true`
3. Crea i permessi base per ogni risorsa/azione
4. Crea il Super Admin con la password hashata
5. È idempotente — skippa se Super Admin già esiste

---

## 6. i18n Frontend

`frontend/src/locales/it.json` configurato con struttura a namespace, valori minimi per Fase 1 (auth + errori), resto vuoto pronto per Fase 2.

`i18next` + `react-i18next` configurati in `frontend/src/main.tsx`. Nessun testo hardcoded nei componenti — tutto tramite `useTranslation()`.

---

## 7. Test

`vitest` configurato in `backend/`. Test scritti **solo per `priceEngine.ts`**:

- Sconto percentuale su tutti gli articoli
- Sconto assoluto su tutti gli articoli
- Sconto filtrato per categoria
- Calcolo ricorsivo su listino derivato da derivato
- `autoUpdate: true` → ricalcola dal padre
- `autoUpdate: false` → restituisce prezzo snapshot
- Listino acquisto non esposto a ruolo non autorizzato

---

## 8. Pre-requisiti da completare prima dell'implementazione

- [ ] Creare DB locale in ServBay: `CREATE USER mirigliani_usr WITH PASSWORD '...'; CREATE DATABASE mirigliani OWNER mirigliani_usr;`
- [ ] Configurare `.env` in `backend/` con `DATABASE_URL` e `SESSION_SECRET`
- [ ] Installare `concurrently` nella root: `npm install -D concurrently` (necessario per `npm run dev`)

---

## 9. Checklist verifica completamento Fase 1

- [ ] `npm run dev` avvia backend (3001) e frontend (5173)
- [ ] `npm run db:migrate` applica lo schema senza errori
- [ ] `npm run db:seed` crea ruoli di sistema e Super Admin
- [ ] `POST /api/auth/login` con credenziali corrette → sessione attiva
- [ ] `POST /api/auth/login` con credenziali errate → `401`
- [ ] `POST /api/auth/login` × 6 dallo stesso IP → `429`
- [ ] `GET /api/auth/me` con sessione → dati utente senza password
- [ ] `GET /api/auth/me` senza sessione → `401`
- [ ] Route stub `/api/users` senza sessione → `401`
- [ ] Route stub `/api/users` con ruolo `impresario_funebre` → `403`
- [ ] Route stub `/api/users` con ruolo `manager` → `501`
- [ ] `npm test` in backend → tutti i test priceEngine passano
- [ ] Frontend React si avvia, `i18next` inizializzato senza errori
- [ ] `tsc --noEmit` senza errori su backend e frontend

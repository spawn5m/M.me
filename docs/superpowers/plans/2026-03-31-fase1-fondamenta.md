# Fase 1 — Fondamenta: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monorepo TypeScript funzionante end-to-end con schema DB completo, autenticazione Fastify v5, route stub con preHandler, seed Super Admin interattivo, priceEngine testato con Vitest, e frontend React con i18n configurato.

**Architecture:** Monorepo npm workspaces (`backend/` + `frontend/`). Backend usa plugin Fastify encapsulati con `fastify-plugin` per Prisma decorator, auth middleware e errorHandler. Route non-auth sono stub con preHandler corretti che verificano sessione e ruolo. priceEngine è un modulo puro testabile senza Fastify.

**Tech Stack:** TypeScript strict, Fastify v5, Prisma v7, PostgreSQL 16, @fastify/secure-session, @fastify/rate-limit, bcrypt, Zod, React 19, Vite, react-router-dom, i18next, react-i18next, axios, Vitest, concurrently, fastify-plugin

---

## Mappa file

| File | Responsabilità |
|---|---|
| `package.json` (root) | Workspace root, script `dev`/`build`/`db:*` |
| `backend/package.json` | Dipendenze backend, script `dev`/`test`/`db:*` |
| `backend/tsconfig.json` | TS strict, CommonJS, target ES2022 |
| `backend/src/app.ts` | Entry point Fastify: registra plugin + route + avvia server |
| `backend/src/plugins/prisma.ts` | Decorator `fastify.prisma` con PrismaClient |
| `backend/src/plugins/errorHandler.ts` | Error handler globale — formato `{ error, message, statusCode }` |
| `backend/src/plugins/auth.ts` | Decorators `fastify.authenticate` e `fastify.checkRole(roles[])` |
| `backend/src/routes/auth.ts` | POST /login, POST /logout, GET /me — implementati |
| `backend/src/routes/public.ts` | GET /health — implementato |
| `backend/src/routes/users.ts` | Stub manager+ |
| `backend/src/routes/roles.ts` | Stub super_admin |
| `backend/src/routes/articles/coffins.ts` | Stub manager+ |
| `backend/src/routes/articles/accessories.ts` | Stub manager+ |
| `backend/src/routes/articles/marmista.ts` | Stub manager+ |
| `backend/src/routes/pricelists.ts` | Stub manager+ |
| `backend/src/routes/catalog.ts` | Stub manager+ |
| `backend/src/lib/priceEngine.ts` | Logica calcolo prezzi — modulo puro |
| `backend/src/lib/priceEngine.test.ts` | Test Vitest priceEngine |
| `backend/src/types/shared.ts` | Tipi condivisi: AuthUser, ApiError, PaginatedResponse, PriceEngine types |
| `backend/prisma/schema.prisma` | Schema DB completo |
| `backend/prisma/seed.ts` | Seed interattivo Super Admin + ruoli sistema |
| `backend/.env` | DATABASE_URL, SESSION_SECRET, PORT (non committato) |
| `frontend/package.json` | Dipendenze frontend (generato da Vite) |
| `frontend/vite.config.ts` | Proxy `/api` → localhost:3001 |
| `frontend/src/main.tsx` | Bootstrap React + i18next |
| `frontend/src/App.tsx` | Router base con una route placeholder |
| `frontend/src/lib/api.ts` | Axios client con baseURL `/api` e withCredentials |
| `frontend/src/locales/it.json` | Stringhe i18n IT |

---

## Task 1: Pre-requisiti DB + Root monorepo

**Files:**
- Create: `package.json` (root)

- [ ] **Step 1: Creare il DB locale in ServBay**

Aprire ServBay → PostgreSQL → apri psql, oppure usa il terminale:

```bash
psql -U postgres
```

```sql
CREATE USER mirigliani_usr WITH PASSWORD 'mirigliani_dev_2026';
CREATE DATABASE mirigliani OWNER mirigliani_usr;
\q
```

Verifica:
```bash
psql -U mirigliani_usr -d mirigliani -c "SELECT current_database();"
```
Output atteso: `current_database: mirigliani`

- [ ] **Step 2: Creare il root package.json**

```json
{
  "name": "mirigliani",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "backend",
    "frontend"
  ],
  "scripts": {
    "dev": "concurrently -n backend,frontend -c blue,green \"npm run dev -w backend\" \"npm run dev -w frontend\"",
    "build": "npm run build -w frontend",
    "db:migrate": "npm run db:migrate -w backend",
    "db:seed": "npm run db:seed -w backend",
    "test": "npm run test -w backend"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 3: Installare concurrently**

```bash
cd /Users/spawn5m/Documents/DEV/M.me
npm install
```

Output atteso: `added N packages`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: aggiungi root monorepo npm workspaces"
```

---

## Task 2: Backend scaffolding

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`

- [ ] **Step 1: Creare la struttura directory backend**

```bash
mkdir -p backend/src/plugins backend/src/routes/articles backend/src/lib backend/src/types backend/prisma
```

- [ ] **Step 2: Creare backend/package.json**

```json
{
  "name": "@mirigliani/backend",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "main": "dist/app.js",
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@fastify/cookie": "^11.0.0",
    "@fastify/multipart": "^9.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "@fastify/secure-session": "^8.0.0",
    "@fastify/static": "^8.0.0",
    "@prisma/client": "^6.0.0",
    "bcrypt": "^5.1.0",
    "dayjs": "^1.11.0",
    "dotenv": "^16.0.0",
    "fastify": "^5.0.0",
    "fastify-plugin": "^5.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.0",
    "@types/node": "^22.0.0",
    "prisma": "^6.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Creare backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Installare le dipendenze backend**

```bash
cd /Users/spawn5m/Documents/DEV/M.me
npm install -w backend
```

- [ ] **Step 5: Inizializzare Prisma**

```bash
cd backend
npx prisma init --datasource-provider postgresql
cd ..
```

Questo crea `backend/prisma/schema.prisma` e `backend/.env`.

- [ ] **Step 6: Aggiornare backend/.env**

Sostituire il contenuto di `backend/.env` con:

```
DATABASE_URL="postgresql://mirigliani_usr:mirigliani_dev_2026@localhost:5432/mirigliani"
SESSION_SECRET="sostituisci-con-stringa-random-min-32-caratteri-sicura"
PORT=3001
NODE_ENV=development
```

Generare SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Incollare l'output come valore di SESSION_SECRET.

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/tsconfig.json backend/prisma/schema.prisma
git commit -m "chore: scaffolding backend TypeScript + Prisma init"
```

> ⚠️ Non committare `backend/.env` — è in `.gitignore`

---

## Task 3: Frontend scaffolding

**Files:**
- Create: `frontend/` (via Vite)
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: Scaffolding con Vite**

```bash
cd /Users/spawn5m/Documents/DEV/M.me
npm create vite@latest frontend -- --template react-ts
```

Rispondere alle eventuali domande: nome `frontend`, framework `React`, variante `TypeScript`.

- [ ] **Step 2: Aggiungere name workspace al frontend/package.json**

Aprire `frontend/package.json` e aggiungere/modificare il campo `name`:

```json
{
  "name": "@mirigliani/frontend",
  ...
}
```

- [ ] **Step 3: Installare dipendenze aggiuntive frontend**

```bash
npm install -w frontend react-router-dom i18next react-i18next axios
```

- [ ] **Step 4: Aggiornare frontend/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

- [ ] **Step 5: Creare cartelle necessarie**

```bash
mkdir -p frontend/src/pages frontend/src/components frontend/src/lib frontend/src/locales
```

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "chore: scaffolding frontend React 19 + Vite + i18next"
```

---

## Task 4: Tipi condivisi

**Files:**
- Create: `backend/src/types/shared.ts`

- [ ] **Step 1: Creare backend/src/types/shared.ts**

```typescript
// Tipi API

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: string[]
  isActive: boolean
}

// Tipi priceEngine

export type PriceListType = 'purchase' | 'sale'
export type DiscountType = 'percentage' | 'absolute'

export interface PriceRule {
  filterType: 'category' | 'subcategory' | null
  filterValue: string | null
  discountType: DiscountType
  discountValue: number
}

export interface PriceListNode {
  type: PriceListType
  autoUpdate: boolean
  rules: PriceRule[]
  parent?: PriceListNode
}

export interface ArticleContext {
  basePrice: number
  categoryCode?: string
  subcategoryCode?: string
}

// Estensione sessione Fastify

declare module '@fastify/secure-session' {
  interface SessionData {
    userId: string
    roles: string[]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/types/shared.ts
git commit -m "feat: aggiungi tipi condivisi shared.ts"
```

---

## Task 5: Schema Prisma completo

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Scrivere il file backend/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Utenti e Auth ───────────────────────────────────────────────────────────

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
  managerId String
  userId    String
  manager   User   @relation("UserManager", fields: [managerId], references: [id], onDelete: Cascade)
  user      User   @relation("UserManaged", fields: [userId], references: [id], onDelete: Cascade)

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
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
}

// ─── Articoli Funebri — Cofani ────────────────────────────────────────────────

model CoffinArticle {
  id             String              @id @default(cuid())
  code           String              @unique
  description    String
  notes          String?
  imageUrl       String?
  categories     CoffinCategory[]
  subcategories  CoffinSubcategory[]
  essences       Essence[]
  figures        Figure[]
  colors         Color[]
  finishes       Finish[]
  measure        InternalMeasure?
  priceListItems PriceListItem[]
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt
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

model CoffinCategory {
  id       String          @id @default(cuid())
  code     String          @unique
  label    String
  articles CoffinArticle[]
}

model CoffinSubcategory {
  id       String          @id @default(cuid())
  code     String          @unique
  label    String
  articles CoffinArticle[]
}

model Essence {
  id       String          @id @default(cuid())
  code     String          @unique
  label    String
  articles CoffinArticle[]
}

model Figure {
  id       String          @id @default(cuid())
  code     String          @unique
  label    String
  articles CoffinArticle[]
}

model Color {
  id       String          @id @default(cuid())
  code     String          @unique
  label    String
  articles CoffinArticle[]
}

model Finish {
  id       String          @id @default(cuid())
  code     String          @unique
  label    String
  articles CoffinArticle[]
}

// ─── Articoli Funebri — Accessori ─────────────────────────────────────────────

model AccessoryArticle {
  id             String                 @id @default(cuid())
  code           String                 @unique
  description    String
  notes          String?
  imageUrl       String?
  pdfPage        Int?
  categories     AccessoryCategory[]
  subcategories  AccessorySubcategory[]
  priceListItems PriceListItem[]
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt
}

model AccessoryCategory {
  id       String             @id @default(cuid())
  code     String             @unique
  label    String
  articles AccessoryArticle[]
}

model AccessorySubcategory {
  id       String             @id @default(cuid())
  code     String             @unique
  label    String
  articles AccessoryArticle[]
}

// ─── Articoli Marmisti ────────────────────────────────────────────────────────

model MarmistaArticle {
  id             String             @id @default(cuid())
  code           String             @unique
  description    String
  notes          String?
  pdfPage        Int?
  publicPrice    Float?
  accessoryId    String?
  accessory      MarmistaArticle?   @relation("MarmistaAccessory", fields: [accessoryId], references: [id])
  accessories    MarmistaArticle[]  @relation("MarmistaAccessory")
  categories     MarmistaCategory[]
  priceListItems PriceListItem[]
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
}

model MarmistaCategory {
  id       String            @id @default(cuid())
  code     String            @unique
  label    String
  articles MarmistaArticle[]
}

// ─── Listini ──────────────────────────────────────────────────────────────────

enum PriceListType {
  purchase
  sale
}

enum DiscountType {
  percentage
  absolute
}

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
  id                 String            @id @default(cuid())
  priceListId        String
  priceList          PriceList         @relation(fields: [priceListId], references: [id], onDelete: Cascade)
  coffinArticleId    String?
  coffinArticle      CoffinArticle?    @relation(fields: [coffinArticleId], references: [id])
  accessoryArticleId String?
  accessoryArticle   AccessoryArticle? @relation(fields: [accessoryArticleId], references: [id])
  marmistaArticleId  String?
  marmistaArticle    MarmistaArticle?  @relation(fields: [marmistaArticleId], references: [id])
  price              Float
}

// ─── PDF Catalogo ─────────────────────────────────────────────────────────────

model PdfCatalog {
  id         String   @id @default(cuid())
  filePath   String
  fileName   String
  uploadedAt DateTime @default(now())
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: schema Prisma completo — tutte le entità Fase 1-6"
```

---

## Task 6: Prima migration DB

**Files:**
- Create: `backend/prisma/migrations/` (generato da Prisma)

- [ ] **Step 1: Caricare le variabili d'ambiente ed eseguire la migration**

```bash
cd backend
npx prisma migrate dev --name init
cd ..
```

Output atteso:
```
Applying migration `20260331000000_init`
Your database is now in sync with your schema.
```

- [ ] **Step 2: Generare il Prisma Client**

```bash
cd backend && npx prisma generate && cd ..
```

- [ ] **Step 3: Verificare le tabelle create**

```bash
cd backend
npx prisma studio
```

Aprire http://localhost:5555 e verificare che tutte le tabelle siano visibili: `User`, `Role`, `Permission`, `CoffinArticle`, `MarmistaArticle`, `PriceList`, ecc.

Chiudere Prisma Studio con Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/migrations/
git commit -m "feat: migration iniziale DB — schema Fase 1"
```

---

## Task 7: Plugin Prisma + errorHandler

**Files:**
- Create: `backend/src/plugins/prisma.ts`
- Create: `backend/src/plugins/errorHandler.ts`

- [ ] **Step 1: Creare backend/src/plugins/prisma.ts**

```typescript
import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const prisma = new PrismaClient()
  await prisma.$connect()

  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})

export default prismaPlugin
```

- [ ] **Step 2: Creare backend/src/plugins/errorHandler.ts**

```typescript
import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'

const errorHandlerPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500
    fastify.log.error(error)
    reply.status(statusCode).send({
      error: error.name ?? 'InternalServerError',
      message: error.message ?? 'Errore interno del server',
      statusCode
    })
  })
})

export default errorHandlerPlugin
```

- [ ] **Step 3: Verificare che TypeScript compili senza errori**

```bash
cd backend && npx tsc --noEmit && cd ..
```

Output atteso: nessun output (= nessun errore)

- [ ] **Step 4: Commit**

```bash
git add backend/src/plugins/
git commit -m "feat: plugin Fastify — prisma decorator + errorHandler"
```

---

## Task 8: Plugin Auth

**Files:**
- Create: `backend/src/plugins/auth.ts`

- [ ] **Step 1: Creare backend/src/plugins/auth.ts**

```typescript
import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    checkRole: (allowedRoles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.session.get('userId')
      if (!userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Sessione non valida o scaduta',
          statusCode: 401
        })
      }
    }
  )

  fastify.decorate(
    'checkRole',
    (allowedRoles: string[]) =>
      async (request: FastifyRequest, reply: FastifyReply) => {
        const roles: string[] = request.session.get('roles') ?? []
        const hasRole = allowedRoles.some((r) => roles.includes(r))
        if (!hasRole) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Ruolo non autorizzato per questa operazione',
            statusCode: 403
          })
        }
      }
  )
})

export default authPlugin
```

- [ ] **Step 2: Verificare che TypeScript compili**

```bash
cd backend && npx tsc --noEmit && cd ..
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/plugins/auth.ts
git commit -m "feat: plugin auth — decorator authenticate + checkRole"
```

---

## Task 9: Route auth + app.ts

**Files:**
- Create: `backend/src/routes/auth.ts`
- Create: `backend/src/app.ts`

- [ ] **Step 1: Creare backend/src/routes/auth.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password obbligatoria')
})

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/login
  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: 15 * 60 * 1000 // 15 minuti
      }
    }
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsed.error.errors[0].message,
        statusCode: 400
      })
    }

    const { email, password } = parsed.data

    const user = await fastify.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    })

    if (!user || !user.isActive) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Credenziali non valide',
        statusCode: 401
      })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Credenziali non valide',
        statusCode: 401
      })
    }

    const roles = user.userRoles.map((ur) => ur.role.name)

    request.session.set('userId', user.id)
    request.session.set('roles', roles)

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        isActive: user.isActive
      }
    })
  })

  // POST /api/auth/logout
  fastify.post('/logout', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    request.session.delete()
    return reply.send({ success: true })
  })

  // GET /api/auth/me
  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const userId = request.session.get('userId')!
    const roles = request.session.get('roles') ?? []

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Utente non trovato',
        statusCode: 401
      })
    }

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        isActive: user.isActive
      }
    })
  })
}

export default authRoutes
```

- [ ] **Step 2: Creare backend/src/app.ts**

```typescript
import 'dotenv/config'
import Fastify from 'fastify'
import fastifySecureSession from '@fastify/secure-session'
import fastifyRateLimit from '@fastify/rate-limit'

import prismaPlugin from './plugins/prisma'
import errorHandlerPlugin from './plugins/errorHandler'
import authPlugin from './plugins/auth'

import authRoutes from './routes/auth'
import publicRoutes from './routes/public'
import usersRoutes from './routes/users'
import rolesRoutes from './routes/roles'
import coffinsRoutes from './routes/articles/coffins'
import accessoriesRoutes from './routes/articles/accessories'
import marmistaRoutes from './routes/articles/marmista'
import pricelistsRoutes from './routes/pricelists'
import catalogRoutes from './routes/catalog'

const app = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined
  }
})

const start = async () => {
  // Session
  await app.register(fastifySecureSession, {
    sessionName: 'session',
    secret: process.env.SESSION_SECRET!,
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    }
  })

  // Rate limit globale
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute'
  })

  // Plugin interni
  await app.register(prismaPlugin)
  await app.register(errorHandlerPlugin)
  await app.register(authPlugin)

  // Route
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(publicRoutes, { prefix: '/api/public' })
  await app.register(usersRoutes, { prefix: '/api/users' })
  await app.register(rolesRoutes, { prefix: '/api/roles' })
  await app.register(coffinsRoutes, { prefix: '/api/articles/coffins' })
  await app.register(accessoriesRoutes, { prefix: '/api/articles/accessories' })
  await app.register(marmistaRoutes, { prefix: '/api/articles/marmista' })
  await app.register(pricelistsRoutes, { prefix: '/api/pricelists' })
  await app.register(catalogRoutes, { prefix: '/api/catalog' })

  const port = Number(process.env.PORT) || 3001
  await app.listen({ port, host: '127.0.0.1' })
  app.log.info(`Backend in ascolto su http://127.0.0.1:${port}`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

> **Nota:** `pino-pretty` è opzionale per il log colorato in dev. Aggiungerlo se non è già una dipendenza transitiva: `npm install -w backend -D pino-pretty`

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/auth.ts backend/src/app.ts
git commit -m "feat: route auth (login/logout/me) + app.ts Fastify"
```

---

## Task 10: Route public/health + stub

**Files:**
- Create: `backend/src/routes/public.ts`
- Create: `backend/src/routes/users.ts`
- Create: `backend/src/routes/roles.ts`
- Create: `backend/src/routes/articles/coffins.ts`
- Create: `backend/src/routes/articles/accessories.ts`
- Create: `backend/src/routes/articles/marmista.ts`
- Create: `backend/src/routes/pricelists.ts`
- Create: `backend/src/routes/catalog.ts`

- [ ] **Step 1: Creare backend/src/routes/public.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'

const publicRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() })
  })
}

export default publicRoutes
```

- [ ] **Step 2: Creare backend/src/routes/users.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin']))

  fastify.get('/', async (_request, reply) => {
    return reply.status(501).send({
      error: 'NotImplemented',
      message: 'Endpoint disponibile dalla Fase 3',
      statusCode: 501
    })
  })

  fastify.post('/', async (_request, reply) => {
    return reply.status(501).send({
      error: 'NotImplemented',
      message: 'Endpoint disponibile dalla Fase 3',
      statusCode: 501
    })
  })

  fastify.get('/:id', async (_request, reply) => {
    return reply.status(501).send({
      error: 'NotImplemented',
      message: 'Endpoint disponibile dalla Fase 3',
      statusCode: 501
    })
  })

  fastify.put('/:id', async (_request, reply) => {
    return reply.status(501).send({
      error: 'NotImplemented',
      message: 'Endpoint disponibile dalla Fase 3',
      statusCode: 501
    })
  })

  fastify.delete('/:id', async (_request, reply) => {
    return reply.status(501).send({
      error: 'NotImplemented',
      message: 'Endpoint disponibile dalla Fase 3',
      statusCode: 501
    })
  })
}

export default usersRoutes
```

- [ ] **Step 3: Creare backend/src/routes/roles.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'

const rolesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['super_admin']))

  fastify.get('/', async (_request, reply) => {
    return reply.status(501).send({
      error: 'NotImplemented',
      message: 'Endpoint disponibile dalla Fase 3',
      statusCode: 501
    })
  })

  fastify.post('/', async (_request, reply) => {
    return reply.status(501).send({
      error: 'NotImplemented',
      message: 'Endpoint disponibile dalla Fase 3',
      statusCode: 501
    })
  })
}

export default rolesRoutes
```

- [ ] **Step 4: Creare backend/src/routes/articles/coffins.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'

const coffinsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin']))

  fastify.get('/', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.post('/', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.get('/:id', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.put('/:id', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.delete('/:id', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
}

export default coffinsRoutes
```

- [ ] **Step 5: Creare backend/src/routes/articles/accessories.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'

const accessoriesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin']))

  fastify.get('/', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.post('/', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.get('/:id', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.put('/:id', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.delete('/:id', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
}

export default accessoriesRoutes
```

- [ ] **Step 6: Creare backend/src/routes/articles/marmista.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'

const marmistaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin']))

  fastify.get('/', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.post('/', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.get('/:id', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.put('/:id', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.delete('/:id', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
}

export default marmistaRoutes
```

- [ ] **Step 7: Creare backend/src/routes/pricelists.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'

const pricelistsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin']))

  fastify.get('/', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 4', statusCode: 501 })
  })
  fastify.post('/', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 4', statusCode: 501 })
  })
}

export default pricelistsRoutes
```

- [ ] **Step 8: Creare backend/src/routes/catalog.ts**

```typescript
import { FastifyPluginAsync } from 'fastify'

const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin']))

  fastify.get('/pdf', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
  fastify.post('/pdf', async (_request, reply) => {
    return reply.status(501).send({ error: 'NotImplemented', message: 'Endpoint disponibile dalla Fase 3', statusCode: 501 })
  })
}

export default catalogRoutes
```

- [ ] **Step 9: Verificare che TypeScript compili**

```bash
cd backend && npx tsc --noEmit && cd ..
```

- [ ] **Step 10: Commit**

```bash
git add backend/src/routes/
git commit -m "feat: route stub con preHandler auth/ruolo + public health"
```

---

## Task 11: Seed interattivo Super Admin

**Files:**
- Create: `backend/prisma/seed.ts`

- [ ] **Step 1: Creare backend/prisma/seed.ts**

```typescript
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { createInterface } from 'readline/promises'

const prisma = new PrismaClient()

const SYSTEM_ROLES = [
  { name: 'super_admin', label: 'Super Admin' },
  { name: 'manager', label: 'Manager' },
  { name: 'collaboratore', label: 'Collaboratore' },
  { name: 'impresario_funebre', label: 'Impresario Funebre' },
  { name: 'marmista', label: 'Marmista' }
]

const BASE_PERMISSIONS = [
  { resource: 'users', action: 'read' },
  { resource: 'users', action: 'write' },
  { resource: 'users', action: 'delete' },
  { resource: 'roles', action: 'read' },
  { resource: 'roles', action: 'write' },
  { resource: 'roles', action: 'delete' },
  { resource: 'articles', action: 'read' },
  { resource: 'articles', action: 'write' },
  { resource: 'articles', action: 'delete' },
  { resource: 'pricelists', action: 'read' },
  { resource: 'pricelists', action: 'write' },
  { resource: 'pricelists', action: 'delete' },
  { resource: 'pricelists.purchase', action: 'read' },
  { resource: 'catalog', action: 'read' },
  { resource: 'catalog', action: 'write' }
]

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  console.log('\n🌱 Seed Mirigliani — Setup iniziale\n')

  // Ruoli di sistema
  console.log('→ Creazione ruoli di sistema...')
  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: { name: role.name, label: role.label, isSystem: true }
    })
  }
  console.log('✓ Ruoli creati:', SYSTEM_ROLES.map((r) => r.name).join(', '))

  // Permessi base
  console.log('→ Creazione permessi base...')
  for (const perm of BASE_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: {},
      create: perm
    })
  }
  console.log('✓ Permessi creati:', BASE_PERMISSIONS.length)

  // Controlla se Super Admin esiste già
  const existingSuperAdmin = await prisma.user.findFirst({
    include: { userRoles: { include: { role: true } } },
    where: {
      userRoles: { some: { role: { name: 'super_admin' } } }
    }
  })

  if (existingSuperAdmin) {
    console.log(`\n✓ Super Admin già presente: ${existingSuperAdmin.email}`)
    console.log('  Seed completato — nessuna azione richiesta.\n')
    rl.close()
    return
  }

  // Creazione interattiva Super Admin
  console.log('\n→ Creazione Super Admin iniziale\n')
  const email = await rl.question('  Email Super Admin: ')

  if (!email.includes('@')) {
    console.error('✗ Email non valida')
    rl.close()
    process.exit(1)
  }

  const password = await rl.question('  Password (min 8 caratteri): ')
  const confirm = await rl.question('  Conferma password: ')
  rl.close()

  if (password.length < 8) {
    console.error('✗ Password troppo corta (minimo 8 caratteri)')
    process.exit(1)
  }

  if (password !== confirm) {
    console.error('✗ Le password non coincidono')
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'super_admin' }
  })

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      userRoles: {
        create: { roleId: superAdminRole!.id }
      }
    }
  })

  console.log(`\n✓ Super Admin creato: ${user.email}`)
  console.log('  Seed completato.\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 2: Eseguire il seed e verificare**

```bash
npm run db:seed
```

Inserire email e password quando richiesto.
Output atteso:
```
✓ Ruoli creati: super_admin, manager, collaboratore, impresario_funebre, marmista
✓ Permessi creati: 15
✓ Super Admin creato: <email inserita>
  Seed completato.
```

- [ ] **Step 3: Verificare che il seed sia idempotente**

```bash
npm run db:seed
```

Output atteso:
```
✓ Super Admin già presente: <email>
  Seed completato — nessuna azione richiesta.
```

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "feat: seed interattivo Super Admin + ruoli e permessi di sistema"
```

---

## Task 12: priceEngine TDD

**Files:**
- Create: `backend/src/lib/priceEngine.ts`
- Create: `backend/src/lib/priceEngine.test.ts`
- Create: `backend/vitest.config.ts`

- [ ] **Step 1: Creare backend/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  }
})
```

- [ ] **Step 2: Scrivere i test PRIMA dell'implementazione**

Creare `backend/src/lib/priceEngine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applyRules, computePrice, canSeePurchaseList } from './priceEngine'
import type { PriceRule, PriceListNode, ArticleContext } from '../types/shared'

describe('applyRules', () => {
  it('applica sconto percentuale su tutti gli articoli (nessun filtro)', () => {
    const rules: PriceRule[] = [
      { filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 }
    ]
    const article: ArticleContext = { basePrice: 100 }
    expect(applyRules(100, rules, article)).toBe(90)
  })

  it('applica sconto assoluto su tutti gli articoli (nessun filtro)', () => {
    const rules: PriceRule[] = [
      { filterType: null, filterValue: null, discountType: 'absolute', discountValue: 15 }
    ]
    const article: ArticleContext = { basePrice: 100 }
    expect(applyRules(100, rules, article)).toBe(85)
  })

  it('applica sconto solo ad articoli della categoria corrispondente', () => {
    const rules: PriceRule[] = [
      { filterType: 'category', filterValue: 'CAT-A', discountType: 'percentage', discountValue: 20 }
    ]
    const inCategory: ArticleContext = { basePrice: 100, categoryCode: 'CAT-A' }
    const outCategory: ArticleContext = { basePrice: 100, categoryCode: 'CAT-B' }
    expect(applyRules(100, rules, inCategory)).toBe(80)
    expect(applyRules(100, rules, outCategory)).toBe(100) // nessuna modifica
  })

  it('non scende sotto zero con sconto assoluto eccesivo', () => {
    const rules: PriceRule[] = [
      { filterType: null, filterValue: null, discountType: 'absolute', discountValue: 200 }
    ]
    const article: ArticleContext = { basePrice: 100 }
    expect(applyRules(100, rules, article)).toBe(0)
  })
})

describe('computePrice', () => {
  it('autoUpdate false → restituisce il prezzo statico snapshot senza applicare regole', () => {
    const node: PriceListNode = {
      type: 'sale',
      autoUpdate: false,
      rules: [
        { filterType: null, filterValue: null, discountType: 'percentage', discountValue: 50 }
      ]
    }
    const article: ArticleContext = { basePrice: 100 }
    const staticPrice = 75 // valore snapshot salvato in DB
    expect(computePrice(node, article, staticPrice)).toBe(75)
  })

  it('autoUpdate true + nessun parent → applica regole al basePrice', () => {
    const node: PriceListNode = {
      type: 'sale',
      autoUpdate: true,
      rules: [
        { filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 }
      ]
    }
    const article: ArticleContext = { basePrice: 200 }
    expect(computePrice(node, article)).toBe(180)
  })

  it('autoUpdate true + parent → calcolo ricorsivo: applica regole al prezzo del padre', () => {
    const parent: PriceListNode = {
      type: 'sale',
      autoUpdate: true,
      rules: [
        { filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 }
      ]
    }
    const child: PriceListNode = {
      type: 'sale',
      autoUpdate: true,
      rules: [
        { filterType: null, filterValue: null, discountType: 'percentage', discountValue: 5 }
      ],
      parent
    }
    // base 200 → padre applica -10% = 180 → figlio applica -5% = 171
    const article: ArticleContext = { basePrice: 200 }
    expect(computePrice(child, article)).toBeCloseTo(171)
  })

  it('calcolo ricorsivo su listino derivato da derivato (3 livelli)', () => {
    const grandparent: PriceListNode = {
      type: 'sale', autoUpdate: true,
      rules: [{ filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 }]
    }
    const parent: PriceListNode = {
      type: 'sale', autoUpdate: true,
      rules: [{ filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 }],
      parent: grandparent
    }
    const child: PriceListNode = {
      type: 'sale', autoUpdate: true,
      rules: [{ filterType: null, filterValue: null, discountType: 'percentage', discountValue: 10 }],
      parent
    }
    // 1000 → -10% = 900 → -10% = 810 → -10% = 729
    const article: ArticleContext = { basePrice: 1000 }
    expect(computePrice(child, article)).toBeCloseTo(729)
  })
})

describe('canSeePurchaseList', () => {
  it('super_admin può vedere il listino acquisto', () => {
    expect(canSeePurchaseList(['super_admin'])).toBe(true)
  })

  it('manager può vedere il listino acquisto', () => {
    expect(canSeePurchaseList(['manager'])).toBe(true)
  })

  it('collaboratore NON può vedere il listino acquisto', () => {
    expect(canSeePurchaseList(['collaboratore'])).toBe(false)
  })

  it('impresario_funebre NON può vedere il listino acquisto', () => {
    expect(canSeePurchaseList(['impresario_funebre'])).toBe(false)
  })

  it('marmista NON può vedere il listino acquisto', () => {
    expect(canSeePurchaseList(['marmista'])).toBe(false)
  })
})
```

- [ ] **Step 3: Eseguire i test per verificare che falliscano**

```bash
cd backend && npm test && cd ..
```

Output atteso: tutti i test falliscono con `Cannot find module './priceEngine'` o errori di import.

- [ ] **Step 4: Implementare backend/src/lib/priceEngine.ts**

```typescript
import type { PriceRule, PriceListNode, ArticleContext } from '../types/shared'

/**
 * Applica le regole di sconto ad un prezzo base.
 * Le regole senza filtro si applicano a tutti gli articoli.
 * Le regole con filtro si applicano solo agli articoli con il campo corrispondente.
 * Più regole vengono applicate in sequenza.
 */
export function applyRules(
  basePrice: number,
  rules: PriceRule[],
  article: Pick<ArticleContext, 'categoryCode' | 'subcategoryCode'>
): number {
  let price = basePrice

  for (const rule of rules) {
    const matches =
      rule.filterType === null ||
      (rule.filterType === 'category' && article.categoryCode === rule.filterValue) ||
      (rule.filterType === 'subcategory' && article.subcategoryCode === rule.filterValue)

    if (!matches) continue

    if (rule.discountType === 'percentage') {
      price = price * (1 - rule.discountValue / 100)
    } else {
      price = price - rule.discountValue
    }
  }

  return Math.max(0, price)
}

/**
 * Calcola il prezzo effettivo per un articolo dato un nodo del listino.
 *
 * - autoUpdate: false → restituisce staticPrice (snapshot salvato in DB)
 * - autoUpdate: true  → calcola ricorsivamente dal padre applicando le regole
 *
 * @param node       Nodo listino con eventuale parent
 * @param article    Contesto articolo (basePrice + filtri categoria)
 * @param staticPrice Prezzo snapshot (usato solo se autoUpdate: false)
 */
export function computePrice(
  node: PriceListNode,
  article: ArticleContext,
  staticPrice?: number
): number {
  if (!node.autoUpdate) {
    return staticPrice ?? article.basePrice
  }

  // autoUpdate: true — calcola ricorsivamente dal padre
  let parentPrice: number
  if (node.parent) {
    parentPrice = computePrice(node.parent, article)
  } else {
    parentPrice = article.basePrice
  }

  return applyRules(parentPrice, node.rules, article)
}

/**
 * Verifica se un set di ruoli ha accesso al listino acquisto.
 * Solo manager e super_admin possono vedere i prezzi di acquisto.
 */
export function canSeePurchaseList(roles: string[]): boolean {
  return roles.some((r) => r === 'manager' || r === 'super_admin')
}
```

- [ ] **Step 5: Eseguire i test per verificare che passino**

```bash
cd backend && npm test && cd ..
```

Output atteso:
```
✓ backend/src/lib/priceEngine.test.ts (13)
  ✓ applyRules (4)
  ✓ computePrice (4)
  ✓ canSeePurchaseList (5)

Test Files  1 passed (1)
Tests       13 passed (13)
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/ backend/vitest.config.ts
git commit -m "feat: priceEngine TDD — applyRules, computePrice, canSeePurchaseList (13 test)"
```

---

## Task 13: Frontend i18n + App.tsx + api.ts

**Files:**
- Create: `frontend/src/locales/it.json`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1: Creare frontend/src/locales/it.json**

```json
{
  "nav": {
    "home": "Home",
    "ourStory": "La Nostra Storia",
    "whereWeAre": "Dove Siamo",
    "funeralHomes": "Per le Imprese Funebri",
    "marmistas": "Per i Marmisti",
    "reservedArea": "Area Riservata"
  },
  "auth": {
    "login": "Accedi",
    "logout": "Esci",
    "email": "Email",
    "password": "Password",
    "loginButton": "Accedi"
  },
  "errors": {
    "unauthorized": "Accesso non autorizzato",
    "forbidden": "Non hai i permessi per questa operazione",
    "notFound": "Pagina non trovata",
    "serverError": "Errore interno del server"
  },
  "home": {},
  "catalog": {},
  "ourStory": {},
  "whereWeAre": {}
}
```

- [ ] **Step 2: Sostituire frontend/src/main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import it from './locales/it.json'
import App from './App.tsx'
import './index.css'

i18n.use(initReactI18next).init({
  lng: 'it',
  fallbackLng: 'it',
  resources: {
    it: { translation: it }
  },
  interpolation: {
    escapeValue: false
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Sostituire frontend/src/App.tsx**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function PlaceholderPage({ name }: { name: string }) {
  const { t } = useTranslation()
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>{name}</h1>
      <p style={{ color: '#666' }}>Pagina disponibile dalla Fase 2.</p>
      <p><a href="/">{t('nav.home')}</a></p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlaceholderPage name="Home" />} />
        <Route path="/storia" element={<PlaceholderPage name="La Nostra Storia" />} />
        <Route path="/dove-siamo" element={<PlaceholderPage name="Dove Siamo" />} />
        <Route path="/imprese-funebri" element={<PlaceholderPage name="Per le Imprese Funebri" />} />
        <Route path="/marmisti" element={<PlaceholderPage name="Per i Marmisti" />} />
        <Route path="/area-riservata" element={<PlaceholderPage name="Area Riservata" />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Creare frontend/src/lib/api.ts**

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default api
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: frontend React base — i18n it, routing placeholder, api client"
```

---

## Task 14: Verifica finale end-to-end

- [ ] **Step 1: Avviare backend e frontend**

```bash
npm run dev
```

Output atteso:
- Backend: `Backend in ascolto su http://127.0.0.1:3001`
- Frontend: `VITE v5.x.x  ready in Xms → Local: http://localhost:5173/`

- [ ] **Step 2: Verificare health endpoint**

```bash
curl http://localhost:3001/api/public/health
```

Output atteso: `{"status":"ok","timestamp":"2026-..."}`

- [ ] **Step 3: Verificare login con credenziali corrette**

```bash
curl -c cookies.txt -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<EMAIL-SUPER-ADMIN>","password":"<PASSWORD>"}'
```

Output atteso: `{"user":{"id":"...","email":"...","firstName":"Super","lastName":"Admin","roles":["super_admin"],"isActive":true}}`

- [ ] **Step 4: Verificare /me con sessione attiva**

```bash
curl -b cookies.txt http://localhost:3001/api/auth/me
```

Output atteso: `{"user":{"id":"...","roles":["super_admin"],...}}`

> Nota: il campo `password` NON deve apparire nella risposta.

- [ ] **Step 5: Verificare 401 su /me senza sessione**

```bash
curl http://localhost:3001/api/auth/me
```

Output atteso: `{"error":"Unauthorized","message":"Sessione non valida o scaduta","statusCode":401}`

- [ ] **Step 6: Verificare che route stub con sessione super_admin → 501**

```bash
curl -b cookies.txt http://localhost:3001/api/users
```

Output atteso: `{"error":"NotImplemented","message":"Endpoint disponibile dalla Fase 3","statusCode":501}`

- [ ] **Step 7: Verificare 401 su route stub senza sessione**

```bash
curl http://localhost:3001/api/users
```

Output atteso: `{"error":"Unauthorized",...,"statusCode":401}`

- [ ] **Step 8: Verificare logout**

```bash
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3001/api/auth/logout
curl -b cookies.txt http://localhost:3001/api/auth/me
```

Output atteso dopo logout: `{"error":"Unauthorized",...}`

- [ ] **Step 9: Verificare TypeScript senza errori**

```bash
cd backend && npx tsc --noEmit && cd ..
cd frontend && npx tsc --noEmit && cd ..
```

Output atteso: nessun errore.

- [ ] **Step 10: Verificare test priceEngine**

```bash
npm test
```

Output atteso: `Tests 13 passed (13)`

- [ ] **Step 11: Verificare frontend nel browser**

Aprire http://localhost:5173 — deve mostrare la pagina placeholder "Home".
Navigare a http://localhost:5173/area-riservata — deve mostrare "Area Riservata".
La console del browser non deve mostrare errori i18n.

- [ ] **Step 12: Pulizia e commit finale**

```bash
rm -f cookies.txt
git status
```

Se ci sono file modificati non ancora committati:

```bash
git add -A
git commit -m "chore: verifica finale Fase 1 completata"
```

- [ ] **Step 13: Aggiornare CLAUDE.md — sezione Fase corrente**

Aprire `CLAUDE.md` e aggiornare:

```markdown
## Fase corrente

- [x] Fase 0 — Setup & Skill
- [x] Fase 1 — Fondamenta
- [ ] Fase 2 — Front End Pubblico
...

## Branch attivo

develop → phase/2-frontend-pubblico
```

```bash
git add CLAUDE.md
git commit -m "docs: aggiorna CLAUDE.md — Fase 1 completata, Fase 2 attiva"
```

---

## Checklist completamento Fase 1

- [ ] `npm run dev` avvia backend (3001) e frontend (5173) senza errori
- [ ] `npm run db:migrate` applicata senza errori
- [ ] `npm run db:seed` crea ruoli + Super Admin; idempotente al secondo run
- [ ] `GET /api/public/health` → `200 {"status":"ok"}`
- [ ] `POST /api/auth/login` con credenziali corrette → `200` con utente (senza password)
- [ ] `POST /api/auth/login` con credenziali errate → `401`
- [ ] `GET /api/auth/me` con sessione → `200` con utente (senza password)
- [ ] `GET /api/auth/me` senza sessione → `401`
- [ ] `GET /api/users` senza sessione → `401`
- [ ] `GET /api/users` con sessione super_admin → `501`
- [ ] `npm test` → 13 test priceEngine passano
- [ ] `tsc --noEmit` senza errori su backend e frontend
- [ ] Frontend React si avvia su :5173, i18next inizializzato senza errori in console

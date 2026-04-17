# CLAUDE.md — Mirigliani Project

Guida comportamento Claude Code. Leggi ogni sessione prima di scrivere codice.

---

## Progetto

Sito B2B per **Mirigliani** — grossista forniture funebri e arte sacra, Sardegna.
Sedi: Villamar e Sassari.
Clienti: Impresari funebri e Marmisti.

---

## Stack

| Layer       | Tecnologia                       |
| ----------- | -------------------------------- |
| Linguaggio  | TypeScript (strict mode)         |
| Backend     | Fastify v5                       |
| ORM         | Prisma v7 + PostgreSQL 16        |
| Frontend    | React 19 + Vite + TypeScript     |
| Stile       | Tailwind CSS v4                  |
| Validazione | Zod (backend e frontend)         |
| Auth        | @fastify/secure-session + bcrypt |
| Test        | Vitest                           |
| i18n        | i18next + react-i18next          |

---

## Struttura progetto

```
/
├── backend/
│   ├── src/
│   │   ├── app.ts              ← entry point Fastify
│   │   ├── routes/             ← un file per dominio (auth, users, articles, ...)
│   │   ├── plugins/            ← auth middleware, errorHandler, ...
│   │   ├── lib/                ← logica business (priceEngine, ...)
│   │   └── types/              ← tipi TypeScript condivisi
│   └── prisma/
│       ├── schema.prisma
│       ├── seed.ts
│       └── seed-data/          ← file Excel non committati
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── locales/            ← file i18n JSON
│       └── lib/                ← API client, utils
└── uploads/
    ├── images/coffins/
    ├── images/accessories/
    └── pdf/
```

---

## Convenzioni codice

### TypeScript

- Sempre `strict: true` in tsconfig
- Nessun `any` — usare `unknown` e type guard se necessario
- Tipi condivisi backend/frontend in `backend/src/types/shared.ts`
- Preferire `interface` per oggetti, `type` per union e utility types

### Naming

- File: `kebab-case.ts`
- Componenti React: `PascalCase.tsx`
- Funzioni e variabili: `camelCase`
- Costanti: `SCREAMING_SNAKE_CASE`
- Tabelle Prisma: `PascalCase` (es. `CoffinArticle`)
- Colonne DB: `camelCase` (Prisma default)

### API

- Route base: `/api/`
- Route pubbliche: `/api/public/`
- Liste sempre paginate: `{ data: [], pagination: {} }`
- Errori: `{ error: string, message: string, statusCode: number }`
- Codici errore: sezione 22 documento specifiche

### Componenti React

- Un componente per file
- Props tipizzate con `interface`
- No props drilling oltre 2 livelli — Context o stato locale
- Testi UI via `useTranslation()` — mai hardcoded

---

## Regole critiche

### NON fare mai

- `console.log` in produzione — usare `app.log` Fastify (Pino)
- SQL raw salvo Prisma non supporti nativamente
- Esporre prezzi acquisto in endpoint pubblici o ruoli Impresario/Marmista
- Restituire password in risposta API
- Committare `.env`, Excel seed, o file `uploads/`

### Sicurezza

- Verificare ruolo utente in OGNI route protetta — no trust frontend
- Rate limiting login: max 5 tentativi per IP in 15 minuti
- Upload: validare tipo MIME server-side, non solo estensione
- Input utente validato con Zod prima del DB

### Listini — logica prezzi

- Motore prezzi: `backend/src/lib/priceEngine.ts`
- Ogni modifica richiede test Vitest
- `autoUpdate: true` → calcolo dinamico ricorsivo da listino padre
- `autoUpdate: false` → prezzo snapshot statico in DB
- Listino Acquisto (`type: "purchase"`) → solo Manager e Super Admin

---

## Design System — DUALE

> ⚠️ Due design system distinti. Applicare quello corretto per ogni componente.

### Sistema A — Dark Editorial (HOME ONLY)

Solo `frontend/src/pages/HomePage.tsx` e sotto-componenti.
Riferimento: `DESIGN.md` root progetto.

| Token                       | Valore                                                     |
| --------------------------- | ---------------------------------------------------------- |
| Background pagina           | `#0A1628` (navy quasi nero)                                |
| Background footer           | `#070F1C` (più scuro della pagina)                         |
| Background sezione location | `#0D1E35`                                                  |
| Testo headline              | `#FFFFFF`                                                  |
| Testo body                  | `#8A9BB5`                                                  |
| Accento                     | `#C9A96E` (oro — solo bordi bottoni e label)               |
| Divisori                    | `#1E2D45` (1px, appena visibili)                           |
| Font heading                | Playfair Display Black, ALL CAPS, ~130px, line-height 0.88 |
| Font body                   | Inter 300-400, 15px, line-height 1.6                       |
| Font label/bottoni          | Inter 500, ALL CAPS, letter-spacing 0.15em                 |
| Bottoni                     | Outlined, 0px border-radius (SHARP), bordo 1.5px           |
| Bottoni primari             | Bordo + testo `#C9A96E`, fill trasparente                  |
| Bottoni secondari           | Bordo + testo `#FFFFFF`, fill trasparente                  |
| Border radius globale       | **0px — nessuno, mai**                                     |
| Immagini hero               | Cut-out flottante su scuro                                 |
| Immagini sezioni 2-3        | Rettangolo dark flush al bordo pagina, blend con sfondo    |

**Layout Home — struttura alternata:**

- Sezione 1 Hero: testo LEFT 45% + immagine cut-out RIGHT 55%
- Sezione 2: testo LEFT 42% + rettangolo dark RIGHT 58% (flush right edge)
- Sezione 3: rettangolo dark LEFT 55% (flush left edge) + testo RIGHT 45%
- Sezione 4: strip due location affiancate, linea gold verticale al centro
- Navbar: trasparente, wordmark `MIRIGLIANI`, bottone `AREA RISERVATA` outlined gold
- Footer: `#070F1C`, linea gold 1px in cima, 3 colonne

---

### Sistema B — Light Professional (TUTTE LE ALTRE PAGINE)

Tutto tranne `HomePage.tsx`.
Riferimento: `DESIGN2.md` root progetto (esportato da Stitch).

| Token                 | Valore                          |
| --------------------- | ------------------------------- |
| Background            | `#F8F7F4` (bianco caldo)        |
| Surface (card, modal) | `#FFFFFF`                       |
| Primary               | `#1A2B4A` (navy)                |
| Primary Light         | `#2C4A7C`                       |
| Accento               | `#C9A96E` (oro)                 |
| Testo primario        | `#1A1A1A`                       |
| Testo secondario      | `#6B7280`                       |
| Bordi                 | `#E5E0D8`                       |
| Font heading          | Playfair Display                |
| Font body             | Inter                           |
| Font codici/prezzi    | JetBrains Mono                  |
| Border radius         | 6-8px                           |
| Ombre                 | `0 2px 8px rgba(26,43,74,0.08)` |

---

## Transizione Dark → Light

Home dark, pagine interne light. Transizione via:

```tsx
// frontend/src/App.tsx
// La Navbar sulla Home usa variante dark (testo bianco, sfondo trasparente)
// Le navbar delle pagine interne usano variante light (sfondo bianco, testo navy)

<Navbar variant={location.pathname === "/" ? "dark" : "light"} />
```

`Navbar` accetta prop `variant: 'dark' | 'light'`. No due Navbar separate.

---

## Skills attive

- **UI UX Pro Max** — attiva per tutte richieste UI/UX
  - **Home**: stack `react`, stile `dark editorial luxury`, palette dark sopra
  - **Pagine interne**: stack `react`, stile `professional B2B minimal`, palette light sopra

---

## MCP attivi

- **21st.dev Magic** — componenti React UI professionali
- **Context7** — docs live Fastify v5, Prisma v7, React, Zod
- **Prisma MCP** — schema e query assistance
- **Sequential Thinking** — logica complessa (listini, permessi)
- **PostgreSQL** — query dirette DB locale

---

## Fase corrente

> **Aggiornare ad ogni cambio di fase**

- [x] Fase 0 — Setup & Skill
- [x] Fase 1 — Fondamenta
- [x] Fase 2 — Front End Pubblico
- [x] Fase 3 — Back End Area Riservata
- [x] Fase 4 — Listini
- [x] Fase 6 — Deploy VPS ← completato 2026-04-16

---

## Branch attivo

```
main (deploy attivo su VPS mirigliani.me)
```

> Aggiornare con branch corrente ad ogni sessione.

---

## Avvio sessione — checklist

> Eseguire ogni volta che si apre Claude Code sul progetto.

```
1. Leggi CLAUDE.md             ← questo file
2. Leggi DESIGN.md             ← design system dark (solo Home)
3. Leggi DESIGN2.md            ← design system light (pagine interne)
4. Controlla "Fase corrente" e "Branch attivo" qui sotto
```

---

## Note sessione

> Annotare decisioni prese durante sessione corrente non ancora nel documento specifiche.

-
# CLAUDE.md — Mirigliani Project

Questo file guida il comportamento di Claude Code per l'intero progetto.
Leggilo all'inizio di ogni sessione prima di scrivere codice.

---

## Progetto

Sito web B2B per **Mirigliani** — grossista di forniture funebri e marmi in Sardegna.
Due sedi: Villamar e Sassari.
Clienti: Impresari funebri e Marmisti professionisti.

---

## Stack

| Layer | Tecnologia |
|---|---|
| Linguaggio | TypeScript (strict mode) |
| Backend | Fastify v5 |
| ORM | Prisma v7 + PostgreSQL 16 |
| Frontend | React 19 + Vite + TypeScript |
| Stile | Tailwind CSS v4 |
| Validazione | Zod (backend e frontend) |
| Auth | @fastify/secure-session + bcrypt |
| Test | Vitest |
| i18n | i18next + react-i18next |

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
- Tipi condivisi tra backend e frontend in `backend/src/types/shared.ts`
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
- Sempre risposta paginata per liste: `{ data: [], pagination: {} }`
- Errori sempre nel formato: `{ error: string, message: string, statusCode: number }`
- Vedere sezione 22 del documento di specifiche per i codici errore

### Componenti React
- Un componente per file
- Props sempre tipizzate con `interface`
- Nessun props drilling oltre 2 livelli — usare Context o stato locale
- Testi UI sempre tramite `useTranslation()` di i18next — mai hardcoded

---

## Regole critiche

### NON fare mai
- `console.log` in produzione — usare `app.log` di Fastify (Pino)
- SQL raw a meno che Prisma non lo supporti nativamente per quella query
- Esporre prezzi di acquisto in endpoint pubblici o accessibili a ruoli Impresario/Marmista
- Restituire la password dell'utente in nessuna risposta API
- Committare file `.env`, file Excel seed, o file nella cartella `uploads/`

### Sicurezza
- Verificare il ruolo dell'utente in OGNI route protetta — non fidarsi del frontend
- Rate limiting attivo sul login: max 5 tentativi per IP in 15 minuti
- Upload: validare tipo MIME lato server, non solo estensione
- Input utente sempre validato con Zod prima di toccare il DB

### Listini — logica prezzi
- Il motore di calcolo prezzi è in `backend/src/lib/priceEngine.ts`
- Ogni modifica al motore richiede test Vitest corrispondenti
- Flag `autoUpdate: true` → calcolo dinamico ricorsivo da listino padre
- Flag `autoUpdate: false` → prezzo snapshot salvato staticamente in DB
- Listino Acquisto (`type: "purchase"`) → visibile SOLO a Manager e Super Admin

---

## Design System — DUALE

> ⚠️ Il progetto ha due design system distinti. Applicare quello corretto per ogni componente.

### Sistema A — Dark Editorial (HOME ONLY)

Usato **esclusivamente** per `frontend/src/pages/HomePage.tsx` e i suoi sotto-componenti.
Riferimento: `DESIGN-home-dark.md` nella root del progetto.

| Token | Valore |
|---|---|
| Background pagina | `#0A1628` (navy quasi nero) |
| Background footer | `#070F1C` (più scuro della pagina) |
| Background sezione location | `#0D1E35` |
| Testo headline | `#FFFFFF` |
| Testo body | `#8A9BB5` |
| Accento | `#C9A96E` (oro — solo per bordi bottoni e label) |
| Divisori | `#1E2D45` (1px, appena visibili) |
| Font heading | Playfair Display Black, ALL CAPS, ~130px, line-height 0.88 |
| Font body | Inter 300-400, 15px, line-height 1.6 |
| Font label/bottoni | Inter 500, ALL CAPS, letter-spacing 0.15em |
| Bottoni | Outlined, 0px border-radius (SHARP), bordo 1.5px |
| Bottoni primari | Bordo + testo `#C9A96E`, fill trasparente |
| Bottoni secondari | Bordo + testo `#FFFFFF`, fill trasparente |
| Border radius globale | **0px — nessuno, mai** |
| Immagini hero | Cut-out flottante su scuro |
| Immagini sezioni 2-3 | Rettangolo dark flush al bordo pagina, blend con sfondo |

**Layout Home — struttura alternata:**
- Sezione 1 Hero: testo LEFT 45% + immagine cut-out RIGHT 55%
- Sezione 2: testo LEFT 42% + rettangolo dark RIGHT 58% (flush right edge)
- Sezione 3: rettangolo dark LEFT 55% (flush left edge) + testo RIGHT 45%
- Sezione 4: strip due location affiancate, linea gold verticale al centro
- Navbar: trasparente, wordmark `MIRIGLIANI`, bottone `AREA RISERVATA` outlined gold
- Footer: `#070F1C`, linea gold 1px in cima, 3 colonne

---

### Sistema B — Light Professional (TUTTE LE ALTRE PAGINE)

Usato per tutto tranne `HomePage.tsx`.
Riferimento: `DESIGN.md` nella root del progetto (esportato da Stitch).

| Token | Valore |
|---|---|
| Background | `#F8F7F4` (bianco caldo) |
| Surface (card, modal) | `#FFFFFF` |
| Primary | `#1A2B4A` (navy) |
| Primary Light | `#2C4A7C` |
| Accento | `#C9A96E` (oro) |
| Testo primario | `#1A1A1A` |
| Testo secondario | `#6B7280` |
| Bordi | `#E5E0D8` |
| Font heading | Playfair Display |
| Font body | Inter |
| Font codici/prezzi | JetBrains Mono |
| Border radius | 6-8px |
| Ombre | `0 2px 8px rgba(26,43,74,0.08)` |

---

## Transizione Dark → Light

La Home è dark, tutte le pagine interne sono light. La transizione avviene tramite:

```tsx
// frontend/src/App.tsx
// La Navbar sulla Home usa variante dark (testo bianco, sfondo trasparente)
// Le navbar delle pagine interne usano variante light (sfondo bianco, testo navy)

<Navbar variant={location.pathname === '/' ? 'dark' : 'light'} />
```

Il componente `Navbar` deve accettare una prop `variant: 'dark' | 'light'` e renderizzare gli stili appropriati. Non usare due Navbar separate.

---

## Skills attive

- **UI UX Pro Max** — attiva per tutte le richieste UI/UX
  - Per la **Home**: stack `react`, stile `dark editorial luxury`, palette dark sopra
  - Per le **pagine interne**: stack `react`, stile `professional B2B minimal`, palette light sopra

---

## Plugin attivi

- **Superpowers** — framework metodologico obbligatorio per tutto lo sviluppo
  - Installazione: `/plugin marketplace add obra/superpowers-marketplace` → `/plugin install superpowers@superpowers-marketplace`
  - **Attivare con `/using-superpowers` all'inizio di ogni sessione**
  - `/superpowers:brainstorm` — prima di iniziare qualsiasi fase o feature complessa
  - `/superpowers:write-plan` — per task multi-file (migrazioni, nuove route, refactoring)
  - `/superpowers:execute-plan` — per eseguire il piano con subagent e code review integrata

### Quando usare Superpowers per questo progetto

| Situazione | Comando |
|---|---|
| Inizio di ogni fase | `/superpowers:brainstorm` |
| Nuova entità Prisma + migration + API + frontend | `/superpowers:write-plan` |
| Implementazione motore listini (Fase 4) | `/superpowers:brainstorm` poi `/superpowers:write-plan` |
| Qualsiasi task che tocca più di 3 file | `/superpowers:write-plan` |
| Dopo approvazione del piano | `/superpowers:execute-plan` |

---

## MCP attivi

- **21st.dev Magic** — componenti React UI professionali
- **Context7** — documentazione live Fastify v5, Prisma v7, React, Zod
- **Prisma MCP** — schema e query assistance
- **Sequential Thinking** — per logica complessa (listini, permessi)
- **PostgreSQL** — query dirette al DB locale

---

## Fase corrente

> **Aggiornare questa sezione ad ogni cambio di fase**

- [ ] Fase 0 — Setup & Skill
- [x] Fase 1 — Fondamenta
- [x] Fase 2 — Front End Pubblico
- [x] Fase 3 — Back End Area Riservata
- [x] Fase 4 — Listini
- [ ] Fase 5 — Area Clienti
- [x] Fase 6 — Deploy VPS ← completato 2026-04-16

---

## Branch attivo

```
main (deploy attivo su VPS mirigliani.me)
```

> Aggiornare con il branch corrente ad ogni sessione.

---

## Avvio sessione — checklist

> Eseguire questi comandi **ogni volta** che si apre Claude Code sul progetto.

```
1. /using-superpowers          ← attiva il framework metodologico
2. Leggi CLAUDE.md             ← questo file
3. Leggi DESIGN.md             ← design system light (pagine interne)
4. Leggi DESIGN-home-dark.md   ← design system dark (solo Home)
5. Controlla "Fase corrente" e "Branch attivo" qui sotto
```

---

## Note sessione

> Usare questa sezione per annotare decisioni prese durante la sessione corrente
> che non sono ancora nel documento di specifiche.

-

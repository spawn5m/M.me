# Fase 2 — Front End Pubblico: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sito pubblico Mirigliani completo — Home dark, pagine interne light, cataloghi con API + mock fallback, form contatto con email reale.

**Architecture:** Shell-first: tokens → Navbar/Footer → Home dark → pagine interne light → backend pubblico. Componenti React convertiti da `docs/stitch/`. Hook con fallback automatico a mock data se DB vuoto.

**Tech Stack:** React 19, Vite, TypeScript strict, Tailwind CSS v4, Zod, react-router-dom, Leaflet, Fastify v5, Nodemailer, Vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-04-01-fase2-frontend-design.md`

---

### Task 1: Setup — Tailwind v4 + Font + Test tooling

**Files:** `frontend/package.json`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/src/index.css`

- [ ] Installa dipendenze frontend:
  ```bash
  cd frontend && npm install tailwindcss @tailwindcss/vite
  npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/coverage-v8
  npm install leaflet react-leaflet @types/leaflet
  ```
- [ ] Aggiorna `vite.config.ts` — aggiungi plugin Tailwind:
  ```ts
  import tailwindcss from '@tailwindcss/vite'
  plugins: [react(), tailwindcss()]
  ```
- [ ] Sostituisci `frontend/src/index.css` con token Tailwind v4 (sistema dark + light) e import font Google.
- [ ] Aggiorna `frontend/index.html`: titolo `Mirigliani`, lang `it`, link Google Fonts (Newsreader, Inter, JetBrains Mono).
- [ ] Aggiungi script test in `package.json`: `"test": "vitest run"`.
- [ ] Verifica: `npm run dev` avvia senza errori.
- [ ] `git commit -m "feat: Tailwind v4 tokens + font + test tooling"`

---

### Task 2: Navbar + Footer

**Files:** `components/layout/Navbar.tsx`, `FooterDark.tsx`, `FooterLight.tsx`, `App.tsx`

- [ ] Scrivi test `Navbar.test.tsx`: variant `dark` → sfondo trasparente, CTA outlined; variant `light` → bg bianco, CTA filled.
- [ ] Implementa `Navbar.tsx` con prop `variant: 'dark' | 'light'`. Riferimento: `docs/stitch/catalog_per_le_imprese_funebri_v2/code.html` per light, `docs/stitch/mirigliani_home_unified_header_footer/code.html` per dark.
- [ ] Implementa `FooterDark.tsx` (sfondo `#070F1C`) e `FooterLight.tsx`.
- [ ] Aggiorna `App.tsx`: `<Navbar variant={location.pathname === '/' ? 'dark' : 'light'} />`.
- [ ] Test passa → `git commit -m "feat: Navbar duale + Footer"`

---

### Task 3: Home Page dark

**Files:** `pages/HomePage.tsx`, `components/home/HeroDark.tsx`, `AlternatingSectionRight.tsx`, `AlternatingSectionLeft.tsx`, `LocationStrip.tsx`

- [ ] Converti `docs/stitch/mirigliani_home_unified_header_footer/code.html` in componenti React. Sistema dark: sfondo `#071325`, Inter 900, bottoni outlined gold `#C9A96E`, 0px radius.
- [ ] Assembla `HomePage.tsx`: Hero → Sezione2 → Sezione3 → LocationStrip → FooterDark.
- [ ] Test render: HomePage monta senza errori, contiene wordmark "MIRIGLIANI".
- [ ] `git commit -m "feat: HomePage dark"`

---

### Task 4: Mock data + Hooks catalogo

**Files:** `src/lib/mock-data.ts`, `src/hooks/useCoffins.ts`, `useAccessories.ts`, `useMarmista.ts`, `useCeabis.ts`

- [ ] Scrivi test `useCoffins.test.ts`: se API ritorna array vuoto, hook restituisce mock data.
- [ ] Crea `mock-data.ts` con 4 articoli per ogni categoria (cofani, accessori, marmisti, ceabis) — nessun campo `purchasePrice`.
- [ ] Implementa hook: chiamata `GET /api/public/{resource}` con axios, fallback automatico su mock se `data.length === 0` o errore.
- [ ] Test passa → `git commit -m "feat: mock data + catalog hooks"`

---

### Task 5: Catalog components

**Files:** `components/catalog/ProductCard.tsx`, `ProductGrid.tsx`, `FilterBar.tsx`, `Paginator.tsx`, `ProductModal.tsx`

- [ ] Riferimento visivo: `docs/stitch/catalog_per_le_imprese_funebri_v2/code.html` e `catalog_product_detail_overlay/code.html`.
- [ ] Test `FilterBar.test.tsx`: cambio categoria chiama `onFilter` con valore corretto.
- [ ] Test `ProductModal.test.tsx`: mostra tabella misure se `internalMeasures` presente, nasconde se assente.
- [ ] Implementa componenti. `ProductCard` mostra codice in JetBrains Mono, badge categoria, hover ring gold. `ProductModal` overlay con misure 2×3.
- [ ] Test passano → `git commit -m "feat: catalog shared components"`

---

### Task 6: Pagine interne

**Files:** `pages/ImpreseFunebrePage.tsx`, `MarmistiPage.tsx`, `NostraStoriaPage.tsx`, `DoveSiamoPage.tsx`

- [ ] **ImpreseFunebrePage**: sezione cofani/accessori (FilterBar + ProductGrid + ProductModal) + sezione Ceabis. Riferimento: `catalog_per_le_imprese_funebri_v2`.
- [ ] **MarmistiPage**: griglia con prezzo pubblico in evidenza (JetBrains Mono gold). Riferimento: `catalogo_marmisti_rimozione_etichetta_offerta_2`.
- [ ] **NostraStoriaPage**: layout narrativo 5/12 + 7/12, strip sedi. Riferimento: `la_nostra_storia_versione_semplificata`.
- [ ] **DoveSiamoPage**: cards sedi + mappa Leaflet + `ContactForm` con validazione Zod. Riferimento: `dove_siamo_sedi_allineate`.
- [ ] Test render per ogni pagina (monta senza errori).
- [ ] `git commit -m "feat: pagine interne light"`

---

### Task 7: Backend — Nodemailer + endpoint pubblici

**Files:** `backend/src/lib/mailer.ts`, `backend/src/routes/public.ts`

- [ ] Installa: `cd backend && npm install nodemailer @types/nodemailer`
- [ ] Test `mailer.test.ts`: `sendContactEmail` chiama `transporter.sendMail` con nome/email/messaggio.
- [ ] Implementa `mailer.ts`: transporter da env `SMTP_HOST/PORT/USER/PASS`, funzione `sendContactEmail`.
- [ ] Espandi `public.ts` con tutti gli endpoint (coffins, accessories, marmista, ceabis, contact). Nessun endpoint espone `purchasePrice`. Rate limit `POST /contact`: 3/ora per IP.
- [ ] Test endpoint con Vitest + supertest: shape risposta lista `{ data, pagination }`, dettaglio senza `purchasePrice`, contact valida Zod.
- [ ] Aggiungi variabili env in `.env.example`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_EMAIL_TO`.
- [ ] Test passano → `git commit -m "feat: backend pubblico + Nodemailer"`

---

### Task 8: i18n + polish finale

**Files:** `frontend/src/locales/it.json`

- [ ] Completa tutte le chiavi i18n usate nelle pagine (home, catalog, ourStory, whereWeAre, contact).
- [ ] Verifica responsività mobile su viewport 390px.
- [ ] Verifica transizione dark→light fluida (click da Home a pagina interna).
- [ ] `git commit -m "feat: Fase 2 completata — front end pubblico"`

# Fase 2 — Front End Pubblico: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sito pubblico Mirigliani completo — Home dark, pagine interne light, cataloghi con API + mock fallback, form contatto con email reale.

**Architecture:** Shell-first: tokens → Navbar/Footer → Home dark → pagine interne light → backend pubblico. Componenti React convertiti da `docs/stitch/`. Hook con fallback automatico a mock data se DB vuoto.

**Tech Stack:** React 19, Vite, TypeScript strict, Tailwind CSS v4, Zod, react-router-dom, Leaflet, Fastify v5, Nodemailer, Vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-04-01-fase2-frontend-design.md`

**Stato:** ✅ COMPLETATA — commit finale `b0e8851` (2026-04-03)

---

### Task 1: Setup — Tailwind v4 + Font + Test tooling ✅
commit: `4445219`

- [x] Installa dipendenze frontend
- [x] Aggiorna `vite.config.ts` — aggiungi plugin Tailwind
- [x] Sostituisci `frontend/src/index.css` con token Tailwind v4 (sistema dark + light) e import font Google
- [x] Aggiorna `frontend/index.html`: titolo `Mirigliani`, lang `it`, link Google Fonts
- [x] Aggiungi script test in `package.json`
- [x] Verifica: `npm run dev` avvia senza errori

---

### Task 2: Navbar + Footer ✅
commit: `74171a4`

- [x] Implementa `Navbar.tsx` con prop `variant: 'dark' | 'light'`
- [x] Implementa `FooterDark.tsx` e `FooterLight.tsx`
- [x] Aggiorna `App.tsx`

**Deviazione:** Navbar active gold (link corrente evidenziato in oro) aggiunto in `73aca12` oltre quanto pianificato.

---

### Task 3: Home Page dark ✅
commit: `3771d08`

- [x] Converti prototipo in componenti React, sistema dark
- [x] Assembla `HomePage.tsx`
- [x] Bottoni con animazione btn-5 (fill inset + outline animato) aggiunti in `b0e8851`

**Deviazione:** Animazioni avanzate bottoni (btn-home-white, btn-home-gold) aggiunte in fase di polish.

---

### Task 4: Mock data + Hooks catalogo ✅
commit: `f8eede5`

- [x] Crea `mock-data.ts` con articoli per ogni categoria
- [x] Implementa hook con fallback automatico su mock

---

### Task 5: Catalog components ✅
commit: `2fa0d53`, poi refactor in `73aca12` e `b0e8851`

- [x] `ProductCard.tsx` — codice JetBrains Mono, hover ring gold
- [x] `ProductGrid.tsx` — con prop `columns: 3|4` aggiunta in `b0e8851`
- [x] `FilterBar.tsx`
- [x] `Paginator.tsx`
- [x] `ProductModal.tsx` — redesign completo in `b0e8851`: layout 2/3 immagine + 1/3 dati 2×2, navigazione prev/next con tastiera, griglia 4 colonne per caratteristiche e misure

**Deviazione significativa:** ProductModal completamente riprogettato rispetto al piano originale (overlay semplice → layout strutturato con navigazione). AccessoriesView aggiunto come componente separato (split PDF view).

---

### Task 6: Pagine interne ✅
commit: `5fdcebc`, `09d82e1`, `b0e8851`

- [x] `ImpreseFunebrePage.tsx` — cofani a 4 colonne, tab accessori/cofani
- [x] `MarmistiPage.tsx`
- [x] `NostraStoriaPage.tsx` — card valori animate (hover border gold, scale, linea estesa)
- [x] `DoveSiamoPage.tsx` — sezione contatti split 2 colonne (orari ritiro + form in card)

**Deviazione:** Sezione Ceabis rimossa da ImpreseFunebrePage (era pianificata, eliminata per scelta di prodotto). OffertaMeseCard aggiunto in MarmistiPage.

---

### Task 7: Backend — Nodemailer + endpoint pubblici ✅
commit: `135eb2f`

- [x] Implementa `mailer.ts`
- [x] Espandi `public.ts` con endpoint catalogo e contact
- [x] Nessun endpoint espone `purchasePrice`
- [x] Rate limit `POST /contact`

---

### Task 8: i18n + polish finale ✅
commit: `89d92ba`, `b0e8851`

- [x] Completa tutte le chiavi i18n — zero testi hardcoded a fine fase
- [x] Messaggi Zod ContactForm localizzati via factory `createContactSchema(t)`
- [x] Label misure, giorni settimana, popup Leaflet, testi narrativi tutti in `it.json`
- [x] Animazioni: card valori NostraStoriaPage, hover immagine placeholder, bottoni modal

---

## Note post-completamento

**Aggiunto oltre piano:**
- `AccessoriesView` con split PDF viewer
- `OffertaMeseCard`
- Animazioni bottoni btn-5 (Home) e transition-colors (pagine interne)
- ProductModal redesign completo con navigazione prev/next e tastiera
- NostraStoriaPage: animazioni hover card valori e immagine placeholder
- DoveSiamoPage: orari di ritiro con dotted leader, form in card animata

**Rimosso rispetto piano:**
- Sezione Ceabis da ImpreseFunebrePage (decisione di prodotto)

**CLAUDE.md aggiornare:** Fase 2 ✅, branch attivo → `phase/3-backend`

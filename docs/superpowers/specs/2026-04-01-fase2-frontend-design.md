# Fase 2 — Front End Pubblico: Design Spec
**Data:** 2026-04-01
**Approvato da:** utente

---

## 1. Obiettivo

Implementare il sito pubblico completo di Mirigliani — primo deliverable visibile al cliente. Tutte le pagine pubbliche, navigazione funzionante, form contatto con email reale, cataloghi con API reali + mock fallback.

---

## 2. Design System

### Sistema Dark — Home (`DESIGN.md`)
| Token | Valore |
|---|---|
| Background | `#071325` |
| Surface | `#142032` |
| Surface High | `#1f2a3d` |
| Testo primario | `#d7e3fc` |
| Testo secondario | `#8A9BB5` |
| Oro/Accento | `#C9A96E` |
| Border radius | `0px` — sharp ovunque |
| Font headline | Inter 900, ALL CAPS, ~130px, line-height 0.88 |
| Font body | Inter 300-400, 15px, line-height 1.6 |
| Font label | Inter 500, ALL CAPS, letter-spacing 0.15em |
| Bottoni | Outlined only, 0px radius, bordo gold o white |

### Sistema Light — Pagine interne (`DESIGN2.md`)
| Token | Valore |
|---|---|
| Background | `#FAF9F6` |
| Surface | `#FFFFFF` |
| Surface Low | `#F4F3F0` |
| Surface High | `#E9E8E5` |
| Primary | `#031634` |
| Primary Container | `#1A2B4A` |
| Oro/Accento | `#C9A96E` |
| Testo primario | `#1a1c1a` |
| Testo secondario | `#44474e` |
| Border radius | `4px` default, `8px` immagini card |
| Shadow | `0 12px 32px rgba(26,43,74,0.06), 0 2px 8px rgba(26,43,74,0.04)` |
| Font headline | Newsreader (serif) |
| Font body | Inter |
| Font dati/SKU | JetBrains Mono |

### Font Google (in `index.html`)
- Newsreader: 400, 500, 600, italic
- Inter: 300, 400, 500, 600, 700
- JetBrains Mono: 400

### Tailwind v4 — `frontend/src/index.css`
Tutti i token definiti con `@theme` come CSS custom properties. Due namespace: `--color-dark-*` per la Home, `--color-*` per le pagine interne.

---

## 3. Architettura

### Approccio scelto
**Shell-first sequenziale**: tokens → Navbar/Footer → Home dark → pagine interne light → API integration.

### Struttura file frontend

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx              # prop variant: 'dark' | 'light'
│   │   ├── FooterDark.tsx          # solo Home, sfondo #070F1C
│   │   └── FooterLight.tsx         # pagine interne, sfondo navy #1A2B4A
│   ├── home/
│   │   ├── HeroDark.tsx
│   │   ├── AlternatingSectionRight.tsx
│   │   ├── AlternatingSectionLeft.tsx
│   │   └── LocationStrip.tsx
│   └── catalog/
│       ├── ProductGrid.tsx
│       ├── ProductCard.tsx
│       ├── ProductModal.tsx
│       ├── FilterBar.tsx
│       └── Paginator.tsx
├── hooks/
│   ├── useCoffins.ts
│   ├── useAccessories.ts
│   ├── useMarmista.ts
│   └── useCeabis.ts
├── lib/
│   ├── api.ts                      # già esistente
│   └── mock-data.ts                # dati mock per fallback
└── pages/
    ├── HomePage.tsx
    ├── ImpreseFunebrePage.tsx
    ├── MarmistiPage.tsx
    ├── NostraStoriaPage.tsx
    └── DoveSiamoPage.tsx
```

### Struttura file backend (aggiunte)

```
backend/src/
├── routes/
│   └── public.ts        # espandere con tutti gli endpoint pubblici
└── lib/
    └── mailer.ts        # Nodemailer (nuovo)
```

---

## 4. Componenti

### Navbar — componente duale
```tsx
interface NavbarProps { variant: 'dark' | 'light' }
```
- `variant='dark'`: trasparente su `#071325`, testo `#8A9BB5`, wordmark bianco, CTA outlined bordo `#C9A96E`
- `variant='light'`: `bg-[#FAF9F6]/80 backdrop-blur-md shadow-warm`, testo `#031634/70`, wordmark `#031634`, CTA filled `#031634`

Selezione in `App.tsx`:
```tsx
<Navbar variant={location.pathname === '/' ? 'dark' : 'light'} />
```

### Home (`HomePage.tsx`) — Dark
Basata su progetto Stitch `14105133691280762844`. Struttura:
1. `HeroDark` — headline Inter 900 ~130px ALL CAPS, CTA outlined gold, immagine cut-out destra
2. `AlternatingSectionRight` — testo sx + rettangolo dark flush right + preview prodotti
3. `AlternatingSectionLeft` — rettangolo dark flush left + testo dx
4. `LocationStrip` — Villamar | Sassari con linea gold verticale
5. `FooterDark`

### Per le Imprese Funebri (`ImpreseFunebrePage.tsx`) — Light
Due sezioni distinte:

**Sezione 1 — Cofani & Accessori:**
- Page header (Newsreader 5xl, sottotitolo italic)
- `FilterBar` sticky: dropdown Categoria, Sottocategoria, ricerca testo, chip filtri attivi
- `ProductGrid` 3 colonne: `ProductCard` con codice JetBrains Mono, badge categoria, hover ring gold
- Click card → `ProductModal`: immagine grande, tabella misure interne 2×3, caratteristiche, pagina PDF

**Sezione 2 — Catalogo Ceabis:**
- Stesso pattern Per i Marmisti: griglia con layout PDF-style
- Nessun prezzo visibile

### Per i Marmisti (`MarmistiPage.tsx`) — Light
- Page header + `FilterBar` (solo Categoria)
- `ProductGrid`: `ProductCard` con **prezzo pubblico in evidenza** (JetBrains Mono, gold)
- Click → `ProductModal` con prezzo, PDF page link, accessori collegati

### La Nostra Storia (`NostraStoriaPage.tsx`) — Light
Fedele al Stitch `la_nostra_storia_versione_semplificata`:
- Hero centrato con titolo Newsreader, linea verticale gold
- Sezione narrativa asimmetrica 5/12 + 7/12
- Timeline / valori aziendali
- Strip due sedi (Villamar + Sassari)

### Dove Siamo (`DoveSiamoPage.tsx`) — Light
Fedele al Stitch `dove_siamo_sedi_allineate`:
- Due card sedi affiancate: indirizzo, orari, telefono
- Mappa embed Leaflet (no API key)
- `ContactForm` con validazione Zod client-side → `POST /api/public/contact`

---

## 5. Backend Pubblico

### Endpoint `/api/public/*`

| Metodo | Path | Descrizione |
|---|---|---|
| GET | `/api/public/coffins` | Lista paginata cofani (senza prezzi) |
| GET | `/api/public/coffins/:id` | Dettaglio cofano + misure interne |
| GET | `/api/public/accessories` | Lista paginata accessori |
| GET | `/api/public/accessories/:id` | Dettaglio accessorio + pagina PDF |
| GET | `/api/public/marmista` | Lista paginata marmisti (con prezzo pubblico) |
| GET | `/api/public/marmista/:id` | Dettaglio + accessori collegati |
| GET | `/api/public/ceabis` | Lista paginata Ceabis (senza prezzi) |
| GET | `/api/public/ceabis/:id` | Dettaglio Ceabis |
| POST | `/api/public/contact` | Invio form contatto via Nodemailer |

**Regola di sicurezza:** nessun endpoint espone `purchasePrice` o campi listino acquisto — validato server-side.

**Formato risposta liste:**
```typescript
{ data: Article[], pagination: { page, limit, total, totalPages } }
```

### Nodemailer — `backend/src/lib/mailer.ts`
Variabili env richieste: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_EMAIL_TO`

Validazione Zod del form: `name` (string, min 2), `email` (email), `message` (string, min 10)

Rate limiting: max 3 richieste per IP in 1 ora (via `@fastify/rate-limit` su questa route specifica)

---

## 6. Mock Data Strategy

Gli hook frontend tentano l'API reale. Se la risposta è vuota (`data.length === 0`) o la chiamata fallisce, usano dati mock da `src/lib/mock-data.ts`. Nessun flag env — comportamento automatico. I mock contengono ~6 articoli per categoria con immagini placeholder.

---

## 7. Ordine di implementazione

1. Tailwind v4 tokens + Google Fonts
2. `Navbar` (variante dark + light) + `FooterDark` + `FooterLight`
3. `HomePage.tsx` (dark)
4. `ImpreseFunebrePage.tsx` — sezione cofani (componenti catalog)
5. `ImpreseFunebrePage.tsx` — sezione Ceabis
6. `MarmistiPage.tsx`
7. `NostraStoriaPage.tsx`
8. `DoveSiamoPage.tsx` + form contatto
9. Backend: endpoint pubblici + `mailer.ts`
10. Integrazione API reale negli hook (rimozione mock dove il DB ha dati)

---

## 8. Checklist completamento Fase 2

- [ ] Tailwind v4 tokens configurati per entrambi i design system
- [ ] Font Google caricati (Newsreader, Inter, JetBrains Mono)
- [ ] Navbar con variante dark e light funzionante
- [ ] FooterDark e FooterLight implementati
- [ ] Home dark — hero, sezioni alternanti, location strip
- [ ] Transizione dark→light fluida Home→pagine interne
- [ ] Per le Imprese Funebri — sezione cofani con filtri, griglia, overlay dettaglio
- [ ] Per le Imprese Funebri — sezione Ceabis
- [ ] Per i Marmisti — griglia con prezzi pubblici
- [ ] La Nostra Storia — layout narrativo completo
- [ ] Dove Siamo — mappa Leaflet + cards sedi + form contatto
- [ ] Form contatto invia email reale via Nodemailer
- [ ] Endpoint pubblici backend implementati e funzionanti
- [ ] Mock data fallback attivo quando DB vuoto
- [ ] Responsive su mobile/tablet/desktop
- [ ] Nessun prezzo d'acquisto esposto in endpoint pubblici

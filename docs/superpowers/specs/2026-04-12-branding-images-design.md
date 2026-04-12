# Design: Branding — Gestione Immagini di Pagina

**Data:** 2026-04-12  
**Fase:** 5 — Area Clienti  
**Stato:** Approvato

---

## Obiettivo

Permettere all'admin di caricare immagini che sostituiscono i placeholder div presenti in `HomePage.tsx` (3 sezioni) e `NostraStoriaPage.tsx` (1 sezione narrativa). Le immagini vengono gestite nella pagina admin esistente `/admin/branding/logo`, rinominata "Immagini" nella sidebar.

---

## Slot immagini

| Slot ID          | Pagina              | Posizione                          |
|------------------|---------------------|------------------------------------|
| `home-funebri`   | `HomePage.tsx`      | Sezione "Per le Imprese Funebri"   |
| `home-marmisti`  | `HomePage.tsx`      | Sezione "Per i Marmisti"           |
| `home-altri`     | `HomePage.tsx`      | Sezione "Cimiteri / Crematori"     |
| `storia-narrativa` | `NostraStoriaPage.tsx` | Sezione narrativa (col. sinistra) |

---

## Backend (`backend/src/routes/branding.ts`)

### Nuovi endpoint immagini

```
POST   /api/admin/branding/images/:slot   — upload immagine per slot
DELETE /api/admin/branding/images/:slot   — cancella immagine per slot
```

- **Slot validi** (validati server-side): `home-funebri`, `home-marmisti`, `home-altri`, `storia-narrativa`
- **Formati accettati**: PNG, WebP, SVG
- **Dimensione massima**: 5 MB
- **Storage**: `uploads/images/branding/{slot}.{ext}` (sostituisce file precedente dello stesso slot)
- **Permesso**: `branding.logo.manage` (riuso permesso esistente)

### Endpoint pubblico esteso

```
GET /api/public/branding
```

Risposta attuale: `{ logoUrl: string | null }`  
Risposta nuova: `{ logoUrl: string | null, images: Record<string, string | null> }`

La mappa `images` include tutti e 4 gli slot; se un'immagine non esiste, il valore è `null`.

### Modifica logo: aggiunta WebP

Il logo attualmente accetta PNG e SVG. Aggiungere WebP alla lista dei formati accettati.  
- Formati logo dopo: PNG, WebP, SVG
- Max size invariato: 2 MB

---

## Frontend

### `BrandingContext`

Aggiungere `images: Record<string, string | null>` al tipo del context.  
Il fetch pubblico (`GET /api/public/branding`) popola sia `logoUrl` che `images`.  
Aggiungere `refresh()` già esistente — nessuna modifica necessaria alla firma.

### `BrandingLogoPage.tsx`

Pagina estesa con due sezioni:

1. **Logo aziendale** — sezione esistente, invariata (salvo accettazione WebP nel file input)
2. **Immagini di pagina** — nuova sezione con 4 card in griglia 2×2:
   - Ogni card mostra: titolo slot, anteprima immagine corrente (o box grigio placeholder), bottone "Seleziona file" / drag-and-drop, bottone "Elimina"
   - Stile coerente con il drop zone del logo

### Sidebar (`AdminSidebar.tsx`)

```
// Prima
{ to: '/admin/branding/logo', label: 'Logo', permissions: ['branding.logo.manage'] }

// Dopo
{ to: '/admin/branding/logo', label: 'Immagini', permissions: ['branding.logo.manage'] }
```

Route invariata (`/admin/branding/logo`).

### `HomePage.tsx`

Per ciascuno dei 3 placeholder `<div aria-hidden="true">`:
- Se `images[slot]` è presente → `<img src={images[slot]} ... />`
- Altrimenti → `<div>` scuro esistente (fallback)

### `NostraStoriaPage.tsx`

Slot `storia-narrativa`:
- Se `images['storia-narrativa']` è presente → `<img>` con stile `object-cover` nel contenitore `aspect-[4/5]`
- Altrimenti → gradient div esistente (fallback)

---

## File coinvolti

| File | Modifica |
|------|----------|
| `backend/src/routes/branding.ts` | Nuove route images, endpoint pubblico esteso, aggiunta WebP al logo |
| `frontend/src/context/BrandingContext.tsx` | Aggiunta `images` al tipo e al fetch |
| `frontend/src/pages/admin/BrandingLogoPage.tsx` | Nuova sezione immagini |
| `frontend/src/components/admin/AdminSidebar.tsx` | Label "Logo" → "Immagini" |
| `frontend/src/pages/HomePage.tsx` | Sostituzione placeholder con img condizionale |
| `frontend/src/pages/NostraStoriaPage.tsx` | Sostituzione placeholder con img condizionale |

---

## Decisioni di design

- Riuso del permesso `branding.logo.manage` per le immagini — evita proliferazione di permessi per funzionalità correlate
- Nessuna tabella DB — le immagini sono file su disco, l'endpoint pubblico fa `fs.existsSync` per costruire la mappa degli slot
- Fallback visivi invariati — se l'immagine non è caricata, le pagine pubbliche restano identiche all'attuale
- Route admin invariata — `BrandingLogoPage` rimane su `/admin/branding/logo`

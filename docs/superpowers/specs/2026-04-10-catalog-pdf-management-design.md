# Catalog PDF Management — Design Spec

**Data:** 2026-04-10  
**Stato:** Approvato

---

## Contesto

Il sistema gestisce due cataloghi PDF (Accessori e Marmista) che vengono mostrati agli utenti clienti nella sezione area riservata. Ogni articolo ha un campo `pdfPage` che indica su quale pagina del catalogo fisico si trova l'articolo.

Il problema attuale:
- Upload PDF: assente (solo manuale via filesystem)
- Split: script manuale da terminale
- `pdfPage` ambiguo (file PDF vs pagina catalogo)
- Viewer carica l'intero PDF con `#page=N` (lento)
- Nessuna gestione di layout singolo/doppio per la numerazione

---

## Obiettivo

Costruire un sistema admin completo per:
1. Caricare i PDF catalogo via UI
2. Configurare il layout pagine (singolo/doppio, offset)
3. Triggerare lo split automaticamente dopo l'upload
4. Mostrare correttamente le pagine nel viewer clienti usando le pagine splittate

---

## Schema DB

### Nuovo enum

```prisma
enum PageType {
  single
  double
}
```

### Modifica `PdfCatalog`

```prisma
model PdfCatalog {
  id            String         @id @default(cuid())
  filePath      String
  fileName      String
  type          PdfCatalogType @unique
  uploadedAt    DateTime       @default(now())
  // Campi layout (nuovi)
  layoutOffset  Int            @default(0)   // pagine PDF senza numero prima della pag. 1
  firstPageType PageType       @default(single)
  bodyPageType  PageType       @default(double)
  lastPageType  PageType       @default(single)
  totalPdfPages Int?           // impostato dopo lo split
  pagesSlug     String?        // slug cartella pagine (es. "catalogo-ceabis-2024"), impostato all'upload
}
```

**Semantica dei campi layout:**
- `layoutOffset`: quante pagine PDF iniziali non hanno numero (copertine interne, pagine bianche, ecc.)
- `firstPageType`: la prima pagina numerata è singola o doppia?
- `bodyPageType`: le pagine centrali (corpo) sono singole o doppie?
- `lastPageType`: l'ultima pagina numerata è singola o doppia?
- `totalPdfPages`: totale pagine PDF del file; impostato al momento dell'upload, usato per il progresso dello split

### Campo `pdfPage` negli articoli

**Definizione:** numero di pagina del catalogo fisico (1-based, dalla prima pagina numerata). Il mapping verso il file PDF splittato avviene a runtime tramite la utility `catalogPageMap.ts`.

---

## API Backend

Tutti gli endpoint sotto `/api/admin/catalog` (autenticazione + permesso `catalog.pdf.write` per write, `catalog.pdf.read` per read).

| Metodo | Path | Descrizione |
|--------|------|-------------|
| `GET` | `/` | Lista cataloghi con stato split |
| `POST` | `/` | Upload PDF + layout → avvia split in background |
| `GET` | `/:type/status` | Stato split corrente |
| `PUT` | `/:type/layout` | Aggiorna layout senza re-upload |
| `DELETE` | `/:type` | Rimuove catalogo e pagine splittate |

### POST / — Payload

`multipart/form-data`:
- `file` — PDF (max 100 MB, MIME: application/pdf)
- `type` — `accessories` | `marmista`
- `layoutOffset` — intero ≥ 0
- `firstPageType` — `single` | `double`
- `bodyPageType` — `single` | `double`
- `lastPageType` — `single` | `double`

Risposta immediata `202 Accepted` con `{ id, status: 'splitting' }`. Lo split gira in background (`void splitPdfService.run(...)`).

### GET /:type/status — Risposta

```json
{
  "type": "accessories",
  "fileName": "CATALOGO CEABIS 2024.pdf",
  "uploadedAt": "2026-04-10T12:00:00Z",
  "totalPdfPages": 220,
  "splitPages": 145,
  "isComplete": false,
  "layout": {
    "offset": 0,
    "firstPageType": "single",
    "bodyPageType": "double",
    "lastPageType": "single"
  }
}
```

### Endpoint pubblico (viewer clienti)

`GET /api/public/catalog/:type/layout` — restituisce solo i dati di layout (nessun prezzo, nessun dato sensibile). Usato dal frontend per calcolare il mapping pagine.

```json
{
  "type": "accessories",
  "slug": "catalogo-ceabis-2024",
  "totalPdfPages": 220,
  "layout": {
    "offset": 0,
    "firstPageType": "single",
    "bodyPageType": "double",
    "lastPageType": "single"
  }
}
```

---

## Logica Split — `splitPdfService.ts`

Estratto e adattato dallo script `backend/prisma/split-pdf.ts` esistente, convertito in funzione chiamabile dal backend:

```typescript
async function run(catalogId: string, filePath: string, slug: string): Promise<void>
```

Comportamento:
- Legge il PDF con `pdf-lib`
- Aggiorna `totalPdfPages` su DB
- Splitta ogni pagina in `uploads/pdf/pages/{slug}/{n}.pdf` (1-based)
- Salta pagine già presenti (safe da rieseguire)
- Log via Pino (`app.log`)

Lo script `backend/prisma/split-pdf.ts` rimane per uso manuale da terminale.

---

## Logica Mapping Pagine — `catalogPageMap.ts`

File: `backend/src/lib/catalogPageMap.ts`

### Funzione principale

```typescript
interface CatalogLayout {
  offset: number
  firstPageType: 'single' | 'double'
  bodyPageType: 'single' | 'double'
  lastPageType: 'single' | 'double'
  totalPdfPages: number
}

function catalogPageToPdfFile(catalogPage: number, layout: CatalogLayout): number
```

**Algoritmo:**

```
base = offset + 1   ← indice del primo PDF numerato

Se firstPageType = 'single':
  pag. 1             → base
  pag. N > 1         → base + ceil((N-1) / stride)

Se firstPageType = 'double':
  pag. 1 o 2         → base
  pag. N > 2         → base + 1 + ceil((N-2) / stride)

dove stride = 1 se bodyPageType='single', 2 se bodyPageType='double'
```

Note: `lastPageType` influenza solo l'etichetta display, non il file index (il file esiste sempre).

### Funzione display

```typescript
function pdfFileToDisplayLabel(pdfFileIndex: number, layout: CatalogLayout): string
// Esempi: "p. 1", "pp. 4–5", "p. 220"
```

Calcola le pagine catalogo coperte da un dato file PDF e restituisce l'etichetta formattata.

### Test

File: `backend/src/lib/__tests__/catalogPageMap.test.ts`

Casi testati:
- Tutto singolo (offset=0)
- Tutto doppio (offset=0)
- Copertina singola + corpo doppio + retro singolo
- Con offset (es. 2 pagine vuote iniziali)
- Prima pagina doppia + corpo singolo

---

## Frontend — Pagina Admin

File: `frontend/src/pages/admin/CatalogPdfPage.tsx`

### Layout

Due card affiancate, una per tipo (Accessori / Marmista). Ogni card gestisce il proprio stato indipendentemente.

### Tre stati per card

**Vuoto** (nessun catalogo):
- Drag-and-drop upload PDF
- Configuratore layout (4 campi: offset numerico + 3 select single/double)
- Pulsante "Carica e avvia split"

**Split in corso** (polling ogni 2s):
- Nome file + data upload
- Progress bar: `splitPages / totalPdfPages` con percentuale
- Layout readonly
- Pulsante "Ricarica PDF" (disabilitato durante split)

**Completato**:
- Riepilogo: nome file, data, totale pagine
- Layout con pulsante "Modifica layout" (PUT senza re-upload)
- Pulsante "Ricarica PDF"
- Tabella riepilogo mapping (prime 5 righe + ultima, es. "PDF p.2 = catalogo pp.2–3")

### Polling

`setInterval` da 2000ms, attivo solo se `isComplete === false`. Si ferma automaticamente al completamento o allo smontaggio del componente.

---

## Frontend — Viewer Accessori

File: `frontend/src/components/catalog/AccessoriesView.tsx`

### Cambiamento sorgente PDF

**Prima:**
```
/uploads/pdf/CATALOGO CEABIS 2024.pdf#page=42
```

**Dopo:**
```
/uploads/pdf/pages/catalogo-ceabis-2024/22.pdf
```

Il numero file (`22`) è calcolato da `catalogPageToPdfFile(item.pdfPage, layout)`.

### Layout fetch

Al mount, `AccessoriesView` chiama `GET /api/public/catalog/accessories/layout` e memorizza il layout. Se la risposta manca (catalogo non ancora caricato), fallback all'URL del PDF completo con `#page=N`.

### Etichetta display

La barra info mostra `pdfFileToDisplayLabel(fileIndex, layout)`:
- Prima: `"Pagina 3"`
- Dopo: `"pp. 4–5"`

---

## File da creare / modificare

| Layer | File | Azione |
|-------|------|--------|
| DB | `backend/prisma/schema.prisma` | Aggiungo `PageType` enum + 5 campi a `PdfCatalog` |
| DB | migration | Nuova migration Prisma |
| Backend | `backend/src/lib/catalogPageMap.ts` | Nuovo |
| Backend | `backend/src/lib/splitPdfService.ts` | Nuovo (estratto da split-pdf.ts) |
| Backend | `backend/src/lib/__tests__/catalogPageMap.test.ts` | Nuovo |
| Backend | `backend/src/routes/catalog.ts` | Implemento 5 endpoint |
| Backend | `backend/src/routes/public.ts` | Aggiungo `GET /catalog/:type/layout` |
| Frontend | `frontend/src/pages/admin/CatalogPdfPage.tsx` | Riscritto |
| Frontend | `frontend/src/components/catalog/AccessoriesView.tsx` | Cambia src PDF + etichetta |
| Frontend | `frontend/src/lib/api/catalog.ts` | Nuovo API client |

---

## Vincoli e note

- Upload max: 100 MB (aggiornare limite multipart da 10 MB)
- MIME validation server-side: solo `application/pdf`
- Il campo `pdfPage` negli articoli esistenti non viene migrato — il mapping è backward-compatible (se layout non disponibile, fallback a `#page=N` sull'intero PDF)
- Un solo catalogo per tipo (`PdfCatalogType @unique`) — il nuovo upload sostituisce il precedente
- Le pagine splittate del vecchio catalogo vengono cancellate (rimossa la cartella `uploads/pdf/pages/{oldSlug}/`) subito dopo il salvataggio del nuovo file PDF su disco, prima di avviare il nuovo split

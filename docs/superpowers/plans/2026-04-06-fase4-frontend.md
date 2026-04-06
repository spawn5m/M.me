# Fase 4 Frontend — Admin Articoli e Listini

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementare le pagine admin per gestione lookup, articoli e listini prezzi.

**Architecture:** Riutilizza i componenti esistenti (DataTable, FormModal, ConfirmDialog). Nuove pagine seguono il pattern già stabilito in UsersPage/RolesPage. Tipi da `shared.ts` già aggiunti nel Piano A.

**Tech Stack:** React 19, react-hook-form, Zod, axios, i18next, Tailwind CSS v4 (design system B — light professional)

**Prerequisito:** Piano A (backend) completato e funzionante.

---

## File Structure

**Nuovi file:**
- `frontend/src/pages/admin/LookupPage.tsx` — pagina generica per tutti i lookup
- `frontend/src/pages/admin/CoffinsPage.tsx`
- `frontend/src/pages/admin/AccessoriesPage.tsx`
- `frontend/src/pages/admin/MarmistaArticlesPage.tsx`
- `frontend/src/pages/admin/PriceListsPage.tsx`
- `frontend/src/pages/admin/PriceListDetailPage.tsx`
- `frontend/src/lib/api/lookups.ts`
- `frontend/src/lib/api/articles.ts`
- `frontend/src/lib/api/pricelists.ts`

**File modificati:**
- `frontend/src/components/admin/AdminSidebar.tsx` — nuove voci
- `frontend/src/App.tsx` (o router) — nuove route
- `frontend/src/pages/admin/UsersPage.tsx` — aggiunge assegnazione listino

---

### Task 1: API client

**Files:**
- Create: `frontend/src/lib/api/lookups.ts`
- Create: `frontend/src/lib/api/articles.ts`
- Create: `frontend/src/lib/api/pricelists.ts`

- [ ] Crea `frontend/src/lib/api/lookups.ts`:

```ts
import axios from 'axios'
import type { AdminLookup, PaginatedResponse } from '../../../../backend/src/types/shared'

const base = '/api/admin/lookups'

export const lookupsApi = {
  list: (type: string) => axios.get<PaginatedResponse<AdminLookup>>(`${base}/${type}`).then(r => r.data),
  create: (type: string, data: { code: string; label: string }) => axios.post<AdminLookup>(`${base}/${type}`, data).then(r => r.data),
  update: (type: string, id: string, data: { code: string; label: string }) => axios.put<AdminLookup>(`${base}/${type}/${id}`, data).then(r => r.data),
  remove: (type: string, id: string) => axios.delete(`${base}/${type}/${id}`),
}
```

- [ ] Crea `frontend/src/lib/api/articles.ts`:

```ts
import axios from 'axios'
import type { AdminCoffinArticle, AdminAccessoryArticle, AdminMarmistaArticle, ImportResult, PaginatedResponse } from '../../../../backend/src/types/shared'

const base = '/api/admin/articles'

export const articlesApi = {
  coffins: {
    list: (params?: { page?: number; search?: string; category?: string }) =>
      axios.get<PaginatedResponse<AdminCoffinArticle>>(`${base}/coffins`, { params }).then(r => r.data),
    create: (data: unknown) => axios.post<AdminCoffinArticle>(`${base}/coffins`, data).then(r => r.data),
    update: (id: string, data: unknown) => axios.put<AdminCoffinArticle>(`${base}/coffins/${id}`, data).then(r => r.data),
    remove: (id: string) => axios.delete(`${base}/coffins/${id}`),
    import: (file: File) => {
      const form = new FormData(); form.append('file', file)
      return axios.post<ImportResult>(`${base}/coffins/import`, form).then(r => r.data)
    },
  },
  accessories: { /* stesso pattern */ } as any,
  marmista: { /* stesso pattern */ } as any,
}
```

- [ ] Crea `frontend/src/lib/api/pricelists.ts` con metodi per tutti gli endpoint del Piano A (CRUD + items + preview + recalculate + assign).

- [ ] Commit:
```bash
git add frontend/src/lib/api/
git commit -m "feat: API client frontend — lookups, articles, pricelists"
```

---

### Task 2: LookupPage generica

**Files:**
- Create: `frontend/src/pages/admin/LookupPage.tsx`

- [ ] Implementa usando `DataTable`, `FormModal`, `ConfirmDialog` esistenti:

```tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { lookupsApi } from '../../lib/api/lookups'
import DataTable from '../../components/admin/DataTable'
import FormModal from '../../components/admin/FormModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import type { AdminLookup } from '../../../../backend/src/types/shared'

const LOOKUP_LABELS: Record<string, string> = {
  'coffin-categories': 'Categorie Cofani',
  'coffin-subcategories': 'Sottocategorie Cofani',
  'essences': 'Essenze', 'figures': 'Figure',
  'colors': 'Colori', 'finishes': 'Finiture',
  'accessory-categories': 'Categorie Accessori',
  'accessory-subcategories': 'Sottocategorie Accessori',
  'marmista-categories': 'Categorie Marmisti',
}

export default function LookupPage() {
  const { type } = useParams<{ type: string }>()
  const [items, setItems] = useState<AdminLookup[]>([])
  const [editing, setEditing] = useState<AdminLookup | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = () => lookupsApi.list(type!).then(r => setItems(r.data))
  useEffect(() => { load() }, [type])

  const columns = [
    { key: 'code', label: 'Codice' },
    { key: 'label', label: 'Label' },
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-['Playfair_Display'] text-2xl text-[#1A2B4A]">{LOOKUP_LABELS[type!] ?? type}</h1>
        <button onClick={() => setCreating(true)}
          className="bg-[#1A2B4A] text-white px-4 py-2 text-sm font-['Inter'] font-medium">
          + Aggiungi
        </button>
      </div>
      <DataTable columns={columns} data={items}
        onEdit={row => setEditing(row)}
        onDelete={row => setDeleting(row.id)} />
      {(creating || editing) && (
        <FormModal
          title={editing ? 'Modifica' : 'Nuovo'}
          fields={[
            { name: 'code', label: 'Codice', required: true },
            { name: 'label', label: 'Label', required: true },
          ]}
          initialValues={editing ?? {}}
          onSubmit={async (data) => {
            if (editing) await lookupsApi.update(type!, editing.id, data as any)
            else await lookupsApi.create(type!, data as any)
            setEditing(null); setCreating(false); load()
          }}
          onClose={() => { setEditing(null); setCreating(false) }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        message="Eliminare questo elemento?"
        onConfirm={async () => { await lookupsApi.remove(type!, deleting!); setDeleting(null); load() }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
```

- [ ] Aggiungi route in `App.tsx`:
```tsx
<Route path="/admin/lookups/:type" element={<LookupPage />} />
```

- [ ] Commit:
```bash
git commit -m "feat: LookupPage generica admin"
```

---

### Task 3: CoffinsPage (con import)

**Files:**
- Create: `frontend/src/pages/admin/CoffinsPage.tsx`

- [ ] Implementa pagina con:
  - Tab "Lista" — DataTable con colonne: codice, descrizione, categorie, misura
  - Tab "Import Excel" — input file upload + bottone + tabella risultati
  - Modal crea/modifica con campi: code, description, notes, measureId, categoryIds (multi-select), subcategoryIds, essenceIds, figureIds, colorIds, finishIds

- [ ] Import tab:
```tsx
const [importResult, setImportResult] = useState<ImportResult | null>(null)

async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  const result = await articlesApi.coffins.import(file)
  setImportResult(result)
}
// Mostra tabella con result.errors e result.warnings
```

- [ ] Aggiungi route: `<Route path="/admin/articles/coffins" element={<CoffinsPage />} />`

- [ ] Commit: `git commit -m "feat: CoffinsPage — CRUD + import Excel"`

> Stessa struttura per `AccessoriesPage.tsx` e `MarmistaArticlesPage.tsx` — adattare campi.

---

### Task 4: PriceListsPage e PriceListDetailPage

**Files:**
- Create: `frontend/src/pages/admin/PriceListsPage.tsx`
- Create: `frontend/src/pages/admin/PriceListDetailPage.tsx`

- [ ] `PriceListsPage` — lista con colonne: nome, tipo, dominio, padre, autoUpdate, # articoli. Wizard creazione in 2 step:
  - Step 1: nome + tipo (`sale|purchase`) + dominio (`funeral|marmista`) + scelta base/derivato
  - Step 2 (solo derivato): regole sconto (scope, tipo, valore)

- [ ] `PriceListDetailPage` — due tab:
  - **Prezzi**: tabella articoli con prezzo calcolato. Bottone "Ricalcola snapshot" visibile solo se `autoUpdate === false`.
  - **Regole**: lista regole con form inline per aggiungere/modificare.

```tsx
// Bottone ricalcola
{!priceList.autoUpdate && (
  <button onClick={() => pricelistsApi.recalculate(id)}
    className="border border-[#C9A96E] text-[#C9A96E] px-4 py-2 text-sm font-['Inter']">
    Ricalcola Snapshot
  </button>
)}
```

- [ ] Aggiungi route:
```tsx
<Route path="/admin/pricelists" element={<PriceListsPage />} />
<Route path="/admin/pricelists/:id" element={<PriceListDetailPage />} />
```

- [ ] Commit: `git commit -m "feat: PriceListsPage + PriceListDetailPage"`

---

### Task 5: Sidebar + Assegnazione listino in UsersPage

**Files:**
- Modify: `frontend/src/components/admin/AdminSidebar.tsx`
- Modify: `frontend/src/pages/admin/UsersPage.tsx`

- [ ] Aggiorna `AdminSidebar.tsx` aggiungendo le sezioni:
```tsx
{ label: 'Cofani', path: '/admin/articles/coffins' },
{ label: 'Accessori', path: '/admin/articles/accessories' },
{ label: 'Art. Marmisti', path: '/admin/articles/marmista' },
{ label: 'Categorie Cofani', path: '/admin/lookups/coffin-categories' },
// ... altri lookup
{ label: 'Listini', path: '/admin/pricelists' },
```

- [ ] In `UsersPage.tsx`, nella scheda/modal utente aggiungere dropdown per `funeralPriceListId` e `marmistaPriceListId`:
  - Mostra solo per ruoli `impresario_funebre` e `marmista`
  - Per Marmista: solo dropdown `marmistaPriceList`
  - Per Impresario Funebre: entrambi i dropdown

- [ ] Commit:
```bash
git commit -m "feat: sidebar aggiornata + assegnazione listino in UsersPage"
```

---

## Checklist completamento Piano B

- [ ] API client: lookups, articles, pricelists
- [ ] LookupPage generica — tutti i 9 tipi navigabili
- [ ] CoffinsPage, AccessoriesPage, MarmistaArticlesPage con CRUD + import
- [ ] PriceListsPage con wizard creazione
- [ ] PriceListDetailPage con tab Prezzi + Regole + ricalcolo snapshot
- [ ] Sidebar aggiornata con tutte le nuove sezioni
- [ ] Assegnazione listino a utente in UsersPage
- [ ] Build frontend senza errori TS: `cd frontend && npm run build`

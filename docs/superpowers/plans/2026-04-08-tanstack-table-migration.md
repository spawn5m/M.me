# TanStack Table Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il componente `DataTable` custom con TanStack Table v8 su tutte le 8 pagine admin, aggiungendo ordinamento per colonna e ricerca globale client-side.

**Architecture:** Il componente `DataTable.tsx` viene riscritto internamente con `@tanstack/react-table`, mantenendo la stessa interfaccia props esterna (stesso `Column`, `Action`, `PaginationInfo`) in modo che le pagine consumatrici richiedano modifiche minime. L'ordinamento è client-side per tabelle senza paginazione server, e disabilitato per quelle con paginazione server (UsersPage, PriceListsPage). La ricerca globale è opzionale tramite prop `searchable`.

**Tech Stack:** `@tanstack/react-table` v8, React 19, TypeScript strict, Tailwind CSS v4.

---

## File map

| File | Azione | Note |
|---|---|---|
| `frontend/src/components/admin/DataTable.tsx` | **Riscrivere** | Core della migrazione |
| `frontend/src/components/admin/__tests__/DataTable.test.tsx` | **Aggiornare** | Adattare ai nuovi comportamenti |
| `frontend/src/pages/admin/UsersPage.tsx` | **Modificare** | Rimuovere filtro testo (ora nel DataTable se `searchable`) |
| `frontend/src/pages/admin/RolesPage.tsx` | **Verificare** | Nessuna modifica prevista |
| `frontend/src/pages/admin/MeasuresPage.tsx` | **Verificare** | Nessuna modifica prevista |
| `frontend/src/pages/admin/LookupPage.tsx` | **Verificare** | Nessuna modifica prevista |
| `frontend/src/pages/admin/CoffinsPage.tsx` | **Verificare** | Nessuna modifica prevista |
| `frontend/src/pages/admin/AccessoriesPage.tsx` | **Verificare** | Nessuna modifica prevista |
| `frontend/src/pages/admin/MarmistaArticlesPage.tsx` | **Verificare** | Nessuna modifica prevista |
| `frontend/src/pages/admin/PriceListsPage.tsx` | **Verificare** | Nessuna modifica prevista |

---

## Task 1: Installa @tanstack/react-table

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Installa la libreria**

```bash
cd /Users/spawn5m/Documents/DEV/M.me/frontend
npm install @tanstack/react-table
```

Atteso: `added 1 package` (o simile), nessun errore.

- [ ] **Step 2: Verifica installazione**

```bash
cd /Users/spawn5m/Documents/DEV/M.me/frontend
node -e "require('@tanstack/react-table'); console.log('ok')"
```

Atteso: stampa `ok`.

- [ ] **Step 3: Commit**

```bash
cd /Users/spawn5m/Documents/DEV/M.me
git add frontend/package.json frontend/package-lock.json package-lock.json
git commit -m "chore: install @tanstack/react-table v8"
```

---

## Task 2: Riscrivi DataTable.tsx con TanStack Table

**Files:**
- Modify: `frontend/src/components/admin/DataTable.tsx`

**Interfaccia props — invariata:**

```ts
interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  width?: string
  sortable?: boolean  // default: true per colonne senza render, false per colonne con render
}

interface Action<T> {
  label: string
  onClick: (item: T) => void
  variant?: 'default' | 'danger'
  hidden?: (item: T) => boolean  // aggiunto nella sessione precedente
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  pagination?: PaginationInfo        // se presente → paginazione server-side
  onPageChange?: (page: number) => void
  actions?: Action<T>[]
  isLoading?: boolean
  searchable?: boolean               // NUOVO: mostra campo ricerca globale client-side
}
```

- [ ] **Step 1: Sostituisci il contenuto di DataTable.tsx**

Sostituisci completamente il file con:

```tsx
import React, { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  width?: string
  sortable?: boolean
}

interface Action<T> {
  label: string
  onClick: (item: T) => void
  variant?: 'default' | 'danger'
  hidden?: (item: T) => boolean
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  pagination?: PaginationInfo
  onPageChange?: (page: number) => void
  actions?: Action<T>[]
  isLoading?: boolean
  searchable?: boolean
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  pagination,
  onPageChange,
  actions,
  isLoading,
  searchable,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columnHelper = createColumnHelper<T>()

  const columnDefs = useMemo<ColumnDef<T, unknown>[]>(() => {
    const dataCols: ColumnDef<T, unknown>[] = columns.map((col) =>
      columnHelper.display({
        id: col.key,
        header: col.header,
        meta: { width: col.width },
        enableSorting: col.sortable ?? !col.render,
        sortingFn: 'alphanumeric',
        cell: (info) =>
          col.render
            ? col.render(info.row.original)
            : String(info.row.original[col.key] ?? ''),
      } as ColumnDef<T, unknown>)
    )

    if (actions && actions.length > 0) {
      dataCols.push(
        columnHelper.display({
          id: '__actions',
          header: 'Azioni',
          enableSorting: false,
          cell: (info) => {
            const item = info.row.original
            const visible = actions.filter((a) => !a.hidden?.(item))
            if (visible.length === 0) return null
            return (
              <div className="flex items-center justify-end gap-2">
                {visible.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => action.onClick(item)}
                    className={[
                      'min-h-9 border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors',
                      action.variant === 'danger'
                        ? 'border-[#F1D3D3] text-[#B42318] hover:bg-[#FFF5F5]'
                        : 'border-[#E5E0D8] text-[#031634] hover:border-[#C9A96E] hover:text-[#C9A96E]',
                    ].join(' ')}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )
          },
        }) as ColumnDef<T, unknown>
      )
    }

    return dataCols
  }, [columns, actions, columnHelper])

  const table = useReactTable<T>({
    data,
    columns: columnDefs,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: !!pagination,
    enableSortingRemoval: true,
  })

  const totalCols = columns.length + (actions && actions.length > 0 ? 1 : 0)

  return (
    <div className="overflow-hidden border border-[#E5E0D8] bg-white shadow-[0_2px_8px_rgba(26,43,74,0.08)]">
      {/* Ricerca globale opzionale */}
      {searchable && (
        <div className="border-b border-[#E5E0D8] px-4 py-3">
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cerca…"
            className="admin-input w-64"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-[#E5E0D8] bg-[#F8F7F4]">
                {headerGroup.headers.map((header) => {
                  const col = columns.find((c) => c.key === header.id)
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  const isActions = header.id === '__actions'

                  return (
                    <th
                      key={header.id}
                      style={{ width: col?.width }}
                      className={[
                        'px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#6B7280]',
                        isActions ? 'text-right' : 'text-left',
                        canSort ? 'cursor-pointer select-none hover:text-[#1A2B4A]' : '',
                      ].join(' ')}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-[10px] opacity-50">
                            {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '⇅'}
                          </span>
                        )}
                      </span>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={totalCols} className="py-12 text-center text-[#6B7280]">
                  <div className="flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A2B4A] border-t-transparent" />
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="py-12 text-center text-[#6B7280]">
                  Nessun risultato
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={String(row.original[keyField])}
                  className="border-b border-[#E5E0D8] last:border-0 transition-colors hover:bg-[#FCFBF8]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={[
                        'px-4 py-3 text-[#1A1A1A]',
                        cell.column.id === '__actions' ? 'text-right' : '',
                      ].join(' ')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginazione server-side */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#E5E0D8] bg-[#F8F7F4] px-4 py-3">
          <span className="text-xs text-[#6B7280]">
            {pagination.total} risultati — pagina {pagination.page} di {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="min-h-9 border border-[#E5E0D8] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E] disabled:opacity-40"
            >
              ← Prec
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="min-h-9 border border-[#E5E0D8] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#031634] transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E] disabled:opacity-40"
            >
              Succ →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verifica che TypeScript compili senza errori**

```bash
cd /Users/spawn5m/Documents/DEV/M.me/frontend
npx tsc --noEmit 2>&1 | head -40
```

Atteso: nessun errore (o solo errori pre-esistenti non correlati a DataTable).

- [ ] **Step 3: Commit**

```bash
cd /Users/spawn5m/Documents/DEV/M.me
git add frontend/src/components/admin/DataTable.tsx
git commit -m "feat: migrate DataTable to TanStack Table v8 with sorting support"
```

---

## Task 3: Aggiorna DataTable.test.tsx

**Files:**
- Modify: `frontend/src/components/admin/__tests__/DataTable.test.tsx`

- [ ] **Step 1: Leggi il test esistente**

```bash
cat frontend/src/components/admin/__tests__/DataTable.test.tsx
```

- [ ] **Step 2: Aggiorna i test per i nuovi comportamenti**

Sostituisci il contenuto con:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DataTable from '../DataTable'

const columns = [
  { key: 'name', header: 'Nome' },
  { key: 'email', header: 'Email' },
]

const data = [
  { id: '1', name: 'Alice', email: 'alice@test.it' },
  { id: '2', name: 'Bob', email: 'bob@test.it' },
]

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} keyField="id" />)
    expect(screen.getByText('Nome')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders data rows', () => {
    render(<DataTable columns={columns} data={data} keyField="id" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('bob@test.it')).toBeInTheDocument()
  })

  it('shows loading spinner when isLoading', () => {
    render(<DataTable columns={columns} data={[]} keyField="id" isLoading />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} keyField="id" />)
    expect(screen.getByText('Nessun risultato')).toBeInTheDocument()
  })

  it('renders action buttons', () => {
    const onClick = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        actions={[{ label: 'Modifica', onClick }]}
      />
    )
    const buttons = screen.getAllByText('Modifica')
    expect(buttons).toHaveLength(2)
    fireEvent.click(buttons[0])
    expect(onClick).toHaveBeenCalledWith(data[0])
  })

  it('hides action button when hidden returns true', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        actions={[
          { label: 'Visibile', onClick: vi.fn() },
          { label: 'Nascosto', onClick: vi.fn(), hidden: () => true },
        ]}
      />
    )
    expect(screen.getAllByText('Visibile')).toHaveLength(2)
    expect(screen.queryByText('Nascosto')).toBeNull()
  })

  it('sorts rows by column on header click', () => {
    render(<DataTable columns={columns} data={data} keyField="id" />)
    // Ordine iniziale: Alice, Bob
    let rows = screen.getAllByRole('row').slice(1) // salta header
    expect(rows[0]).toHaveTextContent('Alice')
    // Click su "Nome" → ordine ascendente (già asc di default dopo click)
    fireEvent.click(screen.getByText('Nome'))
    rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Alice')
    // Secondo click → discendente
    fireEvent.click(screen.getByText('Nome'))
    rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Bob')
  })

  it('shows search input when searchable', () => {
    render(<DataTable columns={columns} data={data} keyField="id" searchable />)
    expect(screen.getByPlaceholderText('Cerca…')).toBeInTheDocument()
  })

  it('filters rows via global search', () => {
    render(<DataTable columns={columns} data={data} keyField="id" searchable />)
    const input = screen.getByPlaceholderText('Cerca…')
    fireEvent.change(input, { target: { value: 'alice' } })
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).toBeNull()
  })

  it('renders server-side pagination controls', () => {
    const onPageChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        pagination={{ page: 1, pageSize: 2, total: 10, totalPages: 5 }}
        onPageChange={onPageChange}
      />
    )
    expect(screen.getByText(/pagina 1 di 5/)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Succ/))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
```

- [ ] **Step 3: Esegui i test**

```bash
cd /Users/spawn5m/Documents/DEV/M.me/frontend
npx vitest run src/components/admin/__tests__/DataTable.test.tsx
```

Atteso: tutti i test passano.

- [ ] **Step 4: Commit**

```bash
cd /Users/spawn5m/Documents/DEV/M.me
git add frontend/src/components/admin/__tests__/DataTable.test.tsx
git commit -m "test: update DataTable tests for TanStack Table behavior"
```

---

## Task 4: Integra ricerca in pagine client-side

Le pagine senza paginazione server (RolesPage, MeasuresPage, LookupPage, CoffinsPage, AccessoriesPage, MarmistaArticlesPage) ottengono la ricerca **gratis** aggiungendo `searchable` al `<DataTable>`.

**Files:**
- Modify: `frontend/src/pages/admin/RolesPage.tsx`
- Modify: `frontend/src/pages/admin/MeasuresPage.tsx`
- Modify: `frontend/src/pages/admin/LookupPage.tsx`
- Modify: `frontend/src/pages/admin/CoffinsPage.tsx`
- Modify: `frontend/src/pages/admin/AccessoriesPage.tsx`
- Modify: `frontend/src/pages/admin/MarmistaArticlesPage.tsx`

- [ ] **Step 1: Aggiungi `searchable` a RolesPage**

In `frontend/src/pages/admin/RolesPage.tsx`, trova la riga `<DataTable` e aggiungi `searchable`:

```tsx
<DataTable columns={columns} data={roles as never} keyField="id" isLoading={isLoading} actions={actions} searchable />
```

- [ ] **Step 2: Aggiungi `searchable` a MeasuresPage**

In `frontend/src/pages/admin/MeasuresPage.tsx`, trova `<DataTable` e aggiungi `searchable`:

```tsx
<DataTable columns={columns} data={items as never} keyField="id" isLoading={isLoading} actions={actions} searchable />
```

- [ ] **Step 3: Aggiungi `searchable` a LookupPage**

In `frontend/src/pages/admin/LookupPage.tsx`, trova `<DataTable` e aggiungi `searchable`:

```tsx
<DataTable columns={columns} data={items as never} keyField="id" isLoading={isLoading} actions={actions} searchable />
```

- [ ] **Step 4: Aggiungi `searchable` a CoffinsPage**

In `frontend/src/pages/admin/CoffinsPage.tsx`, trova `<DataTable` e aggiungi `searchable`:

```tsx
<DataTable columns={columns as never} data={items as never} keyField="id" isLoading={isLoading} actions={actions} searchable />
```

- [ ] **Step 5: Aggiungi `searchable` a AccessoriesPage**

In `frontend/src/pages/admin/AccessoriesPage.tsx`, trova `<DataTable` e aggiungi `searchable`:

```tsx
<DataTable columns={columns as never} data={items as never} keyField="id" isLoading={isLoading} actions={actions} searchable />
```

- [ ] **Step 6: Aggiungi `searchable` a MarmistaArticlesPage**

In `frontend/src/pages/admin/MarmistaArticlesPage.tsx`, trova `<DataTable` e aggiungi `searchable`:

```tsx
<DataTable columns={columns as never} data={items as never} keyField="id" isLoading={isLoading} actions={actions} searchable />
```

- [ ] **Step 7: Verifica TypeScript**

```bash
cd /Users/spawn5m/Documents/DEV/M.me/frontend
npx tsc --noEmit 2>&1 | head -30
```

Atteso: nessun errore su questi file.

- [ ] **Step 8: Commit**

```bash
cd /Users/spawn5m/Documents/DEV/M.me
git add frontend/src/pages/admin/RolesPage.tsx \
        frontend/src/pages/admin/MeasuresPage.tsx \
        frontend/src/pages/admin/LookupPage.tsx \
        frontend/src/pages/admin/CoffinsPage.tsx \
        frontend/src/pages/admin/AccessoriesPage.tsx \
        frontend/src/pages/admin/MarmistaArticlesPage.tsx
git commit -m "feat: enable client-side search on all admin list pages"
```

---

## Task 5: Pulizia UsersPage — rimuovi filtro search duplicato

UsersPage ha già una barra filtri server-side (search, ruolo, stato). Il campo search rimane nel componente, non nel DataTable. Non aggiungere `searchable` a UsersPage.

**Files:**
- Modify: `frontend/src/pages/admin/UsersPage.tsx`

- [ ] **Step 1: Verifica che UsersPage funzioni con il nuovo DataTable**

Avvia il frontend e naviga su `/admin/users`. Verifica che:
- La tabella si carichi correttamente
- I pulsanti azione funzionino
- La paginazione funzioni
- I filtri (search/ruolo/stato) funzionino

```bash
cd /Users/spawn5m/Documents/DEV/M.me && npm run dev
```

- [ ] **Step 2: Verifica TypeScript di UsersPage**

```bash
cd /Users/spawn5m/Documents/DEV/M.me/frontend
npx tsc --noEmit 2>&1 | grep UsersPage
```

Atteso: nessun errore.

---

## Task 6: Verifica finale e test completi

- [ ] **Step 1: Esegui tutti i test frontend**

```bash
cd /Users/spawn5m/Documents/DEV/M.me/frontend
npx vitest run
```

Atteso: tutti i test passano.

- [ ] **Step 2: Build di produzione**

```bash
cd /Users/spawn5m/Documents/DEV/M.me/frontend
npm run build 2>&1 | tail -20
```

Atteso: build completata senza errori.

- [ ] **Step 3: Commit finale**

```bash
cd /Users/spawn5m/Documents/DEV/M.me
git add -A
git commit -m "feat: complete TanStack Table migration on all admin pages"
```

---

## Self-review

**Spec coverage:**
- ✅ Installazione `@tanstack/react-table` — Task 1
- ✅ Riscrittura `DataTable.tsx` con sorting — Task 2
- ✅ Ricerca globale client-side (`searchable`) — Task 2 + Task 4
- ✅ API esterna invariata (nessuna breaking change sulle 8 pagine) — Task 2
- ✅ Test aggiornati — Task 3
- ✅ Tutte le pagine ricevono `searchable` — Task 4
- ✅ UsersPage mantiene i propri filtri server-side — Task 5
- ✅ Verifica TypeScript e build — Task 6

**Consistenza tipi:** L'interfaccia `Column`, `Action`, `PaginationInfo` è definita una sola volta in `DataTable.tsx` e usata ovunque. Il campo `hidden` su `Action` è incluso nella riscrittura.

**YAGNI:** Nessuna feature extra (selezione righe, export CSV, filtri per colonna). Solo sorting + ricerca globale come concordato.

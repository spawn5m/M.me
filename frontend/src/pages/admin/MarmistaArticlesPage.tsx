import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { articlesApi } from '../../lib/api/articles'
import { lookupsApi } from '../../lib/api/lookups'
import DataTable from '../../components/admin/DataTable'
import FormModal from '../../components/admin/FormModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import type { AdminMarmistaArticle, AdminLookup, ImportResult } from '../../../../backend/src/types/shared'

interface FormData {
  code: string
  description: string
  notes: string
  pdfPage: string
  publicPrice: string
  color: boolean
  categoryIds: string[]
}

function MultiSelect({ label, options, value, onChange }: {
  label: string; options: AdminLookup[]; value: string[]
  onChange: (val: string[]) => void
}) {
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  return (
    <div>
      <label className="admin-label">{label}</label>
      <div className="max-h-32 overflow-y-auto border border-[#E5E0D8] bg-white p-2">
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <button key={opt.id} type="button" onClick={() => toggle(opt.id)}
              className={`admin-inline-chip ${value.includes(opt.id) ? 'admin-inline-chip-active' : ''}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

type Tab = 'list' | 'import'

export default function MarmistaArticlesPage() {
  const [tab, setTab] = useState<Tab>('list')
  const [items, setItems] = useState<AdminMarmistaArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editing, setEditing] = useState<AdminMarmistaArticle | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<AdminLookup[]>([])

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: { categoryIds: [], color: false },
  })

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await articlesApi.marmista.list()
      setItems(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    lookupsApi.list('marmista-categories')
      .then(res => setAvailableCategories(res.data))
      .catch(() => {})
  }, [])

  const openCreate = () => {
    reset({ code: '', description: '', notes: '', pdfPage: '', publicPrice: '', color: false, categoryIds: [] })
    setIsCreating(true)
  }

  const openEdit = (item: AdminMarmistaArticle) => {
    reset({
      code: item.code,
      description: item.description,
      notes: item.notes ?? '',
      pdfPage: item.pdfPage?.toString() ?? '',
      publicPrice: item.publicPrice?.toString() ?? '',
      color: item.color,
      categoryIds: item.categories.map(c => c.id),
    })
    setEditing(item)
  }

  const closeModal = () => { setIsCreating(false); setEditing(null); reset() }

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...data,
        pdfPage: data.pdfPage ? parseInt(data.pdfPage, 10) : null,
        publicPrice: data.publicPrice ? parseFloat(data.publicPrice) : null,
        color: data.color,
        categoryIds: data.categoryIds,
      }
      if (editing) {
        await articlesApi.marmista.update(editing.id, payload)
      } else {
        await articlesApi.marmista.create(payload)
      }
      closeModal(); load()
    } finally {
      setIsSubmitting(false)
    }
  })

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try { await articlesApi.marmista.remove(deletingId); setDeletingId(null); load() }
    finally { setIsDeleting(false) }
  }

  const handleClearAll = async () => {
    setIsClearing(true)
    try { await articlesApi.marmista.clearAll(); setIsClearConfirmOpen(false); load() }
    finally { setIsClearing(false) }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true); setImportResult(null)
    try { const result = await articlesApi.marmista.import(file); setImportResult(result); load() }
    finally { setIsImporting(false); e.target.value = '' }
  }

  const columns = [
    { key: 'code', header: 'Codice', width: '120px' },
    { key: 'description', header: 'Descrizione' },
    {
      key: 'categories', header: 'Categorie',
      render: (item: Record<string, unknown>) => (item.categories as Array<{ label: string }>)?.map(c => c.label).join(', ') || '—',
    },
    {
      key: 'publicPrice', header: 'Prezzo Pub.',
      render: (item: Record<string, unknown>) =>
        item.publicPrice != null ? `€ ${(item.publicPrice as number).toFixed(2)}` : '—',
    },
    {
      key: 'color', header: 'Colore',
      render: (item: Record<string, unknown>) => item.color ? 'Sì' : 'No',
    },
  ]

  const actions = [
    { label: 'Modifica', onClick: (item: Record<string, unknown>) => openEdit(item as unknown as AdminMarmistaArticle) },
    { label: 'Elimina', onClick: (item: Record<string, unknown>) => setDeletingId(item.id as string), variant: 'danger' as const },
  ]

  return (
    <div>
      <div className="admin-page-intro">
        <div>
          <p className="admin-page-kicker">Catalogo marmisti</p>
          <h1 className="admin-page-title">Articoli Marmisti</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsClearConfirmOpen(true)} className="admin-button-danger">Svuota tabella</button>
          <button onClick={() => setTab('import')} className="admin-button-secondary">Importa CSV / XLSX</button>
          <button onClick={openCreate} className="admin-button-primary">+ Aggiungi</button>
        </div>
      </div>

      <div className="admin-tabbar">
        {(['list', 'import'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={['admin-tab', tab === t ? 'admin-tab-active' : ''].join(' ')}>
            {t === 'list' ? 'Lista' : 'Importa CSV / XLSX'}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <DataTable columns={columns} data={items as unknown as Record<string, unknown>[]} keyField="id" actions={actions} isLoading={isLoading} searchable />
      )}

      {tab === 'import' && (
        <div className="admin-panel max-w-2xl p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#1A2B4A]">Colonne richieste nel file</p>
              <button
                type="button"
                onClick={async () => {
                  const blob = await articlesApi.marmista.downloadTemplate()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'template-marmisti.xlsx'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="admin-button-secondary text-xs"
              >
                Scarica template
              </button>
            </div>
            <div className="border border-[#E5E0D8] overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#F8F7F4]">
                  <tr className="border-b border-[#E5E0D8]">
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[#1A2B4A]">Colonna</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[#1A2B4A]">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D8] bg-white">
                  {[
                    { col: 'codice', note: 'Obbligatorio. Usato come chiave per upsert.' },
                    { col: 'descrizione', note: '' },
                    { col: 'note', note: 'Opzionale.' },
                    { col: 'prezzo_pubblico', note: 'Numero decimale. Opzionale.' },
                    { col: 'categorie', note: 'Codici separati da punto e virgola (es. CAT1;CAT2). Obbligatorio.' },
                    { col: 'pagina_pdf', note: 'Numero intero. Opzionale.' },
                    { col: 'accessorio_id', note: 'Codice articolo accessorio marmista. Opzionale.' },
                    { col: 'colore', note: 'true / false (o 1 / 0). Opzionale, default false.' },
                  ].map(({ col, note }) => (
                    <tr key={col}>
                      <td className="px-3 py-2"><code className="admin-code">{col}</code></td>
                      <td className="px-3 py-2 text-[#6B7280]">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[#1A2B4A]">Carica file</p>
            <label className="block">
              <span className="sr-only">Scegli file</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} disabled={isImporting}
                className="admin-file-input disabled:opacity-50" />
            </label>
          </div>

          {isImporting && <p className="text-sm text-[#6B7280]">Importazione in corso…</p>}

          {importResult && (
            <div className="space-y-4">
              <div className="flex gap-6 text-sm">
                <span className="font-medium text-green-600">Importati: {importResult.imported}</span>
                <span className="font-medium text-yellow-600">Saltati: {importResult.skipped}</span>
              </div>
              {importResult.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-2">Errori ({importResult.errors.length})</p>
                  <div className="overflow-hidden border border-red-200">
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="px-3 py-2 text-xs text-red-700 border-b border-red-100 last:border-0 bg-red-50">
                        Riga {e.row} — {e.code || '(no codice)'}: {e.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <FormModal isOpen={isCreating || !!editing} title={editing ? 'Modifica Articolo' : 'Nuovo Articolo'} onClose={closeModal} onSubmit={onSubmit} isSubmitting={isSubmitting}>
        <div className="space-y-4">
          <div>
            <label className="admin-label">Codice <span className="text-red-500">*</span></label>
            <input {...register('code', { required: 'Obbligatorio' })} className="admin-input" />
            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
          </div>
          <div>
            <label className="admin-label">Descrizione <span className="text-red-500">*</span></label>
            <input {...register('description', { required: 'Obbligatorio' })} className="admin-input" />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Prezzo Pubblico (€)</label>
              <input type="number" step="0.01" {...register('publicPrice')} className="admin-input" />
            </div>
            <div>
              <label className="admin-label">Pagina PDF</label>
              <input type="number" {...register('pdfPage')} className="admin-input" />
            </div>
          </div>
          <MultiSelect
            label="Categorie"
            options={availableCategories}
            value={watch('categoryIds')}
            onChange={val => setValue('categoryIds', val)}
          />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="color" {...register('color')} className="w-4 h-4 accent-[#1A2B4A]" />
            <label htmlFor="color" className="admin-label mb-0 cursor-pointer">Disponibile a colori</label>
          </div>
          <div>
            <label className="admin-label">Note</label>
            <textarea {...register('notes')} rows={2} className="admin-textarea" />
          </div>
        </div>
      </FormModal>

      <ConfirmDialog isOpen={!!deletingId} title="Elimina Articolo" message="Eliminare questo articolo marmista?" onConfirm={handleDelete} onCancel={() => setDeletingId(null)} isConfirming={isDeleting} confirmLabel="Elimina" />

      <ConfirmDialog isOpen={isClearConfirmOpen} title="Svuota tabella Articoli Marmisti" message="Stai per eliminare TUTTI gli articoli marmisti. Questa operazione non è reversibile. Continuare?" onConfirm={handleClearAll} onCancel={() => setIsClearConfirmOpen(false)} isConfirming={isClearing} confirmLabel="Svuota tutto" />
    </div>
  )
}

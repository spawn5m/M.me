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
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<AdminLookup[]>([])

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: { categoryIds: [] },
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
    reset({ code: '', description: '', notes: '', pdfPage: '', publicPrice: '', categoryIds: [] })
    setIsCreating(true)
  }

  const openEdit = (item: AdminMarmistaArticle) => {
    reset({
      code: item.code,
      description: item.description,
      notes: item.notes ?? '',
      pdfPage: item.pdfPage?.toString() ?? '',
      publicPrice: item.publicPrice?.toString() ?? '',
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
          <button onClick={() => setTab('import')} className="admin-button-secondary">Import Excel</button>
          <button onClick={openCreate} className="admin-button-primary">+ Aggiungi</button>
        </div>
      </div>

      <div className="admin-tabbar">
        {(['list', 'import'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={['admin-tab', tab === t ? 'admin-tab-active' : ''].join(' ')}>
            {t === 'list' ? 'Lista' : 'Import Excel'}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <DataTable columns={columns} data={items as unknown as Record<string, unknown>[]} keyField="id" actions={actions} isLoading={isLoading} searchable />
      )}

      {tab === 'import' && (
        <div className="admin-panel max-w-xl p-6">
          <p className="mb-4 text-sm text-[#6B7280]">Carica un file Excel con colonne: <code className="admin-code">codice, descrizione, note, prezzo_pubblico, categorie</code></p>
          <input type="file" accept=".xlsx,.xls" onChange={handleImport} disabled={isImporting}
            className="admin-file-input disabled:opacity-50" />
          {isImporting && <p className="text-sm text-[#6B7280] mt-3">Importazione in corso…</p>}
          {importResult && (
            <div className="mt-4 text-sm">
              <span className="mr-4 font-medium text-green-600">Importati: {importResult.imported}</span>
              <span className="font-medium text-yellow-600">Saltati: {importResult.skipped}</span>
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
          <div>
            <label className="admin-label">Note</label>
            <textarea {...register('notes')} rows={2} className="admin-textarea" />
          </div>
        </div>
      </FormModal>

      <ConfirmDialog isOpen={!!deletingId} title="Elimina Articolo" message="Eliminare questo articolo marmista?" onConfirm={handleDelete} onCancel={() => setDeletingId(null)} isConfirming={isDeleting} confirmLabel="Elimina" />
    </div>
  )
}

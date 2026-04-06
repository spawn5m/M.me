import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { articlesApi } from '../../lib/api/articles'
import DataTable from '../../components/admin/DataTable'
import FormModal from '../../components/admin/FormModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import type { AdminCoffinArticle, ImportResult } from '../../../../backend/src/types/shared'

interface CoffinFormData {
  code: string
  description: string
  notes: string
}

type Tab = 'list' | 'import'

export default function CoffinsPage() {
  const [tab, setTab] = useState<Tab>('list')
  const [items, setItems] = useState<AdminCoffinArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editing, setEditing] = useState<AdminCoffinArticle | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CoffinFormData>()

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await articlesApi.coffins.list()
      setItems(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    reset({ code: '', description: '', notes: '' })
    setIsCreating(true)
  }

  const openEdit = (item: AdminCoffinArticle) => {
    reset({ code: item.code, description: item.description, notes: item.notes ?? '' })
    setEditing(item)
  }

  const closeModal = () => {
    setIsCreating(false)
    setEditing(null)
    reset()
  }

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true)
    try {
      if (editing) {
        await articlesApi.coffins.update(editing.id, data)
      } else {
        await articlesApi.coffins.create(data)
      }
      closeModal()
      load()
    } finally {
      setIsSubmitting(false)
    }
  })

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      await articlesApi.coffins.remove(deletingId)
      setDeletingId(null)
      load()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    setImportResult(null)
    try {
      const result = await articlesApi.coffins.import(file)
      setImportResult(result)
      load()
    } finally {
      setIsImporting(false)
      e.target.value = ''
    }
  }

  const columns = [
    { key: 'code', header: 'Codice', width: '120px' },
    { key: 'description', header: 'Descrizione' },
    {
      key: 'categories',
      header: 'Categorie',
      render: (item: Record<string, unknown>) => {
        const cats = item.categories as Array<{ label: string }>
        return cats?.map(c => c.label).join(', ') || '—'
      },
    },
    {
      key: 'measure',
      header: 'Misura',
      render: (item: Record<string, unknown>) => {
        const m = item.measure as { label: string } | null
        return m?.label ?? '—'
      },
    },
  ]

  const actions = [
    { label: 'Modifica', onClick: (item: Record<string, unknown>) => openEdit(item as unknown as AdminCoffinArticle) },
    { label: 'Elimina', onClick: (item: Record<string, unknown>) => setDeletingId(item.id as string), variant: 'danger' as const },
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl text-[#1A2B4A]" style={{ fontFamily: 'Playfair Display, serif' }}>
          Cofani
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setTab('import')}
            className="border border-[#1A2B4A] text-[#1A2B4A] px-4 py-2 text-sm font-medium rounded hover:bg-[#F8F7F4] transition-colors"
          >
            Import Excel
          </button>
          <button
            onClick={openCreate}
            className="bg-[#1A2B4A] text-white px-4 py-2 text-sm font-medium rounded hover:bg-[#2C4A7C] transition-colors"
          >
            + Aggiungi
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[#E5E0D8] mb-6">
        {(['list', 'import'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-[#1A2B4A] text-[#1A2B4A]'
                : 'border-transparent text-[#6B7280] hover:text-[#1A2B4A]'
            ].join(' ')}
          >
            {t === 'list' ? 'Lista' : 'Import Excel'}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <DataTable
          columns={columns}
          data={items as unknown as Record<string, unknown>[]}
          keyField="id"
          actions={actions}
          isLoading={isLoading}
        />
      )}

      {tab === 'import' && (
        <div className="max-w-xl">
          <p className="text-sm text-[#6B7280] mb-4">
            Carica un file Excel (.xlsx) con colonne: <code className="bg-[#F8F7F4] px-1 rounded">codice, descrizione, note, categorie, misura</code>
          </p>
          <label className="block">
            <span className="sr-only">Scegli file Excel</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              disabled={isImporting}
              className="block w-full text-sm text-[#6B7280] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[#1A2B4A] file:text-white hover:file:bg-[#2C4A7C] disabled:opacity-50"
            />
          </label>
          {isImporting && <p className="text-sm text-[#6B7280] mt-3">Importazione in corso…</p>}

          {importResult && (
            <div className="mt-6 space-y-4">
              <div className="flex gap-6 text-sm">
                <span className="text-green-600 font-medium">✓ Importati: {importResult.imported}</span>
                <span className="text-yellow-600 font-medium">⚠ Saltati: {importResult.skipped}</span>
              </div>
              {importResult.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-2">Errori ({importResult.errors.length})</p>
                  <div className="border border-red-200 rounded overflow-hidden">
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="px-3 py-2 text-xs text-red-700 border-b border-red-100 last:border-0 bg-red-50">
                        Riga {e.row} — {e.code || '(no codice)'}: {e.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {importResult.warnings.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-yellow-600 mb-2">Avvisi ({importResult.warnings.length})</p>
                  <div className="border border-yellow-200 rounded overflow-hidden">
                    {importResult.warnings.map((w, i) => (
                      <div key={i} className="px-3 py-2 text-xs text-yellow-700 border-b border-yellow-100 last:border-0 bg-yellow-50">
                        Riga {w.row} — {w.code}: {w.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <FormModal
        isOpen={isCreating || !!editing}
        title={editing ? 'Modifica Cofano' : 'Nuovo Cofano'}
        onClose={closeModal}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Codice <span className="text-red-500">*</span>
            </label>
            <input
              {...register('code', { required: 'Il codice è obbligatorio' })}
              className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1A2B4A]"
            />
            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Descrizione <span className="text-red-500">*</span>
            </label>
            <input
              {...register('description', { required: 'La descrizione è obbligatoria' })}
              className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1A2B4A]"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Note</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1A2B4A] resize-none"
            />
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Elimina Cofano"
        message="Sei sicuro di voler eliminare questo articolo? L'operazione non è reversibile."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        isConfirming={isDeleting}
        confirmLabel="Elimina"
      />
    </div>
  )
}

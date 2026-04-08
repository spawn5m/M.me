import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { articlesApi } from '../../lib/api/articles'
import { lookupsApi } from '../../lib/api/lookups'
import DataTable from '../../components/admin/DataTable'
import FormModal from '../../components/admin/FormModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import type { AdminCoffinArticle, AdminLookup, ImportResult } from '../../../../backend/src/types/shared'

interface CoffinFormData {
  code: string
  description: string
  notes: string
  measureId: string
  categoryIds: string[]
  subcategoryIds: string[]
  essenceIds: string[]
  figureIds: string[]
  colorIds: string[]
  finishIds: string[]
}

type Tab = 'list' | 'import'

const COFFIN_LOOKUP_LINKS = [
  { label: 'Misure', to: '/admin/measures' },
  { label: 'Categorie', to: '/admin/lookups/coffin-categories' },
  { label: 'Sottocategorie', to: '/admin/lookups/coffin-subcategories' },
  { label: 'Essenze', to: '/admin/lookups/essences' },
  { label: 'Figure', to: '/admin/lookups/figures' },
  { label: 'Colori', to: '/admin/lookups/colors' },
  { label: 'Finiture', to: '/admin/lookups/finishes' },
] as const

const LOOKUP_TYPES = {
  measures: 'coffin-measures',
  categories: 'coffin-categories',
  subcategories: 'coffin-subcategories',
  essences: 'essences',
  figures: 'figures',
  colors: 'colors',
  finishes: 'finishes',
} as const

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

function sortLookupOptions(options: AdminLookup[]) {
  return [...options].sort((a, b) =>
    a.label.localeCompare(b.label, 'it', { sensitivity: 'base' })
  )
}

function MultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: AdminLookup[]
  value: string[]
  onChange: (val: string[]) => void
}) {
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }

  return (
    <div>
      <label className="admin-label">{label}</label>
      <div className="max-h-32 overflow-y-auto border border-[#E5E0D8] bg-white p-2">
        <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={`admin-inline-chip ${
              value.includes(opt.id)
                ? 'admin-inline-chip-active'
                : ''
            }`}
          >
            {opt.label}
          </button>
        ))}
        </div>
      </div>
    </div>
  )
}

function SingleSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: AdminLookup[]
  value: string
  onChange: (val: string) => void
}) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="admin-select"
      >
        <option value="">— Nessuno —</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [lookups, setLookups] = useState<Record<string, AdminLookup[]>>({})
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CoffinFormData>({
    defaultValues: {
      code: '',
      description: '',
      notes: '',
      measureId: '',
      categoryIds: [],
      subcategoryIds: [],
      essenceIds: [],
      figureIds: [],
      colorIds: [],
      finishIds: [],
    },
  })

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await articlesApi.coffins.list()
      setItems(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadLookups = useCallback(async () => {
    const types = Object.values(LOOKUP_TYPES)
    const results = await Promise.all(
      types.map(async type => {
        const res = await lookupsApi.list(type)
        return [type, res.data] as [string, AdminLookup[]]
      })
    )
    setLookups(Object.fromEntries(results))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadLookups() }, [loadLookups])
  useEffect(() => () => {
    if (imageObjectUrl) {
      URL.revokeObjectURL(imageObjectUrl)
    }
  }, [imageObjectUrl])

  const resetImageState = useCallback((previewUrl: string | null = null) => {
    setImageFile(null)
    setImagePreviewUrl(previewUrl)
    setImageObjectUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }
      return null
    })

    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }, [])

  const openCreate = () => {
    reset({
      code: '',
      description: '',
      notes: '',
      measureId: '',
      categoryIds: [],
      subcategoryIds: [],
      essenceIds: [],
      figureIds: [],
      colorIds: [],
      finishIds: [],
    })
    setSubmitError(null)
    resetImageState(null)
    setIsCreating(true)
  }

  const openEdit = (item: AdminCoffinArticle) => {
    reset({
      code: item.code,
      description: item.description,
      notes: item.notes ?? '',
      measureId: item.measure?.id ?? '',
      categoryIds: item.categories.map(c => c.id),
      subcategoryIds: item.subcategories.map(c => c.id),
      essenceIds: item.essences.map(c => c.id),
      figureIds: item.figures.map(c => c.id),
      colorIds: item.colors.map(c => c.id),
      finishIds: item.finishes.map(c => c.id),
    })
    setSubmitError(null)
    resetImageState(item.imageUrl)
    setEditing(item)
  }

  const closeModal = () => {
    setIsCreating(false)
    setEditing(null)
    setSubmitError(null)
    resetImageState(null)
    reset()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      resetImageState(editing?.imageUrl ?? null)
      return
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      setSubmitError('Formato immagine non supportato. Usa JPG, PNG o WEBP.')
      resetImageState(editing?.imageUrl ?? null)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setSubmitError(null)
    setImageFile(file)
    setImagePreviewUrl(objectUrl)
    setImageObjectUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }
      return objectUrl
    })
  }

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload = {
        ...data,
        measureId: data.measureId || null,
      }

      const savedItem = editing
        ? await articlesApi.coffins.update(editing.id, payload)
        : await articlesApi.coffins.create(payload)

      if (imageFile) {
        try {
          await articlesApi.coffins.uploadImage(savedItem.id, imageFile)
        } catch {
          if (!editing) {
            setIsCreating(false)
            setEditing(savedItem)
          }

          setSubmitError('Articolo salvato, ma il caricamento dell\'immagine non è riuscito. Puoi riprovare.')
          await load()
          return
        }
      }

      closeModal()
      await load()
    } catch {
      setSubmitError('Impossibile salvare l\'articolo. Verifica i dati e riprova.')
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
    <div>
      <div className="admin-page-intro">
        <div>
          <p className="admin-page-kicker">Catalogo cofani</p>
          <h1 className="admin-page-title">Cofani</h1>
          <p className="admin-page-description">
            Gestione degli articoli principali e dei relativi campi secondari usati nel catalogo e nei listini.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setTab('import')}
            className="admin-button-secondary"
          >
            Import Excel
          </button>
          <button
            onClick={openCreate}
            className="admin-button-primary"
          >
            + Aggiungi
          </button>
        </div>
      </div>

      <div className="admin-panel mb-6 p-4">
        <p className="mb-3 text-sm font-medium text-[#031634]">Gestione campi secondari</p>
        <div className="flex flex-wrap gap-2">
          {COFFIN_LOOKUP_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="admin-inline-chip"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="admin-tabbar">
        {(['list', 'import'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={['admin-tab', tab === t ? 'admin-tab-active' : ''].join(' ')}
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
          searchable
        />
      )}

      {tab === 'import' && (
        <div className="admin-panel max-w-xl p-6">
          <p className="mb-4 text-sm text-[#6B7280]">
            Carica un file Excel (.xlsx) con colonne: <code className="admin-code">codice, descrizione, note, categorie, misura</code>
          </p>
          <label className="block">
            <span className="sr-only">Scegli file Excel</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              disabled={isImporting}
              className="admin-file-input disabled:opacity-50"
            />
          </label>
          {isImporting && <p className="text-sm text-[#6B7280] mt-3">Importazione in corso…</p>}

          {importResult && (
            <div className="mt-6 space-y-4">
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
              {importResult.warnings.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-yellow-600 mb-2">Avvisi ({importResult.warnings.length})</p>
                  <div className="overflow-hidden border border-yellow-200">
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
        panelClassName="max-w-6xl"
        bodyClassName="pb-6"
      >
        <div className="space-y-6">
          {submitError && (
            <div className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <label className="admin-label">
                    Codice <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('code', { required: 'Il codice è obbligatorio' })}
                    className="admin-input"
                  />
                  {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
                </div>
                <div>
                  <label className="admin-label">
                    Descrizione <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('description', { required: 'La descrizione è obbligatoria' })}
                    className="admin-input"
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                </div>
              </div>

              <SingleSelect
                label="Misura"
                options={sortLookupOptions(lookups[LOOKUP_TYPES.measures] || [])}
                value={watch('measureId')}
                onChange={val => setValue('measureId', val)}
              />

              <div>
                <label className="admin-label">Immagine</label>
                <div className="space-y-3 border border-[#E5E0D8] bg-[#F8F7F4] p-4">
                  {imagePreviewUrl ? (
                    <img
                      src={imagePreviewUrl}
                      alt="Anteprima cofano"
                      className="h-64 w-full border border-[#E5E0D8] bg-white object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center border border-dashed border-[#D6D3CD] bg-white text-sm text-[#6B7280]">
                      Nessuna immagine selezionata
                    </div>
                  )}

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="admin-file-input"
                  />

                  <div className="flex flex-col gap-2 text-xs text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
                    <span>Formati supportati: JPG, PNG, WEBP. Il file viene caricato al salvataggio.</span>
                    {imageFile && (
                      <button
                        type="button"
                        onClick={() => resetImageState(editing?.imageUrl ?? null)}
                        className="font-medium text-[#031634] transition-colors hover:text-[#C9A96E]"
                      >
                        Annulla nuova immagine
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="admin-label">Note</label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="admin-textarea"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MultiSelect
                label="Categorie"
                options={sortLookupOptions(lookups[LOOKUP_TYPES.categories] || [])}
                value={watch('categoryIds')}
                onChange={val => setValue('categoryIds', val)}
              />

              <MultiSelect
                label="Sottocategorie"
                options={sortLookupOptions(lookups[LOOKUP_TYPES.subcategories] || [])}
                value={watch('subcategoryIds')}
                onChange={val => setValue('subcategoryIds', val)}
              />

              <MultiSelect
                label="Essenze"
                options={sortLookupOptions(lookups[LOOKUP_TYPES.essences] || [])}
                value={watch('essenceIds')}
                onChange={val => setValue('essenceIds', val)}
              />

              <MultiSelect
                label="Figure"
                options={sortLookupOptions(lookups[LOOKUP_TYPES.figures] || [])}
                value={watch('figureIds')}
                onChange={val => setValue('figureIds', val)}
              />

              <MultiSelect
                label="Colori"
                options={sortLookupOptions(lookups[LOOKUP_TYPES.colors] || [])}
                value={watch('colorIds')}
                onChange={val => setValue('colorIds', val)}
              />

              <MultiSelect
                label="Finiture"
                options={sortLookupOptions(lookups[LOOKUP_TYPES.finishes] || [])}
                value={watch('finishIds')}
                onChange={val => setValue('finishIds', val)}
              />
            </div>
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

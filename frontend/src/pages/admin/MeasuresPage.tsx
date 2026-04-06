import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'
import DataTable from '../../components/admin/DataTable'
import FormModal from '../../components/admin/FormModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'

interface CoffinMeasure {
  id: string
  code: string
  label: string
  head: number
  feet: number
  shoulder: number
  height: number
  width: number
  depth: number
}

interface MeasureFormData {
  code: string
  label: string
  head: string
  feet: string
  shoulder: string
  height: string
  width: string
  depth: string
}

export default function MeasuresPage() {
  const [items, setItems] = useState<CoffinMeasure[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editing, setEditing] = useState<CoffinMeasure | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MeasureFormData>()

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get<{ data: CoffinMeasure[] }>('/admin/lookups/coffin-measures')
      setItems(res.data.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    reset({ code: '', label: '', head: '', feet: '', shoulder: '', height: '', width: '', depth: '' })
    setIsCreating(true)
  }

  const openEdit = (item: CoffinMeasure) => {
    reset({
      code: item.code,
      label: item.label,
      head: String(item.head),
      feet: String(item.feet),
      shoulder: String(item.shoulder),
      height: String(item.height),
      width: String(item.width),
      depth: String(item.depth),
    })
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
      const payload = {
        code: data.code,
        label: data.label,
        head: parseFloat(data.head),
        feet: parseFloat(data.feet),
        shoulder: parseFloat(data.shoulder),
        height: parseFloat(data.height),
        width: parseFloat(data.width),
        depth: parseFloat(data.depth),
      }
      if (editing) {
        await api.put(`/admin/lookups/coffin-measures/${editing.id}`, payload)
      } else {
        await api.post('/admin/lookups/coffin-measures', payload)
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
      await api.delete(`/admin/lookups/coffin-measures/${deletingId}`)
      setDeletingId(null)
      load()
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
    { key: 'code', header: 'Codice', width: '100px' },
    { key: 'label', header: 'Etichetta' },
    { key: 'head', header: 'Testa', width: '80px' },
    { key: 'feet', header: 'Piedi', width: '80px' },
    { key: 'shoulder', header: 'Spalle', width: '80px' },
    { key: 'height', header: 'Altezza', width: '80px' },
    { key: 'width', header: 'Larghezza', width: '80px' },
    { key: 'depth', header: 'Profondità', width: '80px' },
  ]

  const actions = [
    { label: 'Modifica', onClick: (item: Record<string, unknown>) => openEdit(item as unknown as CoffinMeasure) },
    { label: 'Elimina', onClick: (item: Record<string, unknown>) => setDeletingId(item.id as string), variant: 'danger' as const },
  ]

  return (
    <div>
      <div className="admin-page-intro">
        <div>
          <p className="admin-page-kicker">Parametri dimensionali</p>
          <h1 className="admin-page-title">Misure Cofani</h1>
        </div>
        <button
          onClick={openCreate}
          className="admin-button-primary"
        >
          + Aggiungi
        </button>
      </div>

      <DataTable
        columns={columns}
        data={items as unknown as Record<string, unknown>[]}
        keyField="id"
        actions={actions}
        isLoading={isLoading}
      />

      <FormModal
        isOpen={isCreating || !!editing}
        title={editing ? 'Modifica Misura' : 'Nuova Misura'}
        onClose={closeModal}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">
                Codice <span className="text-red-500">*</span>
              </label>
              <input
                {...register('code', { required: 'Il codice è obbligatorio' })}
                className="admin-input"
                placeholder="es. MIS1"
              />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="admin-label">
                Etichetta <span className="text-red-500">*</span>
              </label>
              <input
                {...register('label', { required: "L'etichetta è obbligatoria" })}
                className="admin-input"
                placeholder="es. Standard 200cm"
              />
              {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="admin-label">Testa (cm)</label>
              <input
                type="number"
                step="0.1"
                {...register('head', { required: 'Campo obbligatorio' })}
                className="admin-input"
              />
              {errors.head && <p className="text-red-500 text-xs mt-1">{errors.head.message}</p>}
            </div>
            <div>
              <label className="admin-label">Piedi (cm)</label>
              <input
                type="number"
                step="0.1"
                {...register('feet', { required: 'Campo obbligatorio' })}
                className="admin-input"
              />
              {errors.feet && <p className="text-red-500 text-xs mt-1">{errors.feet.message}</p>}
            </div>
            <div>
              <label className="admin-label">Spalle (cm)</label>
              <input
                type="number"
                step="0.1"
                {...register('shoulder', { required: 'Campo obbligatorio' })}
                className="admin-input"
              />
              {errors.shoulder && <p className="text-red-500 text-xs mt-1">{errors.shoulder.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="admin-label">Altezza (cm)</label>
              <input
                type="number"
                step="0.1"
                {...register('height', { required: 'Campo obbligatorio' })}
                className="admin-input"
              />
              {errors.height && <p className="text-red-500 text-xs mt-1">{errors.height.message}</p>}
            </div>
            <div>
              <label className="admin-label">Larghezza (cm)</label>
              <input
                type="number"
                step="0.1"
                {...register('width', { required: 'Campo obbligatorio' })}
                className="admin-input"
              />
              {errors.width && <p className="text-red-500 text-xs mt-1">{errors.width.message}</p>}
            </div>
            <div>
              <label className="admin-label">Profondità (cm)</label>
              <input
                type="number"
                step="0.1"
                {...register('depth', { required: 'Campo obbligatorio' })}
                className="admin-input"
              />
              {errors.depth && <p className="text-red-500 text-xs mt-1">{errors.depth.message}</p>}
            </div>
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Elimina Misura"
        message="Sei sicuro di voler eliminare questa misura? L'operazione non è reversibile."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        isConfirming={isDeleting}
        confirmLabel="Elimina"
      />
    </div>
  )
}

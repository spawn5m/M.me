import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { lookupsApi } from '../../lib/api/lookups'
import DataTable from '../../components/admin/DataTable'
import FormModal from '../../components/admin/FormModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import type { AdminLookup } from '../../../../backend/src/types/shared'

const LOOKUP_LABELS: Record<string, string> = {
  'coffin-categories': 'Categorie Cofani',
  'coffin-subcategories': 'Sottocategorie Cofani',
  'essences': 'Essenze',
  'figures': 'Figure',
  'colors': 'Colori',
  'finishes': 'Finiture',
  'accessory-categories': 'Categorie Accessori',
  'accessory-subcategories': 'Sottocategorie Accessori',
  'marmista-categories': 'Categorie Marmisti',
}

interface LookupFormData {
  code: string
  label: string
}

export default function LookupPage() {
  const { type } = useParams<{ type: string }>()
  const [items, setItems] = useState<AdminLookup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editing, setEditing] = useState<AdminLookup | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LookupFormData>()

  const load = useCallback(async () => {
    if (!type) return
    setIsLoading(true)
    try {
      const res = await lookupsApi.list(type)
      setItems(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [type])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    reset({ code: '', label: '' })
    setIsCreating(true)
  }

  const openEdit = (item: AdminLookup) => {
    reset({ code: item.code, label: item.label })
    setEditing(item)
  }

  const closeModal = () => {
    setIsCreating(false)
    setEditing(null)
    reset()
  }

  const onSubmit = handleSubmit(async (data) => {
    if (!type) return
    setIsSubmitting(true)
    try {
      if (editing) {
        await lookupsApi.update(type, editing.id, data)
      } else {
        await lookupsApi.create(type, data)
      }
      closeModal()
      load()
    } finally {
      setIsSubmitting(false)
    }
  })

  const handleDelete = async () => {
    if (!type || !deletingId) return
    setIsDeleting(true)
    try {
      await lookupsApi.remove(type, deletingId)
      setDeletingId(null)
      load()
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
    { key: 'code', header: 'Codice' },
    { key: 'label', header: 'Label' },
  ]

  const actions = [
    { label: 'Modifica', onClick: (item: Record<string, unknown>) => openEdit(item as unknown as AdminLookup) },
    { label: 'Elimina', onClick: (item: Record<string, unknown>) => setDeletingId(item.id as string), variant: 'danger' as const },
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1
          className="text-2xl text-[#1A2B4A]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          {LOOKUP_LABELS[type ?? ''] ?? type}
        </h1>
        <button
          onClick={openCreate}
          className="bg-[#1A2B4A] text-white px-4 py-2 text-sm font-medium rounded hover:bg-[#2C4A7C] transition-colors"
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
        title={editing ? 'Modifica elemento' : 'Nuovo elemento'}
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
              placeholder="es. CAT1"
            />
            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              {...register('label', { required: 'La label è obbligatoria' })}
              className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1A2B4A]"
              placeholder="es. Categoria 1"
            />
            {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label.message}</p>}
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Elimina elemento"
        message="Sei sicuro di voler eliminare questo elemento? L'operazione non è reversibile."
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        isConfirming={isDeleting}
        confirmLabel="Elimina"
      />
    </div>
  )
}

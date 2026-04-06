import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { pricelistsApi } from '../../lib/api/pricelists'
import DataTable from '../../components/admin/DataTable'
import FormModal from '../../components/admin/FormModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import type { AdminPriceList } from '../../../../backend/src/types/shared'

interface WizardStep1 {
  name: string
  type: 'sale' | 'purchase'
  articleType: 'funeral' | 'marmista'
  isDerivato: boolean
  parentId: string
}

export default function PriceListsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AdminPriceList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<WizardStep1>({
    defaultValues: { type: 'sale', articleType: 'funeral', isDerivato: false },
  })
  const isDerivato = watch('isDerivato')

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await pricelistsApi.list()
      setItems(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    reset({ name: '', type: 'sale', articleType: 'funeral', isDerivato: false, parentId: '' })
    setIsCreating(true)
  }

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true)
    try {
      await pricelistsApi.create({
        name: data.name,
        type: data.type,
        articleType: data.articleType,
        parentId: data.isDerivato && data.parentId ? data.parentId : null,
        autoUpdate: data.isDerivato,
      })
      setIsCreating(false)
      reset()
      load()
    } finally {
      setIsSubmitting(false)
    }
  })

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      await pricelistsApi.remove(deletingId)
      setDeletingId(null)
      load()
    } finally {
      setIsDeleting(false)
    }
  }

  const baseListinos = items.filter(pl => !pl.parentId)

  const columns = [
    { key: 'name', header: 'Nome' },
    {
      key: 'type', header: 'Tipo',
      render: (item: Record<string, unknown>) => item.type === 'purchase' ? 'Acquisto' : 'Vendita',
    },
    {
      key: 'articleType', header: 'Dominio',
      render: (item: Record<string, unknown>) => item.articleType === 'funeral' ? 'Funebre' : 'Marmista',
    },
    {
      key: 'parentId', header: 'Base/Derivato',
      render: (item: Record<string, unknown>) => item.parentId ? 'Derivato' : 'Base',
    },
    {
      key: 'autoUpdate', header: 'Auto-update',
      render: (item: Record<string, unknown>) => item.autoUpdate ? '✓' : '—',
    },
    {
      key: '_count', header: '# Articoli',
      render: (item: Record<string, unknown>) => {
        const count = item._count as { items: number }
        return String(count?.items ?? 0)
      },
    },
  ]

  const actions = [
    { label: 'Dettaglio', onClick: (item: Record<string, unknown>) => navigate(`/admin/pricelists/${item.id}`) },
    { label: 'Elimina', onClick: (item: Record<string, unknown>) => setDeletingId(item.id as string), variant: 'danger' as const },
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl text-[#1A2B4A]" style={{ fontFamily: 'Playfair Display, serif' }}>Listini Prezzi</h1>
        <button onClick={openCreate} className="bg-[#1A2B4A] text-white px-4 py-2 text-sm font-medium rounded hover:bg-[#2C4A7C] transition-colors">
          + Nuovo Listino
        </button>
      </div>

      <DataTable columns={columns} data={items as unknown as Record<string, unknown>[]} keyField="id" actions={actions} isLoading={isLoading} />

      <FormModal isOpen={isCreating} title="Nuovo Listino" onClose={() => setIsCreating(false)} onSubmit={onSubmit} isSubmitting={isSubmitting} submitLabel="Crea Listino">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Nome <span className="text-red-500">*</span></label>
            <input {...register('name', { required: 'Obbligatorio' })} className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1A2B4A]" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Tipo</label>
              <select {...register('type')} className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1A2B4A] bg-white">
                <option value="sale">Vendita</option>
                <option value="purchase">Acquisto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Dominio</label>
              <select {...register('articleType')} className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1A2B4A] bg-white">
                <option value="funeral">Funebre</option>
                <option value="marmista">Marmista</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isDerivato" {...register('isDerivato')} className="rounded border-[#E5E0D8]" />
            <label htmlFor="isDerivato" className="text-sm text-[#1A1A1A]">Listino derivato (basato su un listino padre)</label>
          </div>
          {isDerivato && (
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Listino padre</label>
              <select {...register('parentId')} className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1A2B4A] bg-white">
                <option value="">— Seleziona —</option>
                {baseListinos.map(pl => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </FormModal>

      <ConfirmDialog isOpen={!!deletingId} title="Elimina Listino" message="Eliminare questo listino? Tutti gli articoli e le regole associate verranno rimossi." onConfirm={handleDelete} onCancel={() => setDeletingId(null)} isConfirming={isDeleting} confirmLabel="Elimina" />
    </div>
  )
}

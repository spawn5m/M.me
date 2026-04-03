import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import DataTable from '../../components/admin/DataTable'
import FormModal from '../../components/admin/FormModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import { rolesApi } from '../../lib/admin/roles-api'
import type { AdminRole } from '../../../../backend/src/types/shared'

const createSchema = z.object({
  name: z.string().regex(/^[a-z_]+$/, 'Solo lettere minuscole e underscore'),
  label: z.string().min(1, 'Obbligatorio')
})

type CreateFormValues = z.infer<typeof createSchema>

const columns = [
  {
    key: 'label',
    header: 'Nome visualizzato',
    render: (r: AdminRole) => (
      <span className="font-medium text-[#1A2B4A]">{r.label}</span>
    )
  },
  {
    key: 'name',
    header: 'Identificatore',
    render: (r: AdminRole) => (
      <code className="text-xs bg-[#F8F7F4] px-2 py-0.5 rounded font-mono text-[#6B7280]">
        {r.name}
      </code>
    )
  },
  {
    key: 'isSystem',
    header: 'Tipo',
    render: (r: AdminRole) => (
      <span className={[
        'text-xs px-2 py-0.5 rounded-full font-medium',
        r.isSystem
          ? 'bg-[#1A2B4A] text-white'
          : 'bg-[#C9A96E]/20 text-[#C9A96E]'
      ].join(' ')}>
        {r.isSystem ? 'Sistema' : 'Custom'}
      </span>
    )
  }
]

export default function RolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<AdminRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema)
  })

  const loadRoles = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await rolesApi.list()
      setRoles(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadRoles() }, [loadRoles])

  const onSubmit = async (values: CreateFormValues) => {
    try {
      await rolesApi.create(values)
      reset()
      setShowCreateModal(false)
      loadRoles()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Errore durante la creazione')
    }
  }

  const handleDelete = async () => {
    if (!confirmTarget) return
    try {
      await rolesApi.delete(confirmTarget.id)
      setConfirmTarget(null)
      loadRoles()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Impossibile eliminare il ruolo')
      setConfirmTarget(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-2xl text-[#1A2B4A]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          Ruoli
        </h2>
        <button
          onClick={() => { setError(null); reset(); setShowCreateModal(true) }}
          className="px-4 py-2 bg-[#1A2B4A] text-white text-sm rounded hover:bg-[#2C4A7C] transition-colors"
        >
          + Nuovo ruolo
        </button>
      </div>

      {error && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <DataTable<AdminRole & Record<string, unknown>>
        columns={columns as never}
        data={roles as never}
        keyField="id"
        isLoading={isLoading}
        actions={[
          {
            label: 'Elimina',
            variant: 'danger',
            onClick: (r) => {
              const role = r as AdminRole
              if (role.isSystem) {
                setError('I ruoli di sistema non possono essere eliminati')
                return
              }
              setConfirmTarget(role)
            }
          }
        ]}
      />

      <FormModal
        isOpen={showCreateModal}
        title="Nuovo ruolo"
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1A2B4A] uppercase tracking-wider mb-1">
              Identificatore (es. operatore_magazzino)
            </label>
            <input
              {...register('name')}
              placeholder="nome_ruolo"
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm focus:outline-none focus:border-[#1A2B4A]"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1A2B4A] uppercase tracking-wider mb-1">
              Nome visualizzato
            </label>
            <input
              {...register('label')}
              placeholder="Operatore Magazzino"
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm focus:outline-none focus:border-[#1A2B4A]"
            />
            {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label.message}</p>}
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        isOpen={!!confirmTarget}
        title="Elimina ruolo"
        message={`Elimina definitivamente il ruolo "${confirmTarget?.label}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmTarget(null)}
        confirmLabel="Elimina"
      />
    </div>
  )
}

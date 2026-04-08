import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
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
      <code className="admin-code">
        {r.name}
      </code>
    )
  },
  {
    key: 'isSystem',
    header: 'Tipo',
    render: (r: AdminRole) => (
      <span className={[
        'admin-badge',
        r.isSystem
          ? 'admin-badge-dark'
          : 'admin-badge-gold'
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
  const [pageError, setPageError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError: setFormError, clearErrors } = useForm<CreateFormValues>()

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
    clearErrors()
    const result = createSchema.safeParse(values)
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string') {
          setFormError(field as keyof CreateFormValues, { type: 'manual', message: issue.message })
        }
      }
      return
    }

    try {
      await rolesApi.create(result.data)
      reset()
      setShowCreateModal(false)
      loadRoles()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setPageError(msg ?? 'Errore durante la creazione')
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
      setPageError(msg ?? 'Impossibile eliminare il ruolo')
      setConfirmTarget(null)
    }
  }

  return (
    <div>
      <div className="admin-page-intro">
        <div>
          <p className="admin-page-kicker">Permessi applicativi</p>
          <h2 className="admin-page-title">Ruoli</h2>
          <p className="admin-page-description">
            Configura i profili disponibili nell&apos;area riservata mantenendo separati ruoli di sistema e ruoli personalizzati.
          </p>
        </div>
        <button
          onClick={() => { setPageError(null); clearErrors(); reset(); setShowCreateModal(true) }}
          className="admin-button-primary"
        >
          + Nuovo ruolo
        </button>
      </div>

      {pageError && (
        <p className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {pageError}
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
                setPageError('I ruoli di sistema non possono essere eliminati')
                return
              }
              setConfirmTarget(role)
            }
          }
        ]}
        searchable
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
            <label className="admin-label">
              Identificatore (es. operatore_magazzino)
            </label>
            <input
              {...register('name')}
              placeholder="nome_ruolo"
              className="admin-input"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="admin-label">
              Nome visualizzato
            </label>
            <input
              {...register('label')}
              placeholder="Operatore Magazzino"
              className="admin-input"
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

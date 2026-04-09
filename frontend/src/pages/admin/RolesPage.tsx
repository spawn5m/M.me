import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import DataTable from '../../components/admin/DataTable'
import FormModal from '../../components/admin/FormModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import PermissionEditorModal from '../../components/admin/PermissionEditorModal'
import { permissionsApi } from '../../lib/admin/permissions-api'
import { rolesApi } from '../../lib/admin/roles-api'
import type { AdminPermission, AdminRole, AdminRolePermissionDetail } from '../../../../backend/src/types/shared'

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
  const [permissionTarget, setPermissionTarget] = useState<AdminRole | null>(null)
  const [permissionCatalog, setPermissionCatalog] = useState<AdminPermission[]>([])
  const [permissionDetail, setPermissionDetail] = useState<AdminRolePermissionDetail | null>(null)
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState<string[]>([])
  const [isPermissionLoading, setIsPermissionLoading] = useState(false)
  const [isPermissionSaving, setIsPermissionSaving] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const permissionRequestIdRef = useRef(0)
  const nameInputId = useId()
  const labelInputId = useId()

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError: setFormError, clearErrors } = useForm<CreateFormValues>()

  const getErrorMessage = (err: unknown, fallback: string) => {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    return msg ?? fallback
  }

  const loadRoles = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)

    try {
      const res = await rolesApi.list()
      setRoles(res.data)
    } catch (err: unknown) {
      setRoles([])
      setPageError(getErrorMessage(err, 'Errore durante il caricamento dei ruoli'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadRoles() }, [loadRoles])

  const closePermissions = () => {
    permissionRequestIdRef.current += 1
    setPermissionTarget(null)
    setPermissionCatalog([])
    setPermissionDetail(null)
    setSelectedPermissionCodes([])
    setPermissionError(null)
    setIsPermissionLoading(false)
    setIsPermissionSaving(false)
  }

  const openPermissions = async (role: AdminRole) => {
    const requestId = permissionRequestIdRef.current + 1
    permissionRequestIdRef.current = requestId

    setPermissionTarget(role)
    setPermissionCatalog([])
    setPermissionDetail(null)
    setSelectedPermissionCodes([])
    setPermissionError(null)
    setIsPermissionLoading(true)

    try {
      const [catalogRes, detailRes] = await Promise.all([
        permissionsApi.list(),
        permissionsApi.getRolePermissions(role.id),
      ])

      if (permissionRequestIdRef.current !== requestId) {
        return
      }

      setPermissionCatalog(catalogRes.data)
      setPermissionDetail(detailRes)
      setSelectedPermissionCodes(detailRes.permissions.map((permission) => permission.code))
    } catch (err: unknown) {
      if (permissionRequestIdRef.current !== requestId) {
        return
      }

      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setPermissionError(msg ?? 'Errore durante il caricamento dei permessi')
    } finally {
      if (permissionRequestIdRef.current === requestId) {
        setIsPermissionLoading(false)
      }
    }
  }

  const togglePermission = (permissionCode: string) => {
    setSelectedPermissionCodes((current) => current.includes(permissionCode)
      ? current.filter((code) => code !== permissionCode)
      : [...current, permissionCode])
  }

  const handlePermissionSave = async () => {
    if (!permissionTarget || permissionTarget.isSystem) return

    const requestId = permissionRequestIdRef.current

    setPermissionError(null)
    setIsPermissionSaving(true)

    try {
      const detail = await permissionsApi.updateRolePermissions(permissionTarget.id, selectedPermissionCodes)

      if (permissionRequestIdRef.current !== requestId) {
        return
      }

      setPermissionDetail(detail)
      setSelectedPermissionCodes(detail.permissions.map((permission) => permission.code))
    } catch (err: unknown) {
      if (permissionRequestIdRef.current !== requestId) {
        return
      }

      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setPermissionError(msg ?? 'Errore durante il salvataggio dei permessi')
    } finally {
      if (permissionRequestIdRef.current === requestId) {
        setIsPermissionSaving(false)
      }
    }
  }

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
      await loadRoles()
    } catch (err: unknown) {
      setPageError(getErrorMessage(err, 'Errore durante la creazione'))
    }
  }

  const handleDelete = async () => {
    if (!confirmTarget) return
    try {
      await rolesApi.delete(confirmTarget.id)
      setConfirmTarget(null)
      await loadRoles()
    } catch (err: unknown) {
      setPageError(getErrorMessage(err, 'Impossibile eliminare il ruolo'))
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
            label: 'Permessi',
            onClick: (r) => {
              void openPermissions(r as AdminRole)
            }
          },
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
            <label className="admin-label" htmlFor={nameInputId}>
              Identificatore (es. operatore_magazzino)
            </label>
            <input
              id={nameInputId}
              {...register('name')}
              placeholder="nome_ruolo"
              className="admin-input"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="admin-label" htmlFor={labelInputId}>
              Nome visualizzato
            </label>
            <input
              id={labelInputId}
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

      <PermissionEditorModal
        isOpen={!!permissionTarget}
        title={permissionTarget ? `Permessi ruolo: ${permissionTarget.label}` : 'Permessi ruolo'}
        permissions={permissionCatalog}
        selectedCodes={selectedPermissionCodes}
        readOnly={permissionTarget?.isSystem ?? true}
        isLoading={isPermissionLoading}
        isSaving={isPermissionSaving}
        effectiveCodes={permissionDetail?.permissions.map((permission) => permission.code) ?? []}
        secondarySection={{
          title: 'Dettaglio ruolo',
          content: (
            <div className="space-y-3">
              {permissionTarget && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className={['admin-badge', permissionTarget.isSystem ? 'admin-badge-dark' : 'admin-badge-gold'].join(' ')}>
                    {permissionTarget.isSystem ? 'Ruolo di sistema' : 'Ruolo custom'}
                  </span>
                  <code className="admin-code">{permissionTarget.name}</code>
                </div>
              )}

              <p className="text-sm text-[#6B7280]">
                {permissionTarget?.isSystem
                  ? 'I permessi dei ruoli di sistema sono disponibili in sola lettura.'
                  : 'I permessi dei ruoli personalizzati possono essere aggiornati e sostituiti integralmente.'}
              </p>

              {permissionError && (
                <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {permissionError}
                </p>
              )}
            </div>
          ),
        }}
        onToggle={togglePermission}
        onClose={closePermissions}
        onSave={permissionDetail && !permissionTarget?.isSystem ? handlePermissionSave : undefined}
      />
    </div>
  )
}

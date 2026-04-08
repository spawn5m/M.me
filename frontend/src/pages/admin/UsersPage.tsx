import { useCallback, useEffect, useState } from 'react'
import { Pencil, Tag, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import DataTable from '../../components/admin/DataTable'
import FormModal from '../../components/admin/FormModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import { usersApi } from '../../lib/admin/users-api'
import { rolesApi } from '../../lib/admin/roles-api'
import { pricelistsApi } from '../../lib/api/pricelists'
import type { AdminUser, AdminRole, AdminPriceList } from '../../../../backend/src/types/shared'

// ─── Schema form ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Minimo 8 caratteri'),
  firstName: z.string().min(1, 'Obbligatorio'),
  lastName: z.string().min(1, 'Obbligatorio'),
  roleIds: z.array(z.string()).default([])
})

const editSchema = z.object({
  email: z.string().email('Email non valida'),
  firstName: z.string().min(1, 'Obbligatorio'),
  lastName: z.string().min(1, 'Obbligatorio'),
  roleIds: z.array(z.string()).default([])
})

type CreateFormValues = z.infer<typeof createSchema>
type EditFormValues = z.infer<typeof editSchema>

// ─── Colonne tabella ──────────────────────────────────────────────────────────

const columns = [
  {
    key: 'name',
    header: 'Nome',
    render: (u: AdminUser) => (
      <span className="font-medium text-[#1A2B4A]">{u.firstName} {u.lastName}</span>
    )
  },
  { key: 'email', header: 'Email' },
  {
    key: 'roles',
    header: 'Ruoli',
    render: (u: AdminUser) => (
      <div className="flex flex-wrap gap-1">
        {u.roles.map((r) => (
          <span key={r.name} className="admin-badge">
            {r.label}
          </span>
        ))}
      </div>
    )
  },
  {
    key: 'assignedPriceLists',
    header: 'Listini',
    render: (u: AdminUser) => {
      const labels = [
        u.funeralPriceList ? `Funebre: ${u.funeralPriceList.name}` : null,
        u.marmistaPriceList ? `Marmista: ${u.marmistaPriceList.name}` : null,
      ].filter(Boolean)

      if (labels.length === 0) {
        return <span className="text-xs text-[#6B7280]">—</span>
      }

      return (
        <div className="flex flex-wrap gap-1">
          {labels.map((label) => (
            <span key={label} className="admin-badge admin-badge-gold">
              {label}
            </span>
          ))}
        </div>
      )
    }
  },
  {
    key: 'isActive',
    header: 'Stato',
    render: (u: AdminUser) => (
      <span className={`text-xs font-medium ${u.isActive ? 'text-green-600' : 'text-[#6B7280]'}`}>
        {u.isActive ? 'Attivo' : 'Disattivo'}
      </span>
    )
  }
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [allRoles, setAllRoles] = useState<AdminRole[]>([])
  const [allPriceLists, setAllPriceLists] = useState<AdminPriceList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<AdminUser | null>(null)
  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null)
  const [assignFuneralId, setAssignFuneralId] = useState('')
  const [assignMarmistaId, setAssignMarmistaId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch, setError: setFormError, clearErrors } = useForm<CreateFormValues>({
    defaultValues: { roleIds: [] }
  })
  const selectedRoleIds = watch('roleIds')

  const { register: registerEdit, handleSubmit: handleSubmitEdit, formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit }, reset: resetEdit, setValue: setValueEdit, watch: watchEdit, setError: setFormErrorEdit, clearErrors: clearErrorsEdit } = useForm<EditFormValues>({
    defaultValues: { roleIds: [] }
  })
  const selectedEditRoleIds = watchEdit('roleIds')

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await usersApi.list({ pageSize: 100 })
      setUsers(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
    rolesApi.list().then((res) => setAllRoles(res.data))
    pricelistsApi.list().then((res) => setAllPriceLists(res.data))
  }, [loadUsers])

  const openEdit = (user: AdminUser) => {
    setEditTarget(user)
    resetEdit({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleIds: user.roles.map(r => r.id),
    })
  }

  const onEditSubmit = async (values: EditFormValues) => {
    if (!editTarget) return
    clearErrorsEdit()
    const result = editSchema.safeParse(values)
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string') {
          setFormErrorEdit(field as keyof EditFormValues, { type: 'manual', message: issue.message })
        }
      }
      return
    }
    try {
      await usersApi.update(editTarget.id, result.data)
      setEditTarget(null)
      loadUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setPageError(msg ?? 'Errore durante la modifica')
    }
  }

  const toggleEditRole = (roleId: string) => {
    const current = selectedEditRoleIds ?? []
    const next = current.includes(roleId)
      ? current.filter((id) => id !== roleId)
      : [...current, roleId]
    setValueEdit('roleIds', next)
  }

  const openAssign = (user: AdminUser) => {
    setAssignTarget(user)
    setAssignFuneralId(user.funeralPriceList?.id ?? '')
    setAssignMarmistaId(user.marmistaPriceList?.id ?? '')
  }

  const handleAssign = async () => {
    if (!assignTarget) return
    setIsAssigning(true)
    try {
      if (assignFuneralId && assignFuneralId !== assignTarget.funeralPriceList?.id) {
        await pricelistsApi.assign(assignFuneralId, assignTarget.id)
      }
      if (assignMarmistaId && assignMarmistaId !== assignTarget.marmistaPriceList?.id) {
        await pricelistsApi.assign(assignMarmistaId, assignTarget.id)
      }
      setAssignTarget(null)
      loadUsers()
    } finally {
      setIsAssigning(false)
    }
  }

  const userHasRole = (user: AdminUser, roleName: string) =>
    user.roles.some(r => r.name === roleName)

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
      await usersApi.create(result.data)
      reset()
      setShowCreateModal(false)
      loadUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setPageError(msg ?? 'Errore durante la creazione')
    }
  }

  const handleDeactivate = async () => {
    if (!confirmTarget) return
    await usersApi.delete(confirmTarget.id)
    setConfirmTarget(null)
    loadUsers()
  }

  const toggleRole = (roleId: string) => {
    const current = selectedRoleIds ?? []
    const next = current.includes(roleId)
      ? current.filter((id) => id !== roleId)
      : [...current, roleId]
    setValue('roleIds', next)
  }

  return (
    <div>
      <div className="admin-page-intro">
        <div>
          <p className="admin-page-kicker">Anagrafica accessi</p>
          <h2 className="admin-page-title">Utenti</h2>
          <p className="admin-page-description">
            Gestione degli accessi all&apos;area riservata, ruoli assegnati e collegamento ai listini disponibili.
          </p>
        </div>
        <button
          onClick={() => { setPageError(null); clearErrors(); reset(); setShowCreateModal(true) }}
          className="admin-button-primary"
        >
          + Nuovo utente
        </button>
      </div>

      {pageError && (
        <p className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {pageError}
        </p>
      )}

      <DataTable<AdminUser & Record<string, unknown>>
        columns={columns as never}
        data={users as never}
        keyField="id"
        isLoading={isLoading}
        searchable
        actions={[
          {
            label: 'Modifica',
            icon: <Pencil size={15} />,
            onClick: (u) => openEdit(u as AdminUser)
          },
          {
            label: 'Listino',
            icon: <Tag size={15} />,
            onClick: (u) => openAssign(u as AdminUser),
            hidden: (u) => {
              const user = u as AdminUser
              return userHasRole(user, 'super_admin') || userHasRole(user, 'manager')
            }
          },
          {
            label: 'Disattiva',
            icon: <Trash2 size={15} />,
            variant: 'danger',
            onClick: (u) => setConfirmTarget(u as AdminUser)
          }
        ]}
      />

      {/* Modal crea utente */}
      <FormModal
        isOpen={showCreateModal}
        title="Nuovo utente"
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleSubmit(onSubmit)}
        isSubmitting={isSubmitting}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">
                Nome
              </label>
              <input
                {...register('firstName')}
                className="admin-input"
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="admin-label">
                Cognome
              </label>
              <input
                {...register('lastName')}
                className="admin-input"
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="admin-label">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              className="admin-input"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="admin-label">
              Password
            </label>
            <input
              {...register('password')}
              type="password"
              className="admin-input"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="admin-label">
              Ruoli
            </label>
            <div className="flex flex-wrap gap-2">
              {allRoles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={[
                    'admin-inline-chip',
                    selectedRoleIds?.includes(role.id)
                      ? 'admin-inline-chip-active'
                      : ''
                  ].join(' ')}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FormModal>

      {/* Modal modifica utente */}
      <FormModal
        isOpen={!!editTarget}
        title={`Modifica — ${editTarget?.firstName} ${editTarget?.lastName}`}
        onClose={() => setEditTarget(null)}
        onSubmit={handleSubmitEdit(onEditSubmit)}
        isSubmitting={isSubmittingEdit}
        submitLabel="Salva modifiche"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Nome</label>
              <input {...registerEdit('firstName')} className="admin-input" />
              {errorsEdit.firstName && <p className="text-red-500 text-xs mt-1">{errorsEdit.firstName.message}</p>}
            </div>
            <div>
              <label className="admin-label">Cognome</label>
              <input {...registerEdit('lastName')} className="admin-input" />
              {errorsEdit.lastName && <p className="text-red-500 text-xs mt-1">{errorsEdit.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="admin-label">Email</label>
            <input {...registerEdit('email')} type="email" className="admin-input" />
            {errorsEdit.email && <p className="text-red-500 text-xs mt-1">{errorsEdit.email.message}</p>}
          </div>
          <div>
            <label className="admin-label">Ruoli</label>
            <div className="flex flex-wrap gap-2">
              {allRoles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleEditRole(role.id)}
                  className={[
                    'admin-inline-chip',
                    selectedEditRoleIds?.includes(role.id) ? 'admin-inline-chip-active' : ''
                  ].join(' ')}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FormModal>

      {/* Modal assegnazione listino */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(26, 43, 74, 0.22)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md border border-[#E5E0D8] bg-white shadow-[0_24px_80px_rgba(26,43,74,0.16)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D8]">
              <h2 className="text-xl text-[#031634]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Assegna Listino — {assignTarget.firstName} {assignTarget.lastName}
              </h2>
              <button onClick={() => setAssignTarget(null)} className="text-[#6B7280] text-xl transition-colors hover:text-[#031634]">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {(assignTarget.funeralPriceList || assignTarget.marmistaPriceList) && (
                <div className="admin-soft-panel p-4">
                  <p className="admin-label">Assegnazioni correnti</p>
                  <div className="flex flex-wrap gap-2">
                    {assignTarget.funeralPriceList && (
                      <span className="admin-badge admin-badge-gold">Funebre: {assignTarget.funeralPriceList.name}</span>
                    )}
                    {assignTarget.marmistaPriceList && (
                      <span className="admin-badge admin-badge-gold">Marmista: {assignTarget.marmistaPriceList.name}</span>
                    )}
                  </div>
                </div>
              )}

              {userHasRole(assignTarget, 'impresario_funebre') && (
                <div>
                  <label className="admin-label">Listino Cofani</label>
                  <select value={assignFuneralId} onChange={e => setAssignFuneralId(e.target.value)}
                    className="admin-select">
                    <option value="">— Nessuno —</option>
                    {allPriceLists.filter(pl => pl.articleType === 'funeral').map(pl => (
                      <option key={pl.id} value={pl.id}>{pl.name} ({pl.type === 'purchase' ? 'Acquisto' : 'Vendita'})</option>
                    ))}
                  </select>
                </div>
              )}
              {(userHasRole(assignTarget, 'marmista') || userHasRole(assignTarget, 'impresario_funebre')) && (
                <div>
                  <label className="admin-label">Listino Marmista</label>
                  <select value={assignMarmistaId} onChange={e => setAssignMarmistaId(e.target.value)}
                    className="admin-select">
                    <option value="">— Nessuno —</option>
                    {allPriceLists.filter(pl => pl.articleType === 'marmista').map(pl => (
                      <option key={pl.id} value={pl.id}>{pl.name} ({pl.type === 'purchase' ? 'Acquisto' : 'Vendita'})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[#E5E0D8] bg-[#F8F7F4] px-6 py-4">
              <button onClick={() => setAssignTarget(null)} className="admin-button-secondary">Annulla</button>
              <button onClick={handleAssign} disabled={isAssigning || (!assignFuneralId && !assignMarmistaId)}
                className="admin-button-primary disabled:opacity-50">
                {isAssigning ? 'Salvataggio…' : 'Assegna'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm disattivazione */}
      <ConfirmDialog
        isOpen={!!confirmTarget}
        title="Disattiva utente"
        message={`Sei sicuro di voler disattivare ${confirmTarget?.firstName} ${confirmTarget?.lastName}? L'utente non potrà più accedere.`}
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmTarget(null)}
        confirmLabel="Disattiva"
      />
    </div>
  )
}

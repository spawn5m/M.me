import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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

type CreateFormValues = z.infer<typeof createSchema>

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
          <span
            key={r.name}
            className="px-2 py-0.5 text-xs rounded-full bg-[#E5E0D8] text-[#1A2B4A]"
          >
            {r.label}
          </span>
        ))}
      </div>
    )
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
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<AdminUser | null>(null)
  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null)
  const [assignFuneralId, setAssignFuneralId] = useState('')
  const [assignMarmistaId, setAssignMarmistaId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { roleIds: [] }
  })

  const selectedRoleIds = watch('roleIds')

  const loadUsers = useCallback(async (page = 1) => {
    setIsLoading(true)
    try {
      const res = await usersApi.list({ page, pageSize: 20 })
      setUsers(res.data)
      setPagination(res.pagination)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
    rolesApi.list().then((res) => setAllRoles(res.data))
    pricelistsApi.list().then((res) => setAllPriceLists(res.data))
  }, [loadUsers])

  const openAssign = (user: AdminUser) => {
    setAssignTarget(user)
    setAssignFuneralId('')
    setAssignMarmistaId('')
  }

  const handleAssign = async () => {
    if (!assignTarget) return
    setIsAssigning(true)
    try {
      if (assignFuneralId) await pricelistsApi.assign(assignFuneralId, assignTarget.id)
      if (assignMarmistaId) await pricelistsApi.assign(assignMarmistaId, assignTarget.id)
      setAssignTarget(null)
      loadUsers()
    } finally {
      setIsAssigning(false)
    }
  }

  const userHasRole = (user: AdminUser, roleName: string) =>
    user.roles.some(r => r.name === roleName)

  const onSubmit = async (values: CreateFormValues) => {
    try {
      await usersApi.create(values)
      reset()
      setShowCreateModal(false)
      loadUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Errore durante la creazione')
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
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-2xl text-[#1A2B4A]"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          Utenti
        </h2>
        <button
          onClick={() => { setError(null); reset(); setShowCreateModal(true) }}
          className="px-4 py-2 bg-[#1A2B4A] text-white text-sm rounded hover:bg-[#2C4A7C] transition-colors"
        >
          + Nuovo utente
        </button>
      </div>

      {error && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <DataTable<AdminUser & Record<string, unknown>>
        columns={columns as never}
        data={users as never}
        keyField="id"
        pagination={pagination}
        onPageChange={loadUsers}
        isLoading={isLoading}
        actions={[
          {
            label: 'Listino',
            onClick: (u) => openAssign(u as AdminUser)
          },
          {
            label: 'Disattiva',
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
              <label className="block text-xs font-medium text-[#1A2B4A] uppercase tracking-wider mb-1">
                Nome
              </label>
              <input
                {...register('firstName')}
                className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm focus:outline-none focus:border-[#1A2B4A]"
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1A2B4A] uppercase tracking-wider mb-1">
                Cognome
              </label>
              <input
                {...register('lastName')}
                className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm focus:outline-none focus:border-[#1A2B4A]"
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A2B4A] uppercase tracking-wider mb-1">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm focus:outline-none focus:border-[#1A2B4A]"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A2B4A] uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              {...register('password')}
              type="password"
              className="w-full px-3 py-2 border border-[#E5E0D8] rounded text-sm focus:outline-none focus:border-[#1A2B4A]"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A2B4A] uppercase tracking-wider mb-2">
              Ruoli
            </label>
            <div className="flex flex-wrap gap-2">
              {allRoles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={[
                    'px-3 py-1.5 text-xs rounded-full border transition-colors',
                    selectedRoleIds?.includes(role.id)
                      ? 'bg-[#1A2B4A] text-white border-[#1A2B4A]'
                      : 'bg-white text-[#6B7280] border-[#E5E0D8] hover:border-[#1A2B4A]'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D8]">
              <h2 className="text-[#1A2B4A] font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                Assegna Listino — {assignTarget.firstName} {assignTarget.lastName}
              </h2>
              <button onClick={() => setAssignTarget(null)} className="text-[#6B7280] hover:text-[#1A2B4A] text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {(userHasRole(assignTarget, 'impresario_funebre') || userHasRole(assignTarget, 'manager') || userHasRole(assignTarget, 'super_admin')) && (
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Listino Funebre</label>
                  <select value={assignFuneralId} onChange={e => setAssignFuneralId(e.target.value)}
                    className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#1A2B4A]">
                    <option value="">— Nessuno —</option>
                    {allPriceLists.filter(pl => pl.articleType === 'funeral').map(pl => (
                      <option key={pl.id} value={pl.id}>{pl.name} ({pl.type === 'purchase' ? 'Acquisto' : 'Vendita'})</option>
                    ))}
                  </select>
                </div>
              )}
              {(userHasRole(assignTarget, 'marmista') || userHasRole(assignTarget, 'manager') || userHasRole(assignTarget, 'super_admin')) && (
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Listino Marmista</label>
                  <select value={assignMarmistaId} onChange={e => setAssignMarmistaId(e.target.value)}
                    className="w-full border border-[#E5E0D8] rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#1A2B4A]">
                    <option value="">— Nessuno —</option>
                    {allPriceLists.filter(pl => pl.articleType === 'marmista').map(pl => (
                      <option key={pl.id} value={pl.id}>{pl.name} ({pl.type === 'purchase' ? 'Acquisto' : 'Vendita'})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E0D8] bg-[#F8F7F4] rounded-b-lg">
              <button onClick={() => setAssignTarget(null)} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#1A2B4A] transition-colors">Annulla</button>
              <button onClick={handleAssign} disabled={isAssigning || (!assignFuneralId && !assignMarmistaId)}
                className="px-5 py-2 text-sm bg-[#1A2B4A] text-white rounded hover:bg-[#2C4A7C] disabled:opacity-50 transition-colors">
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

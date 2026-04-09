import { useMemo, useState } from 'react'
import type { AdminPermission } from '../../../../backend/src/types/shared'

interface PermissionChecklistProps {
  permissions: AdminPermission[]
  selectedCodes: string[]
  readOnly: boolean
  onToggle: (permissionCode: string) => void
}

export default function PermissionChecklist({
  permissions,
  selectedCodes,
  readOnly,
  onToggle,
}: PermissionChecklistProps) {
  const [query, setQuery] = useState('')

  const handleRowToggle = (permissionCode: string) => {
    if (!readOnly) {
      onToggle(permissionCode)
    }
  }

  const filteredPermissions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return permissions
    }

    return permissions.filter((permission) => {
      const haystack = [permission.code, permission.label, permission.description]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [permissions, query])

  return (
    <div className="space-y-4">
      <div>
        <label className="admin-label" htmlFor="permission-search">
          Cerca permesso
        </label>
        <input
          id="permission-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca permesso"
          className="admin-input"
        />
      </div>

      <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
        {filteredPermissions.length === 0 ? (
          <p className="border border-[#E5E0D8] bg-[#F8F7F4] px-4 py-3 text-sm text-[#6B7280]">
            Nessun permesso trovato
          </p>
        ) : (
          filteredPermissions.map((permission) => {
            const checked = selectedCodes.includes(permission.code)

            return (
              <div
                key={permission.code}
                onClick={() => handleRowToggle(permission.code)}
                className={[
                  'flex min-h-11 cursor-pointer items-start gap-3 border px-4 py-3 transition-colors',
                  checked
                    ? 'border-[#C9A96E] bg-[#FCFBF8]'
                    : 'border-[#E5E0D8] bg-white hover:border-[#C9A96E]',
                  readOnly ? 'cursor-default' : '',
                ].join(' ')}
              >
                <input
                  id={`permission-${permission.id}`}
                  type="checkbox"
                  aria-labelledby={`permission-label-${permission.id}`}
                  aria-describedby={`permission-description-${permission.id}`}
                  checked={checked}
                  disabled={readOnly}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => onToggle(permission.code)}
                  className="mt-1 h-4 w-4 accent-[#1A2B4A]"
                />

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="admin-code">{permission.code}</code>
                    {permission.isSystem && <span className="admin-badge">Sistema</span>}
                  </div>
                  <span
                    id={`permission-label-${permission.id}`}
                    className="block text-sm font-medium text-[#1A1A1A]"
                  >
                    {permission.label}
                  </span>
                  <p id={`permission-description-${permission.id}`} className="text-sm leading-6 text-[#6B7280]">
                    {permission.description}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

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
    <div className="space-y-3">
      <div>
        <label className="admin-label" htmlFor="permission-search">
          Cerca permesso
        </label>
        <input
          id="permission-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtra per codice o descrizione…"
          className="admin-input"
        />
      </div>

      <div className="max-h-[22rem] overflow-y-auto border border-[#E5E0D8]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[#F8F7F4]">
            <tr className="border-b border-[#E5E0D8]">
              <th className="w-10 px-3 py-2 text-center">
                <span className="sr-only">Seleziona</span>
              </th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[#1A2B4A] text-xs">
                Codice permesso
              </th>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[#1A2B4A] text-xs">
                Descrizione
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D8] bg-white">
            {filteredPermissions.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-[#6B7280]">
                  Nessun permesso trovato
                </td>
              </tr>
            ) : (
              filteredPermissions.map((permission) => {
                const checked = selectedCodes.includes(permission.code)

                return (
                  <tr
                    key={permission.code}
                    onClick={() => { if (!readOnly) onToggle(permission.code) }}
                    className={[
                      'transition-colors',
                      readOnly ? '' : 'cursor-pointer',
                      checked
                        ? 'bg-[#FCFBF8]'
                        : 'hover:bg-[#F8F7F4]',
                    ].join(' ')}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        id={`permission-${permission.id}`}
                        type="checkbox"
                        aria-label={permission.label}
                        checked={checked}
                        disabled={readOnly}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => onToggle(permission.code)}
                        className="h-4 w-4 accent-[#1A2B4A]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <code className="admin-code">{permission.code}</code>
                    </td>
                    <td className="px-3 py-2 text-[#1A1A1A]">
                      <span className="font-medium">{permission.label}</span>
                      {permission.description && (
                        <p className="mt-0.5 text-xs text-[#6B7280] leading-relaxed">
                          {permission.description}
                        </p>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

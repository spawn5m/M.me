import { useMemo, useState } from 'react'
import type { AdminPermission } from '../../../../backend/src/types/shared'

interface PermissionChecklistProps {
  permissions: AdminPermission[]
  selectedCodes: string[]
  readOnly: boolean
  onToggle: (permissionCode: string) => void
}

function PermissionRow({
  permission,
  checked,
  readOnly,
  onToggle,
}: {
  permission: AdminPermission
  checked: boolean
  readOnly: boolean
  onToggle: (code: string) => void
}) {
  return (
    <tr
      onClick={() => { if (!readOnly) onToggle(permission.code) }}
      className={[
        'transition-colors',
        readOnly ? '' : 'cursor-pointer',
        checked ? 'bg-[#FCFBF8]' : 'hover:bg-[#F8F7F4]',
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
}

function resolveGroup(resource: string): string {
  if (resource.startsWith('client.')) return 'client'
  if (resource.startsWith('articles')) return 'articles'
  if (resource.startsWith('catalog')) return 'catalog'
  if (resource.startsWith('pricelists')) return 'pricelists'
  if (resource === 'lookups' || resource === 'measures') return 'articles.detail'
  if (resource === 'branding.logo' || resource === 'locales' || resource === 'maintenance' || resource === 'maps') return 'interface'
  if (resource === 'roles') return 'roles'
  if (resource === 'users') return 'users'
  if (resource === 'dashboard') return 'dashboard'
  return resource
}

export default function PermissionChecklist({
  permissions,
  selectedCodes,
  readOnly,
  onToggle,
}: PermissionChecklistProps) {
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()

  const filteredPermissions = useMemo(() => {
    if (!normalizedQuery) return permissions
    return permissions.filter((p) =>
      [p.code, p.label, p.description].join(' ').toLowerCase().includes(normalizedQuery)
    )
  }, [permissions, normalizedQuery])

  const groupedPermissions = useMemo(() => {
    const map = new Map<string, AdminPermission[]>()
    for (const p of permissions) {
      const key = resolveGroup(p.resource)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [permissions])

  const tableHeader = (
    <thead className="sticky top-0 z-10 bg-[#F8F7F4]">
      <tr className="border-b border-[#E5E0D8]">
        <th className="w-10 px-3 py-2 text-center">
          <span className="sr-only">Seleziona</span>
        </th>
        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#1A2B4A]">
          Codice permesso
        </th>
        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#1A2B4A]">
          Descrizione
        </th>
      </tr>
    </thead>
  )

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

      {normalizedQuery ? (
        <div className="max-h-[22rem] overflow-y-auto border border-[#E5E0D8]">
          <table className="w-full text-sm">
            {tableHeader}
            <tbody className="divide-y divide-[#E5E0D8] bg-white">
              {filteredPermissions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[#6B7280]">
                    Nessun permesso trovato
                  </td>
                </tr>
              ) : (
                filteredPermissions.map((permission) => (
                  <PermissionRow
                    key={permission.code}
                    permission={permission}
                    checked={selectedCodes.includes(permission.code)}
                    readOnly={readOnly}
                    onToggle={onToggle}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="max-h-[22rem] overflow-y-auto border border-[#E5E0D8]">
          {groupedPermissions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[#6B7280]">
              Nessun permesso disponibile
            </p>
          ) : (
            <table className="w-full text-sm">
              {tableHeader}
              <tbody className="divide-y divide-[#E5E0D8] bg-white">
                {groupedPermissions.map(([group, perms]) => {
                  const selectedCount = perms.filter((p) => selectedCodes.includes(p.code)).length
                  return (
                    <>
                      <tr key={`group-${group}`} className="border-b border-[#1A2B4A] bg-[#1A2B4A]">
                        <td colSpan={3} className="px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-semibold uppercase tracking-wider text-white">
                              {group}
                            </code>
                            <span className="text-xs text-[#8A9BB5]">
                              {selectedCount}/{perms.length}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {perms.map((permission) => (
                        <PermissionRow
                          key={permission.code}
                          permission={permission}
                          checked={selectedCodes.includes(permission.code)}
                          readOnly={readOnly}
                          onToggle={onToggle}
                        />
                      ))}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

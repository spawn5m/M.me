# Authorization Admin Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining authorization work by adding admin permission-management UI for users and custom roles, and by migrating the catalog PDF placeholder off `checkRole(...)` onto explicit permission guards.

**Architecture:** Extend the existing permission-based runtime with small admin-facing APIs for permission catalog, user direct grants, and role permission bundles. Reuse the current admin pages (`UsersPage`, `RolesPage`) with one shared permission editor UI instead of adding new navigation. Migrate the backend catalog placeholder to `catalog.pdf.read` / `catalog.pdf.write` while intentionally leaving the business feature itself as `501`.

**Tech Stack:** Fastify v5, Prisma, Zod, React 19, React Router, React Testing Library, Vitest, shared TypeScript DTOs in `backend/src/types/shared.ts`

**Execution note:** Do not create git commits unless the user explicitly asks for them.

---

## File Structure

### Backend

- Create: `backend/src/lib/authorization/admin-permission-details.ts`
  Purpose: shared loaders/mappers for permission catalog, user permission detail, role permission detail, and replace-all writes.
- Create: `backend/src/routes/permissions.ts`
  Purpose: expose `GET /api/permissions` for the admin UI.
- Modify: `backend/src/app.ts`
  Purpose: register the new permission route and move catalog route under `/api/admin/catalog`.
- Modify: `backend/src/routes/users.ts`
  Purpose: add `GET /api/users/:id/permissions` and `PUT /api/users/:id/permissions`.
- Modify: `backend/src/routes/roles.ts`
  Purpose: add `GET /api/roles/:id/permissions` and `PUT /api/roles/:id/permissions`.
- Modify: `backend/src/routes/catalog.ts`
  Purpose: replace role-based guards with `catalog.pdf.read` / `catalog.pdf.write`.
- Modify: `backend/src/types/shared.ts`
  Purpose: add shared admin DTOs for permissions.
- Create: `backend/src/routes/__tests__/permissions.test.ts`
  Purpose: route tests for permission catalog.
- Create: `backend/src/routes/__tests__/user-permissions.test.ts`
  Purpose: route tests for user direct grants and effective permissions.
- Create: `backend/src/routes/__tests__/role-permissions.test.ts`
  Purpose: route tests for custom-role permission bundles.
- Create: `backend/src/routes/__tests__/catalog.test.ts`
  Purpose: route tests for catalog placeholder permission guards.

### Frontend

- Create: `frontend/src/lib/admin/permissions-api.ts`
  Purpose: typed admin client for permission catalog, user permission detail, and role permission detail.
- Create: `frontend/src/components/admin/PermissionChecklist.tsx`
  Purpose: shared searchable checkbox/read-only permission list.
- Create: `frontend/src/components/admin/PermissionEditorModal.tsx`
  Purpose: shared modal wrapper for user and role permission management.
- Modify: `frontend/src/pages/admin/UsersPage.tsx`
  Purpose: add "Permessi" action with direct grant editing and effective permission display.
- Modify: `frontend/src/pages/admin/RolesPage.tsx`
  Purpose: add "Permessi" action with read-only system roles and editable custom roles.
- Create: `frontend/src/pages/admin/__tests__/UsersPage.test.tsx`
  Purpose: verify user permission management flow.
- Create: `frontend/src/pages/admin/__tests__/RolesPage.test.tsx`
  Purpose: verify role permission management flow.
- Create: `frontend/src/components/admin/__tests__/PermissionChecklist.test.tsx`
  Purpose: verify filtering and read-only/editable behavior.

### Docs

- Modify: `AUTHORIZATION.md`
  Purpose: mark Phase 6 and the catalog exception as closed once implementation and verification are complete.
- Modify: `docs/authorization-runtime.md`
  Purpose: document the new admin permission endpoints and the catalog placeholder guard migration.

---

### Task 1: Add Shared Permission DTOs and Read-Only Admin Permission APIs

**Files:**
- Create: `backend/src/lib/authorization/admin-permission-details.ts`
- Create: `backend/src/routes/permissions.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/src/types/shared.ts`
- Test: `backend/src/routes/__tests__/permissions.test.ts`

- [ ] **Step 1: Write the failing permission catalog route test**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildTestApp, cleanupTestDb, seedTestUser, getAuthCookie } from '../../test-helper'

describe('Permissions API', () => {
  let app: FastifyInstance
  let superAdminCookie: string
  let managerCookie: string

  beforeAll(async () => {
    app = await buildTestApp()
    await seedTestUser(app, {
      email: 'super-perms@test.com',
      password: 'pass1234!',
      roles: ['super_admin'],
    })
    await seedTestUser(app, {
      email: 'manager-perms@test.com',
      password: 'pass1234!',
      roles: ['manager'],
    })
    superAdminCookie = await getAuthCookie(app, 'super-perms@test.com', 'pass1234!')
    managerCookie = await getAuthCookie(app, 'manager-perms@test.com', 'pass1234!')
  })

  afterAll(async () => {
    await cleanupTestDb(app)
    await app.close()
  })

  it('returns the system permission catalog to a caller with roles.read', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/permissions',
      headers: { cookie: superAdminCookie },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { data: Array<{ code: string; label: string }>; pagination: { total: number } }
    expect(body.data.some((permission) => permission.code === 'roles.manage')).toBe(true)
    expect(body.pagination.total).toBeGreaterThan(0)
  })

  it('returns 403 without roles.read', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/permissions',
      headers: { cookie: managerCookie },
    })

    expect(res.statusCode).toBe(403)
  })
})
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm run test -w backend -- src/routes/__tests__/permissions.test.ts`

Expected: FAIL because `GET /api/permissions` is not registered yet.

- [ ] **Step 3: Add shared admin permission DTOs**

```ts
export interface AdminPermission {
  id: string
  code: string
  resource: string
  action: string
  scope: string | null
  label: string
  description: string
  isSystem: boolean
}

export interface AdminUserPermissionDetail {
  user: Pick<AdminUser, 'id' | 'email' | 'firstName' | 'lastName' | 'isActive'>
  roles: AdminRole[]
  directPermissions: AdminPermission[]
  effectivePermissions: AdminPermission[]
}

export interface AdminRolePermissionDetail {
  role: AdminRole
  permissions: AdminPermission[]
}
```

- [ ] **Step 4: Add shared backend loaders for admin permission detail**

```ts
import type { PrismaClient } from '@prisma/client'
import type { AdminPermission, AdminRolePermissionDetail, AdminUserPermissionDetail } from '../types/shared'
import { getEffectivePermissions } from './get-effective-permissions'

function toAdminPermission(permission: {
  id: string
  code: string
  resource: string
  action: string
  scope: string | null
  label: string
  description: string
  isSystem: boolean
}): AdminPermission {
  return { ...permission }
}

export async function getPermissionCatalog(prisma: PrismaClient): Promise<AdminPermission[]> {
  const permissions = await prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }, { code: 'asc' }] })
  return permissions.map(toAdminPermission)
}

export async function getUserPermissionDetail(prisma: PrismaClient, userId: string): Promise<AdminUserPermissionDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: { include: { role: true } },
      userPermissions: { include: { permission: true } },
    },
  })

  if (!user) return null

  const effective = await getEffectivePermissions(prisma, user.id)
  const effectivePermissions = await prisma.permission.findMany({ where: { code: { in: effective.permissions } }, orderBy: { code: 'asc' } })

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    },
    roles: user.userRoles.map(({ role }) => ({ id: role.id, name: role.name, label: role.label, isSystem: role.isSystem })),
    directPermissions: user.userPermissions.map((entry) => toAdminPermission(entry.permission)),
    effectivePermissions: effectivePermissions.map(toAdminPermission),
  }
}

export async function getRolePermissionDetail(prisma: PrismaClient, roleId: string): Promise<AdminRolePermissionDetail | null> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { rolePermissions: { include: { permission: true } } },
  })

  if (!role) return null

  return {
    role: { id: role.id, name: role.name, label: role.label, isSystem: role.isSystem },
    permissions: role.rolePermissions.map((entry) => toAdminPermission(entry.permission)),
  }
}
```

- [ ] **Step 5: Implement the permission catalog route and register it**

```ts
const permissionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  fastify.get('/', {
    preHandler: [fastify.checkPermission('roles.read')],
  }, async (_req, reply) => {
    const permissions = await getPermissionCatalog(fastify.prisma)
    return reply.send({
      data: permissions,
      pagination: {
        page: 1,
        pageSize: permissions.length,
        total: permissions.length,
        totalPages: 1,
      },
    })
  })
}

await app.register(permissionsRoutes, { prefix: '/api/permissions' })
await app.register(catalogRoutes, { prefix: '/api/admin/catalog' })
```

- [ ] **Step 6: Run the test to verify GREEN**

Run: `npm run test -w backend -- src/routes/__tests__/permissions.test.ts`

Expected: PASS with `2 passed`.

---

### Task 2: Add User Direct Grant Read/Write Endpoints

**Files:**
- Modify: `backend/src/lib/authorization/admin-permission-details.ts`
- Modify: `backend/src/routes/users.ts`
- Test: `backend/src/routes/__tests__/user-permissions.test.ts`

- [ ] **Step 1: Write the failing user permission route tests**

```ts
it('returns direct and effective permissions for a user', async () => {
  const res = await app.inject({
    method: 'GET',
    url: `/api/users/${collaboratoreId}/permissions`,
    headers: { cookie: superAdminCookie },
  })

  expect(res.statusCode).toBe(200)
  const body = res.json() as { directPermissions: Array<{ code: string }>; effectivePermissions: Array<{ code: string }> }
  expect(body.directPermissions).toEqual([])
  expect(body.effectivePermissions.some((permission) => permission.code === 'articles.coffins.read')).toBe(true)
})

it('replaces direct grants and returns refreshed effective permissions', async () => {
  const res = await app.inject({
    method: 'PUT',
    url: `/api/users/${collaboratoreId}/permissions`,
    headers: { cookie: superAdminCookie },
    payload: { permissionCodes: ['roles.read'] },
  })

  expect(res.statusCode).toBe(200)
  const body = res.json() as { directPermissions: Array<{ code: string }>; effectivePermissions: Array<{ code: string }> }
  expect(body.directPermissions.map((permission) => permission.code)).toEqual(['roles.read'])
  expect(body.effectivePermissions.some((permission) => permission.code === 'roles.read')).toBe(true)
})

it('returns 403 when caller lacks roles.manage', async () => {
  const res = await app.inject({
    method: 'PUT',
    url: `/api/users/${collaboratoreId}/permissions`,
    headers: { cookie: managerCookie },
    payload: { permissionCodes: ['roles.read'] },
  })

  expect(res.statusCode).toBe(403)
})
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm run test -w backend -- src/routes/__tests__/user-permissions.test.ts`

Expected: FAIL because the user permission endpoints do not exist yet.

- [ ] **Step 3: Add replace-all direct grant helper**

```ts
export async function replaceUserDirectPermissions(
  prisma: PrismaClient,
  userId: string,
  permissionCodes: string[],
  grantedByUserId: string
) {
  const permissions = permissionCodes.length
    ? await prisma.permission.findMany({ where: { code: { in: permissionCodes } } })
    : []

  if (permissions.length !== permissionCodes.length) {
    return { error: 'ValidationError', message: 'Uno o piu permessi non sono validi', statusCode: 400 } as const
  }

  await prisma.$transaction([
    prisma.userPermission.deleteMany({ where: { userId } }),
    ...(permissions.length > 0
      ? [prisma.userPermission.createMany({
          data: permissions.map((permission) => ({
            userId,
            permissionId: permission.id,
            grantedByUserId,
          })),
        })]
      : []),
  ])

  return null
}
```

- [ ] **Step 4: Implement user permission endpoints in `users.ts`**

```ts
fastify.get('/:id/permissions', {
  preHandler: [fastify.checkPermission('roles.manage')],
}, async (req, reply) => {
  const { id } = req.params as { id: string }
  const user = await fastify.prisma.user.findUnique({ where: { id }, include: USER_INCLUDE })

  if (!user) {
    return reply.status(404).send({ error: 'NotFound', message: 'Utente non trovato', statusCode: 404 })
  }

  const accessError = ensureCanAccessUser(reply, user as UserRecord, req.auth, {
    allowAllPermission: canReadAllUsers(req.auth.permissions),
    allowSuperAdminPermission: canReadSuperAdmins(req.auth.permissions),
  })
  if (accessError) return accessError

  const detail = await getUserPermissionDetail(fastify.prisma, id)
  return reply.send(detail)
})

fastify.put('/:id/permissions', {
  preHandler: [fastify.checkPermission('roles.manage')],
}, async (req, reply) => {
  const { id } = req.params as { id: string }
  const parsed = z.object({ permissionCodes: z.array(z.string()).default([]) }).safeParse(req.body)
  if (!parsed.success) {
    return reply.status(400).send({ error: 'ValidationError', message: parsed.error.errors[0].message, statusCode: 400 })
  }

  const user = await fastify.prisma.user.findUnique({ where: { id }, include: USER_INCLUDE })
  if (!user) {
    return reply.status(404).send({ error: 'NotFound', message: 'Utente non trovato', statusCode: 404 })
  }

  const accessError = ensureCanAccessUser(reply, user as UserRecord, req.auth, {
    allowAllPermission: canUpdateAllUsers(req.auth.permissions),
    allowSuperAdminPermission: canManageSuperAdmins(req.auth.permissions),
  })
  if (accessError) return accessError

  const replaceError = await replaceUserDirectPermissions(fastify.prisma, id, parsed.data.permissionCodes, req.auth.userId)
  if (replaceError) {
    return reply.status(400).send(replaceError)
  }

  return reply.send(await getUserPermissionDetail(fastify.prisma, id))
})
```

- [ ] **Step 5: Run the test to verify GREEN**

Run: `npm run test -w backend -- src/routes/__tests__/user-permissions.test.ts`

Expected: PASS with the user permission detail and replacement tests green.

---

### Task 3: Add Role Permission Endpoints and Migrate Catalog Placeholder Guards

**Files:**
- Modify: `backend/src/lib/authorization/admin-permission-details.ts`
- Modify: `backend/src/routes/roles.ts`
- Modify: `backend/src/routes/catalog.ts`
- Test: `backend/src/routes/__tests__/role-permissions.test.ts`
- Test: `backend/src/routes/__tests__/catalog.test.ts`

- [ ] **Step 1: Write the failing role and catalog route tests**

```ts
it('returns the permission bundle for a custom role', async () => {
  const res = await app.inject({
    method: 'GET',
    url: `/api/roles/${customRoleId}/permissions`,
    headers: { cookie: superAdminCookie },
  })

  expect(res.statusCode).toBe(200)
  const body = res.json() as { role: { id: string }; permissions: Array<{ code: string }> }
  expect(body.role.id).toBe(customRoleId)
})

it('returns 409 when updating a system role permission bundle', async () => {
  const res = await app.inject({
    method: 'PUT',
    url: `/api/roles/${systemRoleId}/permissions`,
    headers: { cookie: superAdminCookie },
    payload: { permissionCodes: ['roles.read'] },
  })

  expect(res.statusCode).toBe(409)
})

it('guards GET /api/admin/catalog/pdf with catalog.pdf.read', async () => {
  const denied = await app.inject({ method: 'GET', url: '/api/admin/catalog/pdf', headers: { cookie: managerCookie } })
  expect(denied.statusCode).toBe(403)

  const allowed = await app.inject({ method: 'GET', url: '/api/admin/catalog/pdf', headers: { cookie: superAdminCookie } })
  expect(allowed.statusCode).toBe(501)
})
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm run test -w backend -- src/routes/__tests__/role-permissions.test.ts src/routes/__tests__/catalog.test.ts`

Expected: FAIL because the new role permission endpoints and catalog permission guards do not exist yet.

- [ ] **Step 3: Add replace-all role bundle helper**

```ts
export async function replaceRolePermissions(prisma: PrismaClient, roleId: string, permissionCodes: string[]) {
  const permissions = permissionCodes.length
    ? await prisma.permission.findMany({ where: { code: { in: permissionCodes } } })
    : []

  if (permissions.length !== permissionCodes.length) {
    return { error: 'ValidationError', message: 'Uno o piu permessi non sono validi', statusCode: 400 } as const
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    ...(permissions.length > 0
      ? [prisma.rolePermission.createMany({
          data: permissions.map((permission) => ({ roleId, permissionId: permission.id })),
        })]
      : []),
  ])

  return null
}
```

- [ ] **Step 4: Implement role permission endpoints and catalog permission guards**

```ts
fastify.get('/:id/permissions', {
  preHandler: [fastify.checkPermission('roles.read')],
}, async (req, reply) => {
  const { id } = req.params as { id: string }
  const detail = await getRolePermissionDetail(fastify.prisma, id)
  if (!detail) {
    return reply.status(404).send({ error: 'NotFound', message: 'Ruolo non trovato', statusCode: 404 })
  }
  return reply.send(detail)
})

fastify.put('/:id/permissions', {
  preHandler: [fastify.checkPermission('roles.manage')],
}, async (req, reply) => {
  const { id } = req.params as { id: string }
  const parsed = z.object({ permissionCodes: z.array(z.string()).default([]) }).safeParse(req.body)
  if (!parsed.success) {
    return reply.status(400).send({ error: 'ValidationError', message: parsed.error.errors[0].message, statusCode: 400 })
  }

  const role = await fastify.prisma.role.findUnique({ where: { id } })
  if (!role) {
    return reply.status(404).send({ error: 'NotFound', message: 'Ruolo non trovato', statusCode: 404 })
  }
  if (role.isSystem) {
    return reply.status(409).send({ error: 'Conflict', message: 'I ruoli di sistema non possono essere modificati', statusCode: 409 })
  }

  const replaceError = await replaceRolePermissions(fastify.prisma, id, parsed.data.permissionCodes)
  if (replaceError) {
    return reply.status(400).send(replaceError)
  }

  return reply.send(await getRolePermissionDetail(fastify.prisma, id))
})

fastify.addHook('preHandler', fastify.authenticate)
fastify.addHook('preHandler', fastify.loadAuthorizationContext)

fastify.get('/pdf', { preHandler: [fastify.checkPermission('catalog.pdf.read')] }, async (_req, reply) => {
  return reply.status(501).send(NOT_IMPLEMENTED)
})

fastify.post('/pdf', { preHandler: [fastify.checkPermission('catalog.pdf.write')] }, async (_req, reply) => {
  return reply.status(501).send(NOT_IMPLEMENTED)
})
```

- [ ] **Step 5: Run the tests to verify GREEN**

Run: `npm run test -w backend -- src/routes/__tests__/role-permissions.test.ts src/routes/__tests__/catalog.test.ts`

Expected: PASS for custom-role editing, system-role protection, and catalog permission guards.

---

### Task 4: Add Shared Frontend Permission Client and Reusable Permission Editor UI

**Files:**
- Create: `frontend/src/lib/admin/permissions-api.ts`
- Create: `frontend/src/components/admin/PermissionChecklist.tsx`
- Create: `frontend/src/components/admin/PermissionEditorModal.tsx`
- Test: `frontend/src/components/admin/__tests__/PermissionChecklist.test.tsx`

- [ ] **Step 1: Write the failing shared frontend component test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PermissionChecklist from '../PermissionChecklist'

const permissions = [
  { id: '1', code: 'roles.read', resource: 'roles', action: 'read', scope: null, label: 'Ruoli', description: 'Vedere ruoli', isSystem: true },
  { id: '2', code: 'users.create', resource: 'users', action: 'create', scope: null, label: 'Crea utenti', description: 'Creare utenti', isSystem: true },
]

it('filters by code and label', () => {
  render(<PermissionChecklist permissions={permissions} selectedCodes={[]} readOnly={false} onToggle={vi.fn()} />)
  fireEvent.change(screen.getByPlaceholderText('Cerca permesso'), { target: { value: 'ruoli' } })
  expect(screen.getByText('roles.read')).toBeTruthy()
  expect(screen.queryByText('users.create')).toBeNull()
})

it('disables checkboxes in read-only mode', () => {
  render(<PermissionChecklist permissions={permissions} selectedCodes={['roles.read']} readOnly onToggle={vi.fn()} />)
  expect(screen.getByLabelText('roles.read')).toBeDisabled()
})
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm run test -w frontend -- src/components/admin/__tests__/PermissionChecklist.test.tsx`

Expected: FAIL because the shared component does not exist yet.

- [ ] **Step 3: Create the admin permission API client**

```ts
import api from '../api'
import type { AdminPermission, AdminRolePermissionDetail, AdminUserPermissionDetail, PaginatedResponse } from '../../../../backend/src/types/shared'

export const permissionsApi = {
  list: () => api.get<PaginatedResponse<AdminPermission>>('/permissions').then((res) => res.data),
  getUserPermissions: (id: string) => api.get<AdminUserPermissionDetail>(`/users/${id}/permissions`).then((res) => res.data),
  updateUserPermissions: (id: string, permissionCodes: string[]) => api.put<AdminUserPermissionDetail>(`/users/${id}/permissions`, { permissionCodes }).then((res) => res.data),
  getRolePermissions: (id: string) => api.get<AdminRolePermissionDetail>(`/roles/${id}/permissions`).then((res) => res.data),
  updateRolePermissions: (id: string, permissionCodes: string[]) => api.put<AdminRolePermissionDetail>(`/roles/${id}/permissions`, { permissionCodes }).then((res) => res.data),
}
```

- [ ] **Step 4: Implement the shared checklist and modal**

```tsx
interface PermissionChecklistProps {
  permissions: AdminPermission[]
  selectedCodes: string[]
  readOnly: boolean
  onToggle: (permissionCode: string) => void
}

export default function PermissionChecklist({ permissions, selectedCodes, readOnly, onToggle }: PermissionChecklistProps) {
  const [query, setQuery] = useState('')

  const filtered = permissions.filter((permission) => {
    const haystack = `${permission.code} ${permission.label} ${permission.description}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  return (
    <div className="space-y-4">
      <input placeholder="Cerca permesso" value={query} onChange={(event) => setQuery(event.target.value)} className="admin-input" />
      <div className="space-y-2">
        {filtered.map((permission) => {
          const checked = selectedCodes.includes(permission.code)
          return (
            <label key={permission.code} aria-label={permission.code} className="flex items-start gap-3 border border-[#E5E0D8] bg-white px-4 py-3">
              <input type="checkbox" checked={checked} disabled={readOnly} onChange={() => onToggle(permission.code)} />
              <div>
                <p className="admin-code">{permission.code}</p>
                <p className="text-sm text-[#1A1A1A]">{permission.label}</p>
                <p className="text-xs text-[#6B7280]">{permission.description}</p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify GREEN**

Run: `npm run test -w frontend -- src/components/admin/__tests__/PermissionChecklist.test.tsx`

Expected: PASS with filtering and read-only behavior covered.

---

### Task 5: Integrate User Permission Management into `UsersPage`

**Files:**
- Modify: `frontend/src/pages/admin/UsersPage.tsx`
- Test: `frontend/src/pages/admin/__tests__/UsersPage.test.tsx`

- [ ] **Step 1: Write the failing `UsersPage` permission-management test**

```tsx
it('loads, displays, and saves direct grants from the permission modal', async () => {
  vi.mocked(usersApi.list).mockResolvedValue({ data: [userRow], pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 } })
  vi.mocked(permissionsApi.list).mockResolvedValue({ data: permissionCatalog, pagination: { page: 1, pageSize: 2, total: 2, totalPages: 1 } })
  vi.mocked(permissionsApi.getUserPermissions).mockResolvedValue(userPermissionDetail)
  vi.mocked(permissionsApi.updateUserPermissions).mockResolvedValue(updatedUserPermissionDetail)

  render(<UsersPage />)

  await userEvent.click(await screen.findByRole('button', { name: 'Permessi' }))
  expect(await screen.findByText('Permessi effettivi')).toBeTruthy()

  await userEvent.click(screen.getByLabelText('roles.read'))
  await userEvent.click(screen.getByRole('button', { name: 'Salva permessi' }))

  expect(permissionsApi.updateUserPermissions).toHaveBeenCalledWith(userRow.id, ['roles.read'])
  expect(await screen.findByText('roles.read')).toBeTruthy()
})
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm run test -w frontend -- src/pages/admin/__tests__/UsersPage.test.tsx`

Expected: FAIL because `UsersPage` has no permission action or modal yet.

- [ ] **Step 3: Add permission modal state and action to `UsersPage`**

```tsx
const [permissionTarget, setPermissionTarget] = useState<AdminUser | null>(null)
const [permissionCatalog, setPermissionCatalog] = useState<AdminPermission[]>([])
const [permissionDetail, setPermissionDetail] = useState<AdminUserPermissionDetail | null>(null)
const [selectedDirectPermissionCodes, setSelectedDirectPermissionCodes] = useState<string[]>([])
const [isPermissionLoading, setIsPermissionLoading] = useState(false)
const [isPermissionSaving, setIsPermissionSaving] = useState(false)

const openPermissions = async (user: AdminUser) => {
  setPermissionTarget(user)
  setIsPermissionLoading(true)
  try {
    const [catalogRes, detailRes] = await Promise.all([
      permissionsApi.list(),
      permissionsApi.getUserPermissions(user.id),
    ])
    setPermissionCatalog(catalogRes.data)
    setPermissionDetail(detailRes)
    setSelectedDirectPermissionCodes(detailRes.directPermissions.map((permission) => permission.code))
  } finally {
    setIsPermissionLoading(false)
  }
}
```

- [ ] **Step 4: Render the shared permission modal in `UsersPage`**

```tsx
<PermissionEditorModal
  isOpen={!!permissionTarget}
  title={permissionTarget ? `Permessi utente: ${permissionTarget.firstName} ${permissionTarget.lastName}` : 'Permessi utente'}
  isLoading={isPermissionLoading}
  isSaving={isPermissionSaving}
  permissions={permissionCatalog}
  selectedCodes={selectedDirectPermissionCodes}
  effectiveCodes={permissionDetail?.effectivePermissions.map((permission) => permission.code) ?? []}
  readOnly={false}
  secondarySection={{
    title: 'Ruoli assegnati',
    content: permissionDetail?.roles.map((role) => role.label).join(', ') ?? '—',
  }}
  onToggle={(permissionCode) => {
    setSelectedDirectPermissionCodes((current) => current.includes(permissionCode)
      ? current.filter((code) => code !== permissionCode)
      : [...current, permissionCode])
  }}
  onClose={() => setPermissionTarget(null)}
  onSave={async () => {
    if (!permissionTarget) return
    setIsPermissionSaving(true)
    try {
      const detail = await permissionsApi.updateUserPermissions(permissionTarget.id, selectedDirectPermissionCodes)
      setPermissionDetail(detail)
      setSelectedDirectPermissionCodes(detail.directPermissions.map((permission) => permission.code))
    } finally {
      setIsPermissionSaving(false)
    }
  }}
/>
```

- [ ] **Step 5: Run the test to verify GREEN**

Run: `npm run test -w frontend -- src/pages/admin/__tests__/UsersPage.test.tsx`

Expected: PASS with modal open/load/save behavior covered.

---

### Task 6: Integrate Role Permission Management into `RolesPage`

**Files:**
- Modify: `frontend/src/pages/admin/RolesPage.tsx`
- Test: `frontend/src/pages/admin/__tests__/RolesPage.test.tsx`

- [ ] **Step 1: Write the failing `RolesPage` permission-management tests**

```tsx
it('shows system role permissions in read-only mode', async () => {
  vi.mocked(rolesApi.list).mockResolvedValue({ data: [systemRole], pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 } })
  vi.mocked(permissionsApi.list).mockResolvedValue({ data: permissionCatalog, pagination: { page: 1, pageSize: 2, total: 2, totalPages: 1 } })
  vi.mocked(permissionsApi.getRolePermissions).mockResolvedValue(systemRoleDetail)

  render(<RolesPage />)

  await userEvent.click(await screen.findByRole('button', { name: 'Permessi' }))
  expect(await screen.findByLabelText('roles.read')).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Salva permessi' })).toBeNull()
})

it('updates custom role permissions', async () => {
  vi.mocked(rolesApi.list).mockResolvedValue({ data: [customRole], pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 } })
  vi.mocked(permissionsApi.list).mockResolvedValue({ data: permissionCatalog, pagination: { page: 1, pageSize: 2, total: 2, totalPages: 1 } })
  vi.mocked(permissionsApi.getRolePermissions).mockResolvedValue(customRoleDetail)
  vi.mocked(permissionsApi.updateRolePermissions).mockResolvedValue(updatedCustomRoleDetail)

  render(<RolesPage />)

  await userEvent.click(await screen.findByRole('button', { name: 'Permessi' }))
  await userEvent.click(screen.getByLabelText('users.create'))
  await userEvent.click(screen.getByRole('button', { name: 'Salva permessi' }))

  expect(permissionsApi.updateRolePermissions).toHaveBeenCalledWith(customRole.id, ['users.create'])
})
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm run test -w frontend -- src/pages/admin/__tests__/RolesPage.test.tsx`

Expected: FAIL because `RolesPage` has no permission action or permission modal yet.

- [ ] **Step 3: Add permission modal state and action to `RolesPage`**

```tsx
const [permissionTarget, setPermissionTarget] = useState<AdminRole | null>(null)
const [permissionCatalog, setPermissionCatalog] = useState<AdminPermission[]>([])
const [permissionDetail, setPermissionDetail] = useState<AdminRolePermissionDetail | null>(null)
const [selectedPermissionCodes, setSelectedPermissionCodes] = useState<string[]>([])
const [isPermissionLoading, setIsPermissionLoading] = useState(false)
const [isPermissionSaving, setIsPermissionSaving] = useState(false)

const openPermissions = async (role: AdminRole) => {
  setPermissionTarget(role)
  setIsPermissionLoading(true)
  try {
    const [catalogRes, detailRes] = await Promise.all([
      permissionsApi.list(),
      permissionsApi.getRolePermissions(role.id),
    ])
    setPermissionCatalog(catalogRes.data)
    setPermissionDetail(detailRes)
    setSelectedPermissionCodes(detailRes.permissions.map((permission) => permission.code))
  } finally {
    setIsPermissionLoading(false)
  }
}
```

- [ ] **Step 4: Render read-only system role mode and editable custom role mode**

```tsx
<PermissionEditorModal
  isOpen={!!permissionTarget}
  title={permissionTarget ? `Permessi ruolo: ${permissionTarget.label}` : 'Permessi ruolo'}
  isLoading={isPermissionLoading}
  isSaving={isPermissionSaving}
  permissions={permissionCatalog}
  selectedCodes={selectedPermissionCodes}
  effectiveCodes={selectedPermissionCodes}
  readOnly={permissionTarget?.isSystem ?? true}
  secondarySection={{
    title: 'Tipo ruolo',
    content: permissionTarget?.isSystem ? 'Ruolo di sistema (sola lettura)' : 'Ruolo custom modificabile',
  }}
  onToggle={(permissionCode) => {
    setSelectedPermissionCodes((current) => current.includes(permissionCode)
      ? current.filter((code) => code !== permissionCode)
      : [...current, permissionCode])
  }}
  onClose={() => setPermissionTarget(null)}
  onSave={permissionTarget?.isSystem ? undefined : async () => {
    if (!permissionTarget) return
    setIsPermissionSaving(true)
    try {
      const detail = await permissionsApi.updateRolePermissions(permissionTarget.id, selectedPermissionCodes)
      setPermissionDetail(detail)
      setSelectedPermissionCodes(detail.permissions.map((permission) => permission.code))
    } finally {
      setIsPermissionSaving(false)
    }
  }}
/>
```

- [ ] **Step 5: Run the test to verify GREEN**

Run: `npm run test -w frontend -- src/pages/admin/__tests__/RolesPage.test.tsx`

Expected: PASS for both system-role read-only and custom-role save flows.

---

### Task 7: Update Authorization Docs and Run Full Verification

**Files:**
- Modify: `AUTHORIZATION.md`
- Modify: `docs/authorization-runtime.md`
- Verify: backend and frontend test/build commands

- [ ] **Step 1: Add failing coverage for any untested permission management path discovered during Tasks 1-6**

```ts
// Add only if coverage gaps remain after the earlier tasks.
// Examples:
// - invalid permission code in PUT /users/:id/permissions -> 400
// - GET /api/roles/:id/permissions -> 404 for missing role
// - catalog POST -> catalog.pdf.write required
```

- [ ] **Step 2: Update runtime docs to close the remaining gaps**

```md
- `AUTHORIZATION.md`: mark Phase 6 completed and remove the catalog placeholder exception section
- `docs/authorization-runtime.md`: add `/api/permissions`, `/api/users/:id/permissions`, `/api/roles/:id/permissions`, and `/api/admin/catalog/pdf`
```

- [ ] **Step 3: Run backend tests for the new authorization-admin surface**

Run: `npm run test -w backend -- src/routes/__tests__/permissions.test.ts src/routes/__tests__/user-permissions.test.ts src/routes/__tests__/role-permissions.test.ts src/routes/__tests__/catalog.test.ts`

Expected: PASS.

- [ ] **Step 4: Run frontend tests for the new admin permission UI**

Run: `npm run test -w frontend -- src/components/admin/__tests__/PermissionChecklist.test.tsx src/pages/admin/__tests__/UsersPage.test.tsx src/pages/admin/__tests__/RolesPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run full verification on the branch**

Run: `set -a && source "/Users/spawn5m/Documents/DEV/M.me/backend/.env" && set +a && npm run test -w backend && npm run test -w frontend && npm run build -w backend && npm run build -w frontend`

Expected: all test suites pass, backend build exits `0`, frontend build exits `0`.

---

## Self-Review

### Spec coverage

- Permission catalog API: covered by Task 1
- User direct grant UI and effective permission visibility: covered by Tasks 2, 4, 5
- Role permission bundle management for custom roles: covered by Tasks 3, 4, 6
- System roles read-only: covered by Task 3 and Task 6
- Catalog placeholder migration off `checkRole(...)`: covered by Task 3
- Docs closure for Phase 6 and the catalog exception: covered by Task 7

No spec gaps found.

### Placeholder scan

- No `TODO` / `TBD` markers remain in the plan.
- Each task names exact files and concrete commands.
- Each code-writing step includes concrete snippets rather than abstract instructions.

### Type consistency

- Shared DTO names are consistent across backend and frontend tasks: `AdminPermission`, `AdminUserPermissionDetail`, `AdminRolePermissionDetail`.
- API client methods match route names used in backend tasks.
- Catalog route path is consistently `/api/admin/catalog/pdf` through route registration and tests.

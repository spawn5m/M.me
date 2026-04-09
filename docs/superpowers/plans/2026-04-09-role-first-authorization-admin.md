# Role-First Authorization Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Ruoli` the only admin surface for managing permissions, and allow selecting a role's initial permissions directly while creating a new custom role.

**Architecture:** Keep the current permission-based runtime and role permission APIs, but shift the admin UX to a strict role-first model. `UsersPage` stops exposing direct permission editing, while `RolesPage` owns both initial role permission selection and later bundle editing. Backend `POST /api/roles` is extended to accept `permissionCodes[]` with the same validation and anti-escalation rules already used by role permission updates.

**Tech Stack:** Fastify v5, Prisma, Zod, React 19, React Hook Form, Vitest, React Testing Library, shared TypeScript DTOs

**Execution note:** Do not create git commits unless the user explicitly asks for them.

---

## File Structure

### Backend

- Modify: `backend/src/routes/roles.ts`
  Purpose: extend role creation to accept and persist `permissionCodes[]` in the same request.

### Frontend

- Modify: `frontend/src/lib/admin/roles-api.ts`
  Purpose: include `permissionCodes[]` in the create-role payload type.
- Modify: `frontend/src/pages/admin/RolesPage.tsx`
  Purpose: embed the permission checklist into the create-role modal and submit selected permissions at creation time.
- Modify: `frontend/src/pages/admin/UsersPage.tsx`
  Purpose: remove the per-user `Permessi` action and its modal workflow from the visible admin UI.

### Tests

- Modify: `frontend/src/pages/admin/__tests__/RolesPage.test.tsx`
  Purpose: verify the create-role modal renders and submits the permission checklist.
- Modify: `frontend/src/pages/admin/__tests__/UsersPage.test.tsx`
  Purpose: verify `UsersPage` no longer exposes user-level permission editing.

### Docs

- Modify: `AUTHORIZATION.md`
  Purpose: describe the admin workflow as role-first.
- Modify: `docs/authorization-runtime.md`
  Purpose: state that permission management is operationally role-based in the admin UI.

---

### Task 1: Extend Role Creation to Accept Initial Permissions

**Files:**
- Modify: `backend/src/routes/roles.ts`
- Test: existing backend role tests in `backend/src/routes/__tests__/roles.test.ts`

- [ ] **Step 1: Write the failing role creation tests**

```ts
it('creates a custom role with an initial permission bundle', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/roles',
    headers: { cookie: superAdminCookie },
    payload: {
      name: 'custom_catalog_editor',
      label: 'Catalog Editor',
      permissionCodes: ['articles.coffins.read', 'catalog.pdf.read'],
    },
  })

  expect(res.statusCode).toBe(201)

  const role = await app.prisma.role.findUnique({
    where: { name: 'custom_catalog_editor' },
    include: { rolePermissions: { include: { permission: true } } },
  })

  expect(role?.rolePermissions.map((entry) => entry.permission.code).sort()).toEqual([
    'articles.coffins.read',
    'catalog.pdf.read',
  ])
})

it('rejects creation when requested permission codes exceed the caller permission set', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/roles',
    headers: { cookie: managerCookie },
    payload: {
      name: 'unauthorized_bundle',
      label: 'Unauthorized Bundle',
      permissionCodes: ['roles.manage'],
    },
  })

  expect(res.statusCode).toBe(403)
})
```

- [ ] **Step 2: Run the test to verify RED**

Run: `set -a && source "/Users/spawn5m/Documents/DEV/M.me/backend/.env" && set +a && npm run test -w backend -- src/routes/__tests__/roles.test.ts`

Expected: FAIL because `POST /api/roles` currently ignores `permissionCodes[]`.

- [ ] **Step 3: Extend the create-role schema and create handler**

```ts
const createRoleSchema = z.object({
  name: z.string().regex(/^[a-z_]+$/, 'Il nome deve contenere solo lettere minuscole e underscore'),
  label: z.string().min(1, 'Label obbligatoria'),
  permissionCodes: z.array(z.string()).default([]),
})

const { name, label, permissionCodes } = parsed.data

const role = await fastify.prisma.role.create({
  data: { name, label, isSystem: false },
})

const replaceError = await replaceRolePermissions(
  fastify.prisma,
  role.id,
  permissionCodes,
  req.auth.permissions,
)

if (replaceError) {
  await fastify.prisma.role.delete({ where: { id: role.id } })
  return reply.status(replaceError.statusCode).send(replaceError)
}
```

- [ ] **Step 4: Run the test to verify GREEN**

Run: `set -a && source "/Users/spawn5m/Documents/DEV/M.me/backend/.env" && set +a && npm run test -w backend -- src/routes/__tests__/roles.test.ts`

Expected: PASS with role creation and anti-escalation covered.

---

### Task 2: Send Initial Permission Selection from the Create-Role Modal

**Files:**
- Modify: `frontend/src/lib/admin/roles-api.ts`
- Modify: `frontend/src/pages/admin/RolesPage.tsx`
- Test: `frontend/src/pages/admin/__tests__/RolesPage.test.tsx`

- [ ] **Step 1: Write the failing create-role UI test**

```tsx
it('submits selected permission codes when creating a new role', async () => {
  vi.mocked(rolesApi.list).mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 0, total: 0, totalPages: 1 } })
  vi.mocked(permissionsApi.list).mockResolvedValue({
    data: [
      { id: '1', code: 'articles.coffins.read', resource: 'articles.coffins', action: 'read', scope: null, label: 'Leggere cofani', description: 'Consente di vedere i cofani', isSystem: true },
    ],
    pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
  })
  vi.mocked(rolesApi.create).mockResolvedValue({ id: 'r1', name: 'custom_catalog_editor', label: 'Catalog Editor', isSystem: false })

  render(<RolesPage />)

  await userEvent.click(screen.getByRole('button', { name: '+ Nuovo ruolo' }))
  await userEvent.type(screen.getByLabelText(/Identificatore/), 'custom_catalog_editor')
  await userEvent.type(screen.getByLabelText(/Nome visualizzato/), 'Catalog Editor')
  await userEvent.click(screen.getByRole('checkbox', { name: /Leggere cofani/i }))
  await userEvent.click(screen.getByRole('button', { name: /Salva/i }))

  expect(rolesApi.create).toHaveBeenCalledWith({
    name: 'custom_catalog_editor',
    label: 'Catalog Editor',
    permissionCodes: ['articles.coffins.read'],
  })
})
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm run test -w frontend -- src/pages/admin/__tests__/RolesPage.test.tsx`

Expected: FAIL because the create-role modal currently has no permission checklist and `rolesApi.create()` only accepts `name` and `label`.

- [ ] **Step 3: Extend the frontend create payload type**

```ts
interface CreateRolePayload {
  name: string
  label: string
  permissionCodes?: string[]
}
```

- [ ] **Step 4: Load permission catalog for the create-role modal and render the checklist**

```tsx
const [createPermissionCatalog, setCreatePermissionCatalog] = useState<AdminPermission[]>([])
const [selectedCreatePermissionCodes, setSelectedCreatePermissionCodes] = useState<string[]>([])

const openCreateModal = async () => {
  setPageError(null)
  clearErrors()
  reset()
  setSelectedCreatePermissionCodes([])
  const catalogRes = await permissionsApi.list()
  setCreatePermissionCatalog(catalogRes.data)
  setShowCreateModal(true)
}

<PermissionChecklist
  permissions={createPermissionCatalog}
  selectedCodes={selectedCreatePermissionCodes}
  readOnly={false}
  onToggle={(permissionCode) => {
    setSelectedCreatePermissionCodes((current) => current.includes(permissionCode)
      ? current.filter((code) => code !== permissionCode)
      : [...current, permissionCode])
  }}
/>
```

- [ ] **Step 5: Submit `permissionCodes[]` during role creation and verify GREEN**

```tsx
await rolesApi.create({
  ...result.data,
  permissionCodes: selectedCreatePermissionCodes,
})
```

Run: `npm run test -w frontend -- src/pages/admin/__tests__/RolesPage.test.tsx`

Expected: PASS with create-role permission selection covered.

---

### Task 3: Remove User-Level Permission Editing from `UsersPage`

**Files:**
- Modify: `frontend/src/pages/admin/UsersPage.tsx`
- Test: `frontend/src/pages/admin/__tests__/UsersPage.test.tsx`

- [ ] **Step 1: Write the failing `UsersPage` regression test**

```tsx
it('does not render a Permessi action for user rows', async () => {
  vi.mocked(usersApi.list).mockResolvedValue({
    data: [userRow],
    pagination: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
  })

  render(<UsersPage />)

  expect(await screen.findByText(userRow.email)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Permessi' })).toBeNull()
})
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm run test -w frontend -- src/pages/admin/__tests__/UsersPage.test.tsx`

Expected: FAIL because the page currently still renders and wires the user permission action/modal.

- [ ] **Step 3: Remove user permission UI state and action wiring**

```tsx
// Remove:
// - permissionTarget
// - permissionCatalog
// - permissionDetail
// - selectedDirectPermissionCodes
// - isPermissionLoading
// - isPermissionSaving
// - permissionError
// - openPermissions / closePermissions / handlePermissionSave / toggleDirectPermission
// - PermissionEditorModal import and render

actions={[
  {
    label: 'Modifica',
    onClick: (u) => openEdit(u as AdminUser),
  },
  {
    label: 'Listini',
    onClick: (u) => openAssign(u as AdminUser),
  },
  {
    label: 'Elimina',
    variant: 'danger',
    onClick: (u) => setConfirmTarget(u as AdminUser),
  },
]}
```

- [ ] **Step 4: Run the test to verify GREEN**

Run: `npm run test -w frontend -- src/pages/admin/__tests__/UsersPage.test.tsx`

Expected: PASS with no user-level permission UI remaining.

---

### Task 4: Align Documentation and Re-Verify the Role-First Workflow

**Files:**
- Modify: `AUTHORIZATION.md`
- Modify: `docs/authorization-runtime.md`

- [ ] **Step 1: Update docs to describe the admin workflow as role-first**

```md
- `AUTHORIZATION.md`: permission management is operationally handled from `Ruoli`
- `docs/authorization-runtime.md`: user direct grants are not part of the normal admin UI flow
```

- [ ] **Step 2: Run targeted frontend tests**

Run: `npm run test -w frontend -- src/pages/admin/__tests__/RolesPage.test.tsx src/pages/admin/__tests__/UsersPage.test.tsx`

Expected: PASS.

- [ ] **Step 3: Run targeted backend role tests**

Run: `set -a && source "/Users/spawn5m/Documents/DEV/M.me/backend/.env" && set +a && npm run test -w backend -- src/routes/__tests__/roles.test.ts`

Expected: PASS.

- [ ] **Step 4: Run full verification**

Run: `set -a && source "/Users/spawn5m/Documents/DEV/M.me/backend/.env" && set +a && npm run test -w backend && npm run test -w frontend && npm run build -w backend && npm run build -w frontend`

Expected: all tests pass, backend build passes, frontend build passes.

---

## Self-Review

### Spec coverage

- `UsersPage` no longer exposes permission editing: Task 3
- `RolesPage` remains the only visible permission-management surface: Tasks 2 and 3
- new role modal includes permission checklist with label, code, description, checkbox: Task 2
- `POST /api/roles` accepts `permissionCodes[]`: Task 1
- docs aligned to role-first workflow: Task 4

No spec gaps found.

### Placeholder scan

- No `TODO` / `TBD` markers remain.
- All tasks name exact files, commands, and concrete code shapes.

### Type consistency

- `permissionCodes[]` is used consistently in backend route schema, frontend API client, and `RolesPage` submit flow.
- `RolesPage` reuses the existing `PermissionChecklist` component rather than inventing a second checklist path.

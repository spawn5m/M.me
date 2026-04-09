# Role-First Authorization Admin Design

## Goal

Make role permissions the only operational permission-management surface in the admin UI.

This closes the remaining authorization UX gap with a role-first model:

- users receive effective permissions from their assigned roles
- admins manage permission bundles only from `Ruoli`
- `UsersPage` no longer exposes direct per-user permission editing

The client continues consuming `permissions[]` from the backend, but those permissions are expected to come from assigned roles during normal administration.

## Current Context

The current runtime already supports permission-based authorization and returns effective `permissions[]` from the backend.

The repository also already contains:

- role permission APIs for reading and updating bundles
- user direct-grant APIs and UI work started around `UsersPage`
- catalog placeholder guards migrated to `catalog.pdf.read` / `catalog.pdf.write`

The requested product direction changes the admin operating model:

- permission management must be done on roles, not on individual users
- users should still log in and receive effective permissions from the backend
- the admin experience should make that role-first rule obvious

## Recommended Approach

Use a strict role-first admin UX while keeping backend runtime support incremental.

Why this approach:

- it matches the requested mental model exactly: users get access through roles
- it avoids spreading permission editing across two places (`Utenti` and `Ruoli`)
- it keeps the runtime stable while simplifying the visible product behavior

Alternatives rejected:

- keep both user grants and role bundles visible: technically flexible, but contradicts the requested admin workflow
- remove `UserPermission` from the runtime entirely now: cleaner long-term, but a much larger change than needed for this request

## Product Rules

### Rule 1: Permissions are managed from roles

`RolesPage` is the only admin page where permissions are visible and editable.

- system roles remain read-only
- custom roles are editable
- creating a custom role includes choosing its initial permission bundle

### Rule 2: Users are assigned roles, not direct permission grants

`UsersPage` keeps responsibility for:

- user data
- role assignment
- manager assignment
- pricelist assignment

`UsersPage` must not expose a `Permessi` action or any direct-grant editor.

### Rule 3: Client access still depends on backend effective permissions

The client and admin frontend continue using `permissions[]` from `/api/auth/login` and `/api/auth/me`.

The difference is operational, not transport-level:

- backend may still resolve effective permissions in the same way
- the supported admin workflow is role-based permission assignment

## Backend Design

### Role creation with initial permission bundle

Extend `POST /api/roles` so a new custom role can be created with `permissionCodes[]` in the same request.

Behavior:

- `name` and `label` keep the current validation rules
- `permissionCodes[]` is optional
- duplicates are deduplicated
- each requested code must be a valid known permission
- caller cannot assign permission codes they do not currently hold
- the role is created first, then its permission bundle is stored atomically in the same request flow

This avoids a two-step UX where an admin must create a role and then immediately open another modal to make it useful.

### Existing role permission editing stays in place

`GET /api/roles/:id/permissions` and `PUT /api/roles/:id/permissions` remain the edit/read surface for existing roles.

Rules stay unchanged:

- `roles.read` for reading
- `roles.manage` for writing
- system roles visible but not editable
- anti-escalation guard remains active

### User direct-grant endpoints

`/api/users/:id/permissions` can remain implemented for runtime compatibility and internal tooling, but they are no longer part of the intended admin product flow.

No UI in this scope calls them.

## Frontend Design

### Users Page

`UsersPage` is simplified.

- remove the `Permessi` action from each row
- remove the user permission modal
- remove direct-grant and effective-permission UX from the user page
- keep existing user CRUD, role assignment, manager assignment, and pricelist assignment UX intact

This makes the page consistent with the new rule: users inherit access from roles.

### Roles Page

`RolesPage` becomes the single operational surface for permission bundles.

It has two permission entry points:

1. `Nuovo ruolo`
2. `Permessi` on existing roles

### New role modal

The `Nuovo ruolo` modal must include:

- `Identificatore`
- `Nome visualizzato`
- `Permessi del ruolo`

The permissions section must show:

- human-readable label
- permission code
- short description
- checkbox

Behavior:

- all checkboxes start deselected
- the list is searchable by code, label, and description
- the admin can create a role with no permissions or with any allowed subset
- save submits `name`, `label`, and selected `permissionCodes[]` together

### Existing role permission modal

Keep the existing permission modal on `RolesPage`, reusing the same permission checklist component.

- system role: read-only
- custom role: editable
- save refreshes the displayed bundle from the API response

## Shared UI Component Rules

The shared permission checklist remains useful, but its operational meaning changes:

- in create-role mode: selects the initial bundle for a new custom role
- in edit-role mode: updates an existing custom role
- no user-level permission mode is needed in the visible product flow

The checklist must continue showing:

- label
- code
- description
- search/filter support

## Error Handling

### Backend

Keep current API conventions:

- `400` invalid payload or unknown permission code
- `403` missing permission or delegation beyond caller authority
- `404` missing role
- `409` system role mutation attempt

### Frontend

Keep errors local to the relevant modal:

- create-role modal shows create/save errors inline
- role permission modal shows load/save errors inline
- page-level role list loading failures remain page-level

## Testing Design

### Backend

Tests must cover:

- `POST /api/roles` with `permissionCodes[]`
- create-role anti-escalation in the same request
- create-role validation for unknown permission codes
- existing `PUT /api/roles/:id/permissions` flow remains green

### Frontend

Tests must cover:

- `UsersPage` no longer renders a `Permessi` action
- `RolesPage` create modal renders the permission checklist
- new role creation sends selected `permissionCodes[]`
- role creation can succeed with no selected permissions
- existing `Permessi` flow on role rows still works

## Documentation Impact

`AUTHORIZATION.md` and `docs/authorization-runtime.md` must be updated to say:

- operational permission management is role-first
- users receive effective permissions derived from their assigned roles in the intended workflow
- user direct grants are not part of the normal admin UI flow

## Out of Scope

This design does not include:

- deleting `UserPermission` from the schema
- removing backend support for user direct grants immediately
- redesigning route guards or auth payload shape
- building a separate permissions dashboard

## Success Criteria

This change is complete when:

- `UsersPage` no longer exposes per-user permission editing
- `RolesPage` is the only visible place to manage permissions
- `Nuovo ruolo` includes a searchable permission checklist with label, code, description, and checkboxes
- creating a role can persist its initial permission bundle in one submit
- the client still receives effective permissions after login based on assigned roles

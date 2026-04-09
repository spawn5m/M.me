import type {
  AdminPermission,
  AdminRole,
  AdminRolePermissionDetail,
  AdminUserPermissionDetail,
} from '../../types/shared'
import {
  SYSTEM_PERMISSIONS,
  type PermissionDefinition,
} from './permissions'
import {
  getEffectivePermissions,
  type EffectivePermissionsDataSource,
} from './get-effective-permissions'

interface PermissionRecord {
  id: string
  code: string
  resource: string
  action: string
  scope: string | null
  label: string
  description: string
  isSystem: boolean
}

interface RoleRecord extends AdminRole {
  rolePermissions?: Array<{
    permission: PermissionRecord
  }>
}

interface UserRecord {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  userRoles: Array<{
    role: RoleRecord
  }>
  userPermissions: Array<{
    permission: PermissionRecord
  }>
}

interface AdminPermissionDetailsDataSource {
  $transaction?<T>(operations: Promise<T>[]): Promise<T[]>
  permission: {
    findMany(args: {
      where?: { code?: { in: string[] } }
      orderBy?:
        | { code: 'asc' }
        | Array<{ resource: 'asc' } | { action: 'asc' } | { code: 'asc' }>
    }): Promise<PermissionRecord[]>
    upsert?(args: {
      where: { code: string }
      update: {
        resource?: string
        action?: string
        scope?: string | null
        label?: string
        description?: string
        isSystem?: boolean
      }
      create: {
        code: string
        resource: string
        action: string
        scope?: string | null
        label: string
        description: string
        isSystem: boolean
      }
    }): Promise<PermissionRecord>
  }
  user: {
    findUnique(args: {
      where: { id: string }
      include: {
        userRoles: { include: { role: true } }
        userPermissions: { include: { permission: true } }
      }
    }): Promise<UserRecord | null>
  }
  userPermission?: {
    deleteMany(args: { where: { userId: string } }): Promise<unknown>
    createMany(args: {
      data: Array<{
        userId: string
        permissionId: string
        grantedByUserId: string
      }>
    }): Promise<unknown>
  }
  role: {
    findUnique(args: {
      where: { id: string }
      include: { rolePermissions: { include: { permission: true } } }
    }): Promise<RoleRecord | null>
  }
  rolePermission?: {
    deleteMany(args: { where: { roleId: string } }): Promise<unknown>
    createMany(args: {
      data: Array<{
        roleId: string
        permissionId: string
      }>
    }): Promise<unknown>
  }
}

function toAdminPermission(permission: PermissionRecord): AdminPermission {
  return {
    id: permission.id,
    code: permission.code,
    resource: permission.resource,
    action: permission.action,
    scope: permission.scope,
    label: permission.label,
    description: permission.description,
    isSystem: permission.isSystem,
  }
}

function toAdminRole(role: RoleRecord): AdminRole {
  return {
    id: role.id,
    name: role.name,
    label: role.label,
    isSystem: role.isSystem,
  }
}

function comparePermissions(left: { code: string }, right: { code: string }): number {
  return left.code.localeCompare(right.code)
}

function compareRoles(left: { name: string }, right: { name: string }): number {
  return left.name.localeCompare(right.name)
}

function comparePermissionDefinitions(left: PermissionDefinition, right: PermissionDefinition): number {
  if (left.resource !== right.resource) {
    return left.resource.localeCompare(right.resource)
  }

  if (left.action !== right.action) {
    return left.action.localeCompare(right.action)
  }

  return left.code.localeCompare(right.code)
}

async function ensurePersistedSystemPermissions(
  dataSource: AdminPermissionDetailsDataSource,
  permissionCodes: readonly string[],
) {
  if (!dataSource.permission.upsert) {
    return
  }

  const definitions = SYSTEM_PERMISSIONS.filter((permission) => permissionCodes.includes(permission.code))

  await Promise.all(
    definitions.map((definition) =>
      dataSource.permission.upsert!({
        where: { code: definition.code },
        update: {
          resource: definition.resource,
          action: definition.action,
          scope: definition.scope ?? null,
          label: definition.label,
          description: definition.description,
          isSystem: definition.isSystem,
        },
        create: {
          code: definition.code,
          resource: definition.resource,
          action: definition.action,
          scope: definition.scope ?? null,
          label: definition.label,
          description: definition.description,
          isSystem: definition.isSystem,
        },
      }),
    ),
  )
}

export async function getPermissionCatalog(
  dataSource: AdminPermissionDetailsDataSource,
): Promise<AdminPermission[]> {
  const persistedPermissions = await dataSource.permission.findMany({
    where: {
      code: {
        in: SYSTEM_PERMISSIONS.map((permission) => permission.code),
      },
    },
  })

  const persistedPermissionsByCode = new Map(
    persistedPermissions.map((permission) => [permission.code, permission]),
  )

  return SYSTEM_PERMISSIONS
    .slice()
    .sort(comparePermissionDefinitions)
    .map((permission) => {
      const persistedPermission = persistedPermissionsByCode.get(permission.code)

      return {
        id: persistedPermission?.id ?? permission.code,
        code: permission.code,
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope ?? null,
        label: permission.label,
        description: permission.description,
        isSystem: permission.isSystem,
      }
    })
}

export async function getUserPermissionDetail(
  dataSource: AdminPermissionDetailsDataSource,
  userId: string,
): Promise<AdminUserPermissionDetail | null> {
  const user = await dataSource.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: { include: { role: true } },
      userPermissions: { include: { permission: true } },
    },
  })

  if (!user) {
    return null
  }

  const effective = await getEffectivePermissions(
    dataSource as unknown as EffectivePermissionsDataSource,
    user.id,
  )
  const effectivePermissions = effective.permissions.length
    ? await dataSource.permission.findMany({
        where: { code: { in: effective.permissions } },
        orderBy: { code: 'asc' },
      })
    : []

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    },
    roles: user.userRoles
      .map(({ role }) => toAdminRole(role))
      .sort(compareRoles),
    directPermissions: user.userPermissions
      .map(({ permission }) => toAdminPermission(permission))
      .sort(comparePermissions),
    effectivePermissions: effectivePermissions
      .map(toAdminPermission)
      .sort(comparePermissions),
  }
}

export async function getRolePermissionDetail(
  dataSource: AdminPermissionDetailsDataSource,
  roleId: string,
): Promise<AdminRolePermissionDetail | null> {
  const role = await dataSource.role.findUnique({
    where: { id: roleId },
    include: {
      rolePermissions: { include: { permission: true } },
    },
  })

  if (!role) {
    return null
  }

  return {
    role: toAdminRole(role),
    permissions: (role.rolePermissions ?? [])
      .map(({ permission }) => toAdminPermission(permission))
      .sort(comparePermissions),
  }
}

export async function replaceUserDirectPermissions(
  dataSource: AdminPermissionDetailsDataSource,
  userId: string,
  permissionCodes: string[],
  grantedByUserId: string,
  callerPermissionCodes: readonly string[],
): Promise<{ error: string; message: string; statusCode: number } | null> {
  const uniquePermissionCodes = Array.from(new Set(permissionCodes)).sort()
  const permissions = uniquePermissionCodes.length
    ? await dataSource.permission.findMany({
        where: { code: { in: uniquePermissionCodes } },
        orderBy: { code: 'asc' },
      })
    : []

  const knownSystemPermissionCodes = SYSTEM_PERMISSIONS
    .filter((permission) => uniquePermissionCodes.includes(permission.code))
    .map((permission) => permission.code)

  const knownPermissionCodes = new Set([
    ...permissions.map((permission) => permission.code),
    ...knownSystemPermissionCodes,
  ])

  if (uniquePermissionCodes.some((permissionCode) => !knownPermissionCodes.has(permissionCode))) {
    return {
      error: 'ValidationError',
      message: 'Uno o piu permessi non sono validi',
      statusCode: 400,
    }
  }

  if (uniquePermissionCodes.some((permissionCode) => !callerPermissionCodes.includes(permissionCode))) {
    return {
      error: 'Forbidden',
      message: 'Permessi insufficienti per questa operazione',
      statusCode: 403,
    }
  }

  await ensurePersistedSystemPermissions(dataSource, uniquePermissionCodes)

  const persistedPermissions = uniquePermissionCodes.length
    ? await dataSource.permission.findMany({
        where: { code: { in: uniquePermissionCodes } },
        orderBy: { code: 'asc' },
      })
    : []

  if (!dataSource.$transaction || !dataSource.userPermission) {
    throw new Error('Admin permission write data source non supportato')
  }

  const operations: Promise<unknown>[] = [
    dataSource.userPermission.deleteMany({ where: { userId } }),
  ]

  if (persistedPermissions.length > 0) {
    operations.push(
      dataSource.userPermission.createMany({
        data: persistedPermissions.map((permission) => ({
          userId,
          permissionId: permission.id,
          grantedByUserId,
        })),
      }),
    )
  }

  await dataSource.$transaction(operations)

  return null
}

export async function replaceRolePermissions(
  dataSource: AdminPermissionDetailsDataSource,
  roleId: string,
  permissionCodes: string[],
  callerPermissionCodes: readonly string[],
): Promise<{ error: string; message: string; statusCode: number } | null> {
  const uniquePermissionCodes = Array.from(new Set(permissionCodes)).sort()
  const permissions = uniquePermissionCodes.length
    ? await dataSource.permission.findMany({
        where: { code: { in: uniquePermissionCodes } },
        orderBy: { code: 'asc' },
      })
    : []

  const knownSystemPermissionCodes = SYSTEM_PERMISSIONS
    .filter((permission) => uniquePermissionCodes.includes(permission.code))
    .map((permission) => permission.code)

  const knownPermissionCodes = new Set([
    ...permissions.map((permission) => permission.code),
    ...knownSystemPermissionCodes,
  ])

  if (uniquePermissionCodes.some((permissionCode) => !knownPermissionCodes.has(permissionCode))) {
    return {
      error: 'ValidationError',
      message: 'Uno o piu permessi non sono validi',
      statusCode: 400,
    }
  }

  if (uniquePermissionCodes.some((permissionCode) => !callerPermissionCodes.includes(permissionCode))) {
    return {
      error: 'Forbidden',
      message: 'Permessi insufficienti per questa operazione',
      statusCode: 403,
    }
  }

  await ensurePersistedSystemPermissions(dataSource, uniquePermissionCodes)

  const persistedPermissions = uniquePermissionCodes.length
    ? await dataSource.permission.findMany({
        where: { code: { in: uniquePermissionCodes } },
        orderBy: { code: 'asc' },
      })
    : []

  if (!dataSource.$transaction || !dataSource.rolePermission) {
    throw new Error('Admin permission write data source non supportato')
  }

  const operations: Promise<unknown>[] = [
    dataSource.rolePermission.deleteMany({ where: { roleId } }),
  ]

  if (persistedPermissions.length > 0) {
    operations.push(
      dataSource.rolePermission.createMany({
        data: persistedPermissions.map((permission) => ({
          roleId,
          permissionId: permission.id,
        })),
      }),
    )
  }

  await dataSource.$transaction(operations)

  return null
}

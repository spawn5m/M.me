// Task 1 intentionally targets the post-migration authorization data shape.
// The current generated Prisma client does not expose `Permission.code` or
// `userPermissions` yet; Task 2 wires this contract to the real schema.
interface AuthorizationRolePermissionRecord {
  permission: {
    code: string
  }
}

interface AuthorizationUserRoleRecord {
  role: {
    name: string
    rolePermissions: AuthorizationRolePermissionRecord[]
  }
}

interface AuthorizationUserPermissionRecord {
  permission: {
    code: string
  }
}

interface AuthorizationUserRecord {
  userRoles: AuthorizationUserRoleRecord[]
  userPermissions: AuthorizationUserPermissionRecord[]
}

export const EFFECTIVE_PERMISSIONS_USER_SELECT = {
  userRoles: {
    select: {
      role: {
        select: {
          name: true,
          rolePermissions: {
            select: {
              permission: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
    },
  },
  userPermissions: {
    select: {
      permission: {
        select: {
          code: true,
        },
      },
    },
  },
} as const

export interface EffectivePermissionsDataSource {
  user: {
    findUnique(args: {
      where: { id: string }
      select: typeof EFFECTIVE_PERMISSIONS_USER_SELECT
    }): Promise<AuthorizationUserRecord | null>
  }
}

export async function getEffectivePermissions(dataSource: EffectivePermissionsDataSource, userId: string) {
  const user = await dataSource.user.findUnique({
    where: { id: userId },
    select: EFFECTIVE_PERMISSIONS_USER_SELECT,
  })

  if (!user) {
    return { roles: [], permissions: [] }
  }

  const roles = user.userRoles.map((entry) => entry.role.name).sort()
  const permissions = Array.from(
    new Set([
      ...user.userRoles.flatMap((entry) => entry.role.rolePermissions.map((permission) => permission.permission.code)),
      ...user.userPermissions.map((entry) => entry.permission.code),
    ]),
  ).sort()

  return { roles, permissions }
}

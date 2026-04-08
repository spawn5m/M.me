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

export interface AuthorizationPrismaClient {
  user: {
    findUnique(args: {
      where: { id: string }
      select: {
        userRoles: {
          select: {
            role: {
              select: {
                name: true
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        code: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userPermissions: {
          select: {
            permission: {
              select: {
                code: true
              }
            }
          }
        }
      }
    }): Promise<AuthorizationUserRecord | null>
  }
}

export async function getEffectivePermissions(prisma: AuthorizationPrismaClient, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
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
    },
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

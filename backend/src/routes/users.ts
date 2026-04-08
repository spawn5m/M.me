import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { Prisma, User, UserRole, Role } from '@prisma/client'

import { hasAnyPermission, hasPermission } from '../lib/authorization/checks'

const PRICE_LIST_SUMMARY_SELECT = {
  id: true,
  name: true,
  type: true,
  articleType: true,
} as const

const USER_INCLUDE = {
  userRoles: { include: { role: true } },
  managers: true,
  funeralPriceList: { select: PRICE_LIST_SUMMARY_SELECT },
  marmistaPriceList: { select: PRICE_LIST_SUMMARY_SELECT },
} as const

// ─── Tipi interni ─────────────────────────────────────────────────────────────

type UserWithRoles = User & {
  userRoles: (UserRole & { role: Role })[]
  managers?: { managerId: string }[]
  funeralPriceList?: { id: string; name: string; type: 'purchase' | 'sale'; articleType: 'funeral' | 'marmista' } | null
  marmistaPriceList?: { id: string; name: string; type: 'purchase' | 'sale'; articleType: 'funeral' | 'marmista' } | null
}

type UserRecord = UserWithRoles & {
  managers: { managerId: string }[]
}

function userToResponse(user: UserWithRoles) {
  const { password: _pw, userRoles, managers, funeralPriceList, marmistaPriceList, ...rest } = user
  return {
    ...rest,
    roles: userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name, label: ur.role.label })),
    manager: managers?.[0]?.managerId ?? null,
    funeralPriceList: funeralPriceList ?? null,
    marmistaPriceList: marmistaPriceList ?? null,
  }
}

function isSuperAdminUser(user: UserWithRoles) {
  return user.userRoles.some((userRole) => userRole.role.name === 'super_admin')
}

function isManagedBy(user: UserRecord, managerId: string) {
  return user.managers.some((manager) => manager.managerId === managerId)
}

function canReadAllUsers(permissions: readonly string[]) {
  return hasPermission(permissions, 'users.read.all')
}

function canUpdateAllUsers(permissions: readonly string[]) {
  return hasPermission(permissions, 'users.update.all')
}

function canReadSuperAdmins(permissions: readonly string[]) {
  return hasPermission(permissions, 'users.super_admin.read')
}

function canManageSuperAdmins(permissions: readonly string[]) {
  return hasPermission(permissions, 'users.super_admin.manage')
}

function canAssignManagers(permissions: readonly string[]) {
  return hasPermission(permissions, 'users.assign_manager')
}

function getAssignedManagerId(user: UserRecord) {
  return user.managers[0]?.managerId ?? null
}

function ensureCanAccessUser(
  reply: { status: (code: number) => { send: (payload: unknown) => unknown } },
  user: UserRecord,
  auth: { userId: string; permissions: string[] },
  options: { allowAllPermission: boolean; allowSuperAdminPermission: boolean }
) {
  if (!options.allowAllPermission && !isManagedBy(user, auth.userId)) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Permessi insufficienti per questa operazione',
      statusCode: 403
    })
  }

  if (isSuperAdminUser(user) && !options.allowSuperAdminPermission) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Permessi insufficienti per questa operazione',
      statusCode: 403
    })
  }

  return null
}

async function validateRoleIds(fastify: Parameters<FastifyPluginAsync>[0], roleIds: string[]) {
  if (roleIds.length === 0) {
    return null
  }

  const count = await fastify.prisma.role.count({
    where: { id: { in: roleIds } }
  })

  if (count !== roleIds.length) {
    return {
      error: 'ValidationError',
      message: 'Uno o piu ruoli selezionati non sono validi',
      statusCode: 400,
    }
  }

  return null
}

async function validateManagerId(fastify: Parameters<FastifyPluginAsync>[0], managerId: string | undefined) {
  if (!managerId) {
    return null
  }

  const manager = await fastify.prisma.user.findUnique({
    where: { id: managerId },
    select: { id: true },
  })

  if (!manager) {
    return {
      error: 'ValidationError',
      message: 'Manager non valido',
      statusCode: 400,
    }
  }

  return null
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'La password deve avere almeno 8 caratteri'),
  firstName: z.string().min(1, 'Nome obbligatorio'),
  lastName: z.string().min(1, 'Cognome obbligatorio'),
  roleIds: z.array(z.string()).default([]),
  managerId: z.string().optional()
})

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
  managerId: z.string().nullable().optional()
})

// ─── Route ────────────────────────────────────────────────────────────────────

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  // GET /api/users
  fastify.get('/', {
    preHandler: [fastify.checkAnyPermission(['users.read.team', 'users.read.all'])]
  }, async (req, reply) => {
    const requestingUserId = req.auth.userId
    const permissions = req.auth.permissions

    const query = req.query as {
      page?: string
      pageSize?: string
      role?: string
      isActive?: string
      search?: string
    }

    const parsedPage = parseInt(query.page ?? '1', 10)
    const parsedPageSize = parseInt(query.pageSize ?? '20', 10)
    const page = Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage)
    const pageSize = Number.isNaN(parsedPageSize) ? 20 : Math.min(100, Math.max(1, parsedPageSize))
    const skip = (page - 1) * pageSize

    const where: Prisma.UserWhereInput = {}

    if (!canReadAllUsers(permissions)) {
      where.managers = { some: { managerId: requestingUserId } }
    }

    if (!canReadSuperAdmins(permissions)) {
      where.userRoles = { none: { role: { name: 'super_admin' } } }
    }

    if (query.role) {
      const baseFilter = where.userRoles as Prisma.UserRoleListRelationFilter | undefined
      where.userRoles = {
        ...baseFilter,
        some: { role: { name: query.role } }
      }
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true'
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    const [total, users] = await Promise.all([
      fastify.prisma.user.count({ where }),
      fastify.prisma.user.findMany({
        where,
        include: USER_INCLUDE,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      })
    ])

    return reply.send({
      data: users.map(userToResponse),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  })

  // POST /api/users
  fastify.post('/', {
    preHandler: [fastify.checkPermission('users.create')]
  }, async (req, reply) => {
    const parsed = createUserSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsed.error.errors[0].message,
        statusCode: 400
      })
    }

    const { email, password, firstName, lastName, roleIds, managerId } = parsed.data

    if (managerId && !canAssignManagers(req.auth.permissions)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Permessi insufficienti per questa operazione',
        statusCode: 403
      })
    }

    const roleIdsError = await validateRoleIds(fastify, roleIds)
    if (roleIdsError) {
      return reply.status(400).send(roleIdsError)
    }

    const managerIdError = await validateManagerId(fastify, managerId)
    if (managerIdError) {
      return reply.status(400).send(managerIdError)
    }

    if (roleIds.length > 0) {
      const assignedRoles = await fastify.prisma.role.findMany({ where: { id: { in: roleIds } } })
      const isAssigningSuperAdmin = assignedRoles.some((role) => role.name === 'super_admin')

      if (isAssigningSuperAdmin && !canManageSuperAdmins(req.auth.permissions)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Permessi insufficienti per questa operazione',
          statusCode: 403
        })
      }
    }

    const existing = await fastify.prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Email già in uso',
        statusCode: 409
      })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await fastify.prisma.user.create({
      data: {
        email,
        password: hashed,
        firstName,
        lastName,
        ...(managerId ? { managers: { create: { managerId } } } : {}),
        userRoles:
          roleIds.length > 0
            ? { create: roleIds.map((roleId) => ({ roleId })) }
            : undefined
      },
      include: USER_INCLUDE
    })

    return reply.status(201).send(userToResponse(user))
  })

  // GET /api/users/me/subordinates — PRIMA di /:id per evitare conflitti
  fastify.get('/me/subordinates', {
    preHandler: [fastify.checkAnyPermission(['users.read.team', 'users.read.all'])]
  }, async (req, reply) => {
    const userId = req.auth.userId
    const where: Prisma.UserWhereInput = { managers: { some: { managerId: userId } } }

    if (!canReadSuperAdmins(req.auth.permissions)) {
      where.userRoles = { none: { role: { name: 'super_admin' } } }
    }

    const subordinates = await fastify.prisma.user.findMany({
      where,
      include: USER_INCLUDE
    })

    return reply.send(subordinates.map(userToResponse))
  })

  // GET /api/users/:id
  fastify.get('/:id', {
    preHandler: [fastify.checkAnyPermission(['users.read.team', 'users.read.all'])]
  }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const user = await fastify.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE
    })

    if (!user) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Utente non trovato',
        statusCode: 404
      })
    }

    const accessError = ensureCanAccessUser(reply, user as UserRecord, req.auth, {
      allowAllPermission: canReadAllUsers(req.auth.permissions),
      allowSuperAdminPermission: canReadSuperAdmins(req.auth.permissions),
    })
    if (accessError) {
      return accessError
    }

    return reply.send(userToResponse(user))
  })

  // PUT /api/users/:id
  fastify.put('/:id', {
    preHandler: [fastify.checkAnyPermission(['users.update.team', 'users.update.all'])]
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = updateUserSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsed.error.errors[0].message,
        statusCode: 400
      })
    }

    const existing = await fastify.prisma.user.findUnique({ where: { id }, include: USER_INCLUDE })
    if (!existing) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Utente non trovato',
        statusCode: 404
      })
    }

    const accessError = ensureCanAccessUser(reply, existing as UserRecord, req.auth, {
      allowAllPermission: canUpdateAllUsers(req.auth.permissions),
      allowSuperAdminPermission: canManageSuperAdmins(req.auth.permissions),
    })
    if (accessError) {
      return accessError
    }

    const { roleIds, managerId, ...fields } = parsed.data
    const updateData: Prisma.UserUpdateInput = { ...fields }
    const currentManagerId = getAssignedManagerId(existing as UserRecord)

    const roleIdsError = roleIds !== undefined ? await validateRoleIds(fastify, roleIds) : null
    if (roleIdsError) {
      return reply.status(400).send(roleIdsError)
    }

    const managerIdError = managerId !== undefined && managerId !== null
      ? await validateManagerId(fastify, managerId)
      : null
    if (managerIdError) {
      return reply.status(400).send(managerIdError)
    }

    if (managerId !== undefined && managerId !== currentManagerId && !canAssignManagers(req.auth.permissions)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Permessi insufficienti per questa operazione',
        statusCode: 403
      })
    }

    if (managerId !== undefined) {
      if (managerId === null) {
        updateData.managers = { deleteMany: {} }
      } else {
        updateData.managers = { deleteMany: {}, create: { managerId } }
      }
    }

    if (roleIds !== undefined) {
      const assignedRoles = await fastify.prisma.role.findMany({ where: { id: { in: roleIds } } })
      const isAssigningSuperAdmin = assignedRoles.some((role) => role.name === 'super_admin')

      if (isAssigningSuperAdmin && !canManageSuperAdmins(req.auth.permissions)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Permessi insufficienti per questa operazione',
          statusCode: 403
        })
      }

      updateData.userRoles = {
        deleteMany: {},
        create: roleIds.map((roleId) => ({ roleId }))
      }
    }

    const updated = await fastify.prisma.user.update({
      where: { id },
      data: updateData,
      include: USER_INCLUDE
    })

    return reply.send(userToResponse(updated))
  })

  // DELETE /api/users/:id — soft delete
  fastify.delete('/:id', {
    preHandler: [fastify.checkPermission('users.disable')]
  }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const existing = await fastify.prisma.user.findUnique({ where: { id }, include: USER_INCLUDE })
    if (!existing) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Utente non trovato',
        statusCode: 404
      })
    }

    if (isSuperAdminUser(existing) && !canManageSuperAdmins(req.auth.permissions)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Permessi insufficienti per questa operazione',
        statusCode: 403
      })
    }

    await fastify.prisma.user.update({
      where: { id },
      data: { isActive: false }
    })

    return reply.status(204).send()
  })
}

export default usersRoutes

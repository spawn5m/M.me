import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { Prisma, User, UserRole, Role } from '@prisma/client'

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
  fastify.addHook('preHandler', fastify.checkRole(['manager', 'super_admin', 'collaboratore']))

  // GET /api/users
  fastify.get('/', async (req, reply) => {
    const requestingRoles: string[] = req.session.get('roles') ?? []
    const requestingUserId: string = req.session.get('userId')!

    const query = req.query as {
      page?: string
      pageSize?: string
      role?: string
      isActive?: string
      search?: string
    }

    const page = Math.max(1, parseInt(query.page ?? '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? '20', 10)))
    const skip = (page - 1) * pageSize

    const where: Prisma.UserWhereInput = {}

    // Scope per ruolo
    if (
      requestingRoles.includes('collaboratore') &&
      !requestingRoles.includes('manager') &&
      !requestingRoles.includes('super_admin')
    ) {
      where.managers = { some: { managerId: requestingUserId } }
    } else if (requestingRoles.includes('manager') && !requestingRoles.includes('super_admin')) {
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
  fastify.post('/', async (req, reply) => {
    const parsed = createUserSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsed.error.errors[0].message,
        statusCode: 400
      })
    }

    const { email, password, firstName, lastName, roleIds, managerId } = parsed.data

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
  fastify.get('/me/subordinates', async (req, reply) => {
    const userId: string = req.session.get('userId')!

    const subordinates = await fastify.prisma.user.findMany({
      where: { managers: { some: { managerId: userId } } },
      include: USER_INCLUDE
    })

    return reply.send(subordinates.map(userToResponse))
  })

  // GET /api/users/:id
  fastify.get('/:id', async (req, reply) => {
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

    return reply.send(userToResponse(user))
  })

  // PUT /api/users/:id
  fastify.put('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = updateUserSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsed.error.errors[0].message,
        statusCode: 400
      })
    }

    const existing = await fastify.prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Utente non trovato',
        statusCode: 404
      })
    }

    const { roleIds, managerId, ...fields } = parsed.data
    const updateData: Prisma.UserUpdateInput = { ...fields }

    if (managerId !== undefined) {
      if (managerId === null) {
        updateData.managers = { deleteMany: {} }
      } else {
        updateData.managers = { deleteMany: {}, create: { managerId } }
      }
    }

    if (roleIds !== undefined) {
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
  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    const existing = await fastify.prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Utente non trovato',
        statusCode: 404
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

import { Prisma } from '@prisma/client'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import {
  getRolePermissionDetail,
  replaceRolePermissions,
} from '../lib/authorization/admin-permission-details'

const ROLE_LIST_READ_PERMISSION_CODES = [
  'roles.read',
  'users.create',
  'users.update.team',
  'users.update.all',
] as const

const createRoleSchema = z.object({
  name: z.string().regex(/^[a-z_]+$/, 'Il nome deve contenere solo lettere minuscole e underscore'),
  label: z.string().min(1, 'Label obbligatoria'),
  permissionCodes: z.array(z.string()).default([]),
})

const replaceRolePermissionsSchema = z.object({
  permissionCodes: z.array(z.string()).default([]),
})

const roleIdParamsSchema = z.object({
  id: z.string().cuid('Id ruolo non valido'),
})

function getValidatedRoleId(params: unknown) {
  return roleIdParamsSchema.safeParse(params)
}

const rolesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', fastify.loadAuthorizationContext)

  // GET /api/roles
  fastify.get('/', {
    preHandler: [fastify.checkAnyPermission([...ROLE_LIST_READ_PERMISSION_CODES])]
  }, async (_req, reply) => {
    const roles = await fastify.prisma.role.findMany({
      orderBy: { name: 'asc' }
    })
    return reply.send({
      data: roles,
      pagination: {
        page: 1,
        pageSize: roles.length,
        total: roles.length,
        totalPages: 1
      }
    })
  })

  // POST /api/roles
  fastify.post('/', {
    preHandler: [fastify.checkPermission('roles.manage')]
  }, async (req, reply) => {
    const parsed = createRoleSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsed.error.errors[0].message,
        statusCode: 400
      })
    }

    const { name, label, permissionCodes } = parsed.data

    let role
    try {
      role = await fastify.prisma.role.create({
        data: { name, label }
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'Nome ruolo già in uso',
          statusCode: 409
        })
      }

      throw error
    }

    try {
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
    } catch (error) {
      await fastify.prisma.role.delete({ where: { id: role.id } }).catch(() => undefined)
      throw error
    }

    return reply.status(201).send(role)
  })

  fastify.get('/:id/permissions', {
    preHandler: [fastify.checkPermission('roles.read')]
  }, async (req, reply) => {
    const parsedParams = getValidatedRoleId(req.params)
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsedParams.error.errors[0].message,
        statusCode: 400,
      })
    }

    const { id } = parsedParams.data

    const detail = await getRolePermissionDetail(fastify.prisma, id)
    if (!detail) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Ruolo non trovato',
        statusCode: 404
      })
    }

    return reply.send(detail)
  })

  fastify.put('/:id/permissions', {
    preHandler: [fastify.checkPermission('roles.manage')]
  }, async (req, reply) => {
    const parsedParams = getValidatedRoleId(req.params)
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsedParams.error.errors[0].message,
        statusCode: 400,
      })
    }

    const { id } = parsedParams.data
    const parsed = replaceRolePermissionsSchema.safeParse(req.body)

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsed.error.errors[0].message,
        statusCode: 400
      })
    }

    const role = await fastify.prisma.role.findUnique({ where: { id } })
    if (!role) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Ruolo non trovato',
        statusCode: 404
      })
    }

    const replaceError = await replaceRolePermissions(
      fastify.prisma,
      id,
      parsed.data.permissionCodes,
      req.auth.permissions,
    )
    if (replaceError) {
      return reply.status(replaceError.statusCode).send(replaceError)
    }

    return reply.send(await getRolePermissionDetail(fastify.prisma, id))
  })

  // DELETE /api/roles/:id
  fastify.delete('/:id', {
    preHandler: [fastify.checkPermission('roles.manage')]
  }, async (req, reply) => {
    const parsedParams = getValidatedRoleId(req.params)
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsedParams.error.errors[0].message,
        statusCode: 400,
      })
    }

    const { id } = parsedParams.data

    const role = await fastify.prisma.role.findUnique({ where: { id } })
    if (!role) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Ruolo non trovato',
        statusCode: 404
      })
    }

    await fastify.prisma.role.delete({ where: { id } })
    return reply.status(204).send()
  })
}

export default rolesRoutes

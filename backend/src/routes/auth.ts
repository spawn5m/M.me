import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'

import { getEffectivePermissions } from '../lib/authorization/get-effective-permissions'

const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password obbligatoria')
})

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Password attuale obbligatoria'),
  newPassword: z.string().min(8, 'Password minimo 8 caratteri'),
})

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'Nome obbligatorio').optional(),
  lastName: z.string().min(1, 'Cognome obbligatorio').optional(),
  email: z.string().email('Email non valida').optional(),
  intestazione: z.string().optional(),
  indirizzo: z.string().optional(),
  numeroCivico: z.string().optional(),
  cap: z.string().optional(),
  comune: z.string().optional(),
  provincia: z.string().max(2, 'Provincia max 2 caratteri').optional(),
  codicePP: z.string().optional(),
})

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/login
  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: 15 * 60 * 1000
      }
    }
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsed.error.errors[0].message,
        statusCode: 400
      })
    }

    const { email, password } = parsed.data

    const user = await fastify.prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.isActive) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Credenziali non valide',
        statusCode: 401
      })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Credenziali non valide',
        statusCode: 401
      })
    }

    const { permissions } = await getEffectivePermissions(fastify.prisma, user.id)
    request.session.set('userId', user.id)

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive
      },
      permissions
    })
  })

  // PUT /api/auth/password — self-service cambio password
  fastify.put('/password', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsed.error.errors[0].message,
        statusCode: 400,
      })
    }

    const userId = request.session.get('userId')!
    const user = await fastify.prisma.user.findUnique({
      where: { id: userId }
    })
    if (!user) {
      return reply.status(404).send({ error: 'NotFound', message: 'Utente non trovato', statusCode: 404 })
    }

    const match = await bcrypt.compare(parsed.data.oldPassword, user.password)
    if (!match) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Password attuale errata',
        statusCode: 401,
      })
    }

    const hashed = await bcrypt.hash(parsed.data.newPassword, 12)
    await fastify.prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

    return reply.status(204).send()
  })

  // GET /api/auth/profile
  fastify.get('/profile', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const userId = request.session.get('userId')!
    const user = await fastify.prisma.user.findUnique({
      where: { id: userId }
    })
    if (!user) {
      return reply.status(404).send({ error: 'NotFound', message: 'Utente non trovato', statusCode: 404 })
    }
    const { password: _pw, ...rest } = user
    return reply.send(rest)
  })

  // PUT /api/auth/profile
  fastify.put('/profile', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const userId = request.session.get('userId')!
    const parsed = updateProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: parsed.error.errors[0].message,
        statusCode: 400,
      })
    }

    if (parsed.data.email) {
      const existing = await fastify.prisma.user.findUnique({ where: { email: parsed.data.email } })
      if (existing && existing.id !== userId) {
        return reply.status(409).send({ error: 'Conflict', message: 'Email già in uso', statusCode: 409 })
      }
    }

    const updated = await fastify.prisma.user.update({
      where: { id: userId },
      data: parsed.data,
    })
    const { password: _pw, ...rest } = updated
    return reply.send(rest)
  })

  // POST /api/auth/logout
  fastify.post('/logout', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    request.session.delete()
    return reply.send({ success: true })
  })

  // GET /api/auth/me
  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const userId = request.session.get('userId')!

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      include: {
        funeralPriceList: { select: { id: true, name: true } },
        marmistaPriceList: { select: { id: true, name: true } },
      }
    })

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Utente non trovato',
        statusCode: 401
      })
    }

    const { permissions } = await getEffectivePermissions(fastify.prisma, user.id)

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        funeralPriceList: user.funeralPriceList ?? null,
        marmistaPriceList: user.marmistaPriceList ?? null,
      },
      permissions
    })
  })
}

export default authRoutes

import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password obbligatoria')
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
      where: { email },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
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

    const roles = user.userRoles.map((ur) => ur.role.name)
    request.session.set('userId', user.id)
    request.session.set('roles', roles)

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        isActive: user.isActive
      }
    })
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
    const roles = request.session.get('roles') ?? []

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

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        isActive: user.isActive,
        funeralPriceList: user.funeralPriceList ?? null,
        marmistaPriceList: user.marmistaPriceList ?? null,
      }
    })
  })
}

export default authRoutes

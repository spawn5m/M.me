import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyError } from 'fastify'

const errorHandlerPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? 500
    fastify.log.error(error)
    reply.status(statusCode).send({
      error: error.name ?? 'InternalServerError',
      message: error.message ?? 'Errore interno del server',
      statusCode
    })
  })
})

export default errorHandlerPlugin

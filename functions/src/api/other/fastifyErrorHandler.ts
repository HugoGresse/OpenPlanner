import { FastifyReply, FastifyRequest } from 'fastify'
import { HttpError } from './Errors'

export const fastifyErrorHandler = (error: Error | HttpError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof HttpError) {
        reply.status(error.statusCode).send({ error: error.message })
    } else {
        throw error
    }
}

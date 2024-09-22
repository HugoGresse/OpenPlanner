import { FastifyReply, FastifyRequest } from 'fastify'
import { HttpError } from './Errors'

export const fastifyErrorHandler = (
    error:
        | (Error & {
              code: string
              statusCode: number
              validation: any[]
          })
        | HttpError,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    console.error(request.originalUrl, error)
    if (error instanceof HttpError) {
        reply.header('content-type', 'application/json')
        reply.status(error.statusCode).send(JSON.stringify({ error: error.message }))
    } else {
        reply.header('content-type', 'application/json')
        if (error.code && error.statusCode) {
            reply.status(error.statusCode).send(
                JSON.stringify({
                    error: error.code,
                    reason: error.toString(),
                })
            )
        } else {
            reply.status(400).send(JSON.stringify({ error: error, reason: error.message || JSON.stringify(error) }))
        }
    }
}

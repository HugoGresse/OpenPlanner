import { FastifyReply, FastifyRequest } from 'fastify'
import { HttpError } from './Errors'

type ValidationItem = { params?: { additionalProperty?: string } }

// Names the offending key on schema errors ("Error: body must NOT have additional properties: compnay").
const describeError = (error: Error & { validation?: ValidationItem[] }): string => {
    const extra = error.validation?.[0]?.params?.additionalProperty
    return `${error.toString()}${extra ? `: ${extra}` : ''}`
}

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
        reply.status(error.statusCode).send(JSON.stringify({ error: error.message, success: false }))
    } else {
        reply.header('content-type', 'application/json')
        if (error.code && error.statusCode) {
            reply.status(error.statusCode).send(
                JSON.stringify({
                    error: error.code,
                    reason: describeError(error),
                    success: false,
                })
            )
        } else {
            reply.status(400).send(
                JSON.stringify({
                    error: error.message || error,
                    reason: error.message || JSON.stringify(error),
                    success: false,
                })
            )
        }
    }
}

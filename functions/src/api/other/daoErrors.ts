import { FastifyReply } from 'fastify'
import { NotFoundError } from './Errors'

// gRPC status codes raised by the Firestore SDK.
const GRPC_NOT_FOUND = 5
const GRPC_ALREADY_EXISTS = 6
const GRPC_FAILED_PRECONDITION = 9

const grpcCode = (error: unknown): unknown => (error as { code?: unknown } | null)?.code

export const isNotFoundError = (error: unknown): boolean =>
    grpcCode(error) === GRPC_NOT_FOUND || grpcCode(error) === GRPC_FAILED_PRECONDITION
export const isAlreadyExistsError = (error: unknown): boolean => grpcCode(error) === GRPC_ALREADY_EXISTS

type Messages = { notFound?: string; conflict?: string; failed: string }

// Maps a DAO failure to the plain-text 404 / 409 / 400 replies the api-key routes declare.
export const replyDaoError = (reply: FastifyReply, error: unknown, messages: Messages): void => {
    if (messages.notFound && error instanceof NotFoundError) {
        reply.status(404).send(messages.notFound)
        return
    }
    if (messages.conflict && isAlreadyExistsError(error)) {
        reply.status(409).send(messages.conflict)
        return
    }
    const msg = error instanceof Error ? error.message : 'Unknown error'
    reply.status(400).send(`${messages.failed}: ${msg}`)
}

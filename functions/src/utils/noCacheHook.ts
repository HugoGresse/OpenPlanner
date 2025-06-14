import { FastifyReply, FastifyRequest } from 'fastify'

export const noCacheHook = (_: any, reply: FastifyReply, _2: FastifyRequest, done: () => void) => {
    reply.header('Cache-Control', 'must-revalidate,no-cache,no-store')
    done()
}

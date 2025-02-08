import fastifyPlugin from 'fastify-plugin'
import { EventDao } from './dao/eventDao'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { FastifyAuthFunction } from '@fastify/auth'
import { Static, Type } from '@sinclair/typebox'
const verifyRequest = async (fastify: FastifyInstance, request: FastifyRequest, reply: FastifyReply) => {
    // @ts-ignore
    const eventId = request.params?.eventId
    // @ts-ignore
    const apiKey = request.query?.apiKey

    if (!eventId || eventId.length === 0) {
        reply.code(400).send({ error: "Bad Request! Missing eventId, hophop let's get to work !", success: false })
        return
    }

    if (!apiKey || apiKey.length === 0) {
        reply.code(401).send({ error: 'Unauthorized! Du balai !', success: false })
        return
    }

    const event = await EventDao.getEvent(fastify.firebase, eventId)

    if (event.apiKey !== apiKey) {
        reply.code(401).send({ error: 'Unauthorized! Du balai !', success: false })
        return
    }
}

export const Error400_401_VerifyRequest = Type.Object({
    success: Type.Boolean(),
    error: Type.String(),
})
export type Error400_401_VerifyRequestType = Static<typeof Error400_401_VerifyRequest>

export const apiKeyPlugin = fastifyPlugin(
    (fastify: FastifyInstance, options: any, next: () => void) => {
        fastify.decorate<FastifyAuthFunction>('verifyApiKey', async (request: FastifyRequest, reply: FastifyReply) => {
            await verifyRequest(fastify, request, reply)
        })
        next()
    },
    {
        fastify: '>=3.x',
        name: 'verifyApiKey', // this is used by fastify-plugin to derive the property name
    }
)

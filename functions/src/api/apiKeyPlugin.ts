import fastifyPlugin from 'fastify-plugin'
import { EventDao } from './dao/eventDao'
import { FastifyInstance } from 'fastify'

export const apiKeyPlugin = fastifyPlugin(
    async (fastify: FastifyInstance, options: any) => {
        fastify.addHook('preHandler', async (request, reply) => {
            // @ts-ignore
            const eventId = request.params?.eventId
            // @ts-ignore
            const apiKey = request.query?.apiKey

            if (!eventId || eventId.length === 0) {
                reply.code(400).send({ error: "Bad Request! Missing eventId, hophop let's get to work !" })
                return
            }

            if (!apiKey || apiKey.length === 0) {
                reply.code(401).send({ error: 'Unauthorized! Du balai !' })
                return
            }

            const event = await EventDao.getEvent(fastify.firebase, eventId)

            if (event.apiKey !== apiKey) {
                reply.code(401).send({ error: 'Unauthorized! Du balai !' })
                return
            }
        })
    },
    {
        fastify: '>=3.x',
        name: 'verify-api-key', // this is used by fastify-plugin to derive the property name
    }
)

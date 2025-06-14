import { defineString } from 'firebase-functions/params'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { FastifyAuthFunction } from '@fastify/auth'
import fastifyPlugin from 'fastify-plugin'

export const getServiceAPIKey = () => {
    const apiKeyParam = defineString('SERVICE_API_KEY', {
        description: 'A unique key to access the service API',
    })
    return apiKeyParam.value()
}

export const serviceApiKeyPlugin = fastifyPlugin(
    (fastify: FastifyInstance, options: any, next: () => void) => {
        fastify.decorate<FastifyAuthFunction>(
            'verifyServiceApiKey',
            async (request: FastifyRequest, reply: FastifyReply) => {
                const apiKey = getServiceAPIKey()
                if (!apiKey) {
                    reply.status(401).send('Unauthorized: No API key provided in the environment')
                    return
                }
                if ((request.query as { apiKey?: string }).apiKey !== apiKey) {
                    reply.status(401).send('Unauthorized: Invalid API key')
                    return
                }
            }
        )
        next()
    },
    {
        fastify: '>=3.x',
        name: 'verifyServiceApiKey', // this is used by fastify-plugin to derive the property name
    }
)

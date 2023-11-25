import FastifySwaggerUi from '@fastify/swagger-ui'
import { FastifyInstance } from 'fastify'
import FastifySwagger from '@fastify/swagger'

export const registerSwagger = (fastify: FastifyInstance) => {
    fastify.register(FastifySwagger, {
        swagger: {
            info: {
                title: 'OpenPlanner API',
                version: '1.0.0',
            },
            host: 'https://api.openplanner.fr/',
            schemes: ['https'],
            consumes: ['application/json'],
            produces: ['application/json'],
            securityDefinitions: {
                apiKey: {
                    type: 'apiKey',
                    name: 'apiKey',
                    in: 'query',
                },
            },
        },
    })
    fastify.register(FastifySwaggerUi, {
        routePrefix: '/',
        uiConfig: {
            docExpansion: 'full',
            deepLinking: false,
        },
    })
}

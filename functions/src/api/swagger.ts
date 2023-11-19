import FastifySwaggerUi from '@fastify/swagger-ui'
import { FastifyInstance } from 'fastify'

export const registerSwagger = (fastify: FastifyInstance) => {
    fastify.register(require('@fastify/swagger'), {
        swagger: {
            info: {
                title: 'OpenPlanner API',
            },
            host: 'https://api.openplanner.fr/',
            schemes: ['https'],
            consumes: ['application/json'],
            produces: ['application/json'],
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

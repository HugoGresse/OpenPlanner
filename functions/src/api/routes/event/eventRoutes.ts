import { FastifyInstance } from 'fastify'
import { exportSchedulePdfRoute } from './exportSchedulePdf'
import { getEventRoute } from './getEvent'

export const eventRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    getEventRoute(fastify, options, () => {})
    exportSchedulePdfRoute(fastify, options, () => {})
    done()
}

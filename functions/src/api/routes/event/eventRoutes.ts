import { FastifyInstance } from 'fastify'
import { exportSchedulePdfRoute } from './exportSchedulePdf'
import { getEventRoute } from './getEvent'
import { getPdfMetadataRoute } from './getPdfMetadata'

export const eventRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    getEventRoute(fastify, options, () => {})
    exportSchedulePdfRoute(fastify, options, () => {})
    getPdfMetadataRoute(fastify, options, () => {})
    done()
}

import { FastifyInstance } from 'fastify'
import { bupherLoginRoute } from './bupherLoginRoute'
import { bupherChannelsRoute } from './bupherChannelsRoute'
// import { bupherScheduledPostsRoute } from './bupherScheduledPostsRoute'

export const bupherRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    // Register all Bupher routes
    bupherLoginRoute(fastify, options, () => {})
    bupherChannelsRoute(fastify, options, () => {})
    // bupherScheduledPostsRoute(fastify, options, () => {})

    done()
}

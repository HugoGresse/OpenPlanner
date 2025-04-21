import { FastifyInstance } from 'fastify'
import { addSponsorRouteHandler, addSponsorPOSTSchema, AddSponsorPOSTTypes } from './addSponsorsPOST'
import { addJobPostRouteHandler, addJobPostPOSTSchema, AddJobPostPOSTTypes } from './addJobPostPOST'
import { getJobPostsRouteHandler, getJobPostsGETSchema, GetJobPostsGETTypes } from './getJobPostsGET'
import { getJobPostRouteHandler, getJobPostGETSchema, GetJobPostGETTypes } from './getJobPostGET'
import { deleteJobPostRouteHandler, deleteJobPostDELETESchema, DeleteJobPostDELETETypes } from './deleteJobPostDELETE'
import { approveJobPostRouteHandler, approveJobPostPUTSchema, ApproveJobPostPUTTypes } from './approveJobPostPUT'
import {
    trackJobPostClickRouteHandler,
    TrackJobPostClickPOSTTypes,
    trackJobPostClickPOSTSchema,
} from './trackJobPostClickPOST'

export { SponsorType } from './addSponsorsPOST'
export { JobPostType } from './addJobPostPOST'

export const sponsorsRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<AddSponsorPOSTTypes>(
        '/v1/:eventId/sponsors',
        {
            schema: addSponsorPOSTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        addSponsorRouteHandler(fastify)
    )

    fastify.post<AddJobPostPOSTTypes>(
        '/v1/:eventId/sponsors/jobPosts',
        {
            schema: addJobPostPOSTSchema,
            // No preHandler needed - authentication via event.addJobPostPrivateId
        },
        addJobPostRouteHandler(fastify)
    )

    fastify.get<GetJobPostsGETTypes>(
        '/v1/:eventId/sponsors/jobPosts',
        {
            schema: getJobPostsGETSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        getJobPostsRouteHandler(fastify)
    )

    fastify.get<GetJobPostGETTypes>(
        '/v1/:eventId/sponsors/jobPosts/:jobPostId',
        {
            schema: getJobPostGETSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        getJobPostRouteHandler(fastify)
    )

    fastify.delete<DeleteJobPostDELETETypes>(
        '/v1/:eventId/sponsors/jobPosts/:jobPostId',
        {
            schema: deleteJobPostDELETESchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        deleteJobPostRouteHandler(fastify)
    )

    fastify.put<ApproveJobPostPUTTypes>(
        '/v1/:eventId/sponsors/jobPosts/:jobPostId/approval',
        {
            schema: approveJobPostPUTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        approveJobPostRouteHandler(fastify)
    )

    fastify.post<TrackJobPostClickPOSTTypes>(
        '/v1/:eventId/sponsors/jobPosts/track-click',
        {
            schema: trackJobPostClickPOSTSchema,
            // No preHandler needed - this is a public route
        },
        trackJobPostClickRouteHandler(fastify)
    )

    done()
}

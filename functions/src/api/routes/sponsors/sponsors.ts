import { FastifyInstance } from 'fastify'
import { addSponsorRouteHandler, addSponsorPOSTSchema, AddSponsorPOSTTypes } from './addSponsorsPOST'
import {
    addJobPostRouteHandler,
    addJobPostPOSTSchema,
    AddJobPostPOSTTypes,
    addSponsorJobPostRouteHandler,
    addSponsorJobPostPOSTSchema,
    AddSponsorJobPostPOSTTypes,
} from './addJobPostPOST'
import { getJobPostsRouteHandler, getJobPostsGETSchema, GetJobPostsGETTypes } from './getJobPostsGET'
import { getJobPostRouteHandler, getJobPostGETSchema, GetJobPostGETTypes } from './getJobPostGET'
import {
    deleteJobPostRouteHandler,
    deleteJobPostDELETESchema,
    DeleteJobPostDELETETypes,
    deleteSponsorJobPostRouteHandler,
    deleteSponsorJobPostDELETESchema,
    DeleteSponsorJobPostDELETETypes,
} from './deleteJobPostDELETE'
import { approveJobPostRouteHandler, approveJobPostPUTSchema, ApproveJobPostPUTTypes } from './approveJobPostPUT'
import { updateJobPostRouteHandler, updateJobPostPUTSchema, UpdateJobPostPUTTypes } from './updateJobPostPUT'
import {
    getSponsorJobPostsRouteHandler,
    getSponsorJobPostsGETSchema,
    GetSponsorJobPostsGETTypes,
} from './getSponsorJobPostsGET'
import {
    generateSponsorTokenRouteHandler,
    generateSponsorTokenPOSTSchema,
    GenerateSponsorTokenPOSTTypes,
} from './generateSponsorTokenPOST'
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

    // Generate sponsor token (admin only)
    fastify.post<GenerateSponsorTokenPOSTTypes>(
        '/v1/:eventId/sponsors/generate-token',
        {
            schema: generateSponsorTokenPOSTSchema,
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        generateSponsorTokenRouteHandler(fastify)
    )

    // Original job post endpoint (using event private ID)
    fastify.post<AddJobPostPOSTTypes>(
        '/v1/:eventId/sponsors/jobPosts',
        {
            schema: addJobPostPOSTSchema,
            // No preHandler needed - authentication via event.addJobPostPrivateId
        },
        addJobPostRouteHandler(fastify)
    )

    // New sponsor-specific job post endpoints
    fastify.post<AddSponsorJobPostPOSTTypes>(
        '/v1/:eventId/sponsors/job-posts',
        {
            schema: addSponsorJobPostPOSTSchema,
            // No preHandler needed - authentication via sponsor token
        },
        addSponsorJobPostRouteHandler(fastify)
    )

    fastify.get<GetSponsorJobPostsGETTypes>(
        '/v1/:eventId/sponsors/job-posts',
        {
            schema: getSponsorJobPostsGETSchema,
            // No preHandler needed - authentication via sponsor token
        },
        getSponsorJobPostsRouteHandler(fastify)
    )

    fastify.put<UpdateJobPostPUTTypes>(
        '/v1/:eventId/sponsors/job-posts/:jobPostId',
        {
            schema: updateJobPostPUTSchema,
            // No preHandler needed - authentication via sponsor token
        },
        updateJobPostRouteHandler(fastify)
    )

    fastify.delete<DeleteSponsorJobPostDELETETypes>(
        '/v1/:eventId/sponsors/job-posts/:jobPostId',
        {
            schema: deleteSponsorJobPostDELETESchema,
            // No preHandler needed - authentication via sponsor token
        },
        deleteSponsorJobPostRouteHandler(fastify)
    )

    // Admin endpoints (existing)
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

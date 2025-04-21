import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Type } from '@sinclair/typebox'
import { JobPostDao, JobPostResponse } from '../../dao/jobPostDao'

export type GetJobPostsGETTypes = {
    Querystring: { sponsorId?: string; approvalStatus?: string }
    Reply: JobPostResponse[] | string
}

export const getJobPostsGETSchema = {
    tags: ['sponsors'],
    summary: 'Get job posts for an event',
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            apiKey: {
                type: 'string',
                description: 'The API key of the event',
            },
            sponsorId: {
                type: 'string',
                description: 'Optional sponsor ID to filter job posts',
            },
            approvalStatus: {
                type: 'string',
                enum: ['approved', 'pending', 'all'],
                description: 'Filter by approval status (approved, pending, or all)',
            },
        },
    },
    response: {
        200: Type.Array(
            Type.Object({
                id: Type.String(),
                sponsorId: Type.String(),
                title: Type.String(),
                description: Type.String(),
                location: Type.String(),
                externalLink: Type.String(),
                salary: Type.Optional(Type.String()),
                requirements: Type.Optional(Type.Array(Type.String())),
                contactEmail: Type.Optional(Type.String()),
                approved: Type.Boolean(),
                createdAt: Type.Any(),
            })
        ),
        400: Type.String(),
    },
    security: [
        {
            apiKey: [],
        },
    ],
}

export const getJobPostsRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Querystring: { sponsorId?: string; approvalStatus?: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId } = request.params as { eventId: string }
            const { sponsorId, approvalStatus } = request.query

            let jobPosts: JobPostResponse[]

            if (sponsorId) {
                jobPosts = await JobPostDao.getJobPostsBySponsor(fastify.firebase, eventId, sponsorId, approvalStatus)
            } else {
                jobPosts = await JobPostDao.getAllJobPosts(fastify.firebase, eventId, approvalStatus)
            }

            reply.status(200).send(jobPosts)
        } catch (error: unknown) {
            console.error('Error retrieving job posts:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to retrieve job posts: ${errorMessage}`)
        }
    }
}

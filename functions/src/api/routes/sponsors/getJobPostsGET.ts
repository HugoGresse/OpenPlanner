import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Type } from '@sinclair/typebox'
import { JobPostDao, JobPostResponse } from '../../dao/jobPostDao'
import { JobStatus, JOB_STATUS_VALUES } from '../../../../../src/constants/jobStatus'

export type GetJobPostsGETTypes = {
    Querystring: { sponsorId?: string; status?: string }
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
            status: {
                type: 'string',
                enum: [...JOB_STATUS_VALUES, 'all'],
                description: 'Filter by job post status',
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
                status: Type.Enum(JobStatus as Record<string, string>),
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
        request: FastifyRequest<{ Querystring: { sponsorId?: string; status?: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId } = request.params as { eventId: string }
            const { sponsorId, status } = request.query

            let jobPosts: JobPostResponse[]

            if (sponsorId) {
                jobPosts = await JobPostDao.getJobPostsBySponsor(fastify.firebase, eventId, sponsorId, status)
            } else {
                jobPosts = await JobPostDao.getAllJobPosts(fastify.firebase, eventId, status)
            }

            reply.status(200).send(jobPosts)
        } catch (error: unknown) {
            console.error('Error retrieving job posts:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to retrieve job posts: ${errorMessage}`)
        }
    }
}

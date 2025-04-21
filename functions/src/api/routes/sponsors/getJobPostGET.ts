import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Type } from '@sinclair/typebox'
import { JobPostDao, JobPostResponse } from '../../dao/jobPostDao'
import { JobStatus } from '../../.././../../src/constants/jobStatus'

export type GetJobPostGETTypes = {
    Params: { eventId: string; jobPostId: string }
    Reply: JobPostResponse | string
}

export const getJobPostGETSchema = {
    tags: ['sponsors'],
    summary: 'Get a specific job post',
    params: {
        type: 'object',
        properties: {
            eventId: {
                type: 'string',
                description: 'Event ID',
            },
            jobPostId: {
                type: 'string',
                description: 'Job post ID',
            },
        },
        required: ['eventId', 'jobPostId'],
    },
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            apiKey: {
                type: 'string',
                description: 'The API key of the event',
            },
        },
    },
    response: {
        200: Type.Object({
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
        }),
        400: Type.String(),
        404: Type.String(),
    },
    security: [
        {
            apiKey: [],
        },
    ],
}

export const getJobPostRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Params: { eventId: string; jobPostId: string } }>, reply: FastifyReply) => {
        try {
            const { eventId, jobPostId } = request.params

            try {
                const jobPost = await JobPostDao.getJobPost(fastify.firebase, eventId, jobPostId)
                reply.status(200).send(jobPost)
            } catch (error) {
                reply.status(404).send(`Job post not found: ${jobPostId}`)
            }
        } catch (error: unknown) {
            console.error('Error retrieving job post:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to retrieve job post: ${errorMessage}`)
        }
    }
}

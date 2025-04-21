import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { JobPostDao } from '../../dao/jobPostDao'

export const TypeBoxJobPost = Type.Object({
    sponsorId: Type.String(),
    title: Type.String(),
    description: Type.String(),
    location: Type.String(),
    externalLink: Type.String({ format: 'uri' }),
    salary: Type.Optional(Type.String()),
    requirements: Type.Optional(Type.Array(Type.String())),
    contactEmail: Type.Optional(Type.String({ format: 'email' })),
    approved: Type.Optional(Type.Boolean()),
})

export type JobPostType = Static<typeof TypeBoxJobPost>

export type AddJobPostPOSTTypes = {
    Body: JobPostType
    Reply: JobPostType | string
}

export const addJobPostPOSTSchema = {
    tags: ['sponsors'],
    summary: 'Add a job post from a sponsor',
    body: TypeBoxJobPost,
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
        201: TypeBoxJobPost,
        400: Type.String(),
    },
    security: [
        {
            apiKey: [],
        },
    ],
}

export const addJobPostRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Body: JobPostType }>, reply: FastifyReply) => {
        try {
            const { eventId } = request.params as { eventId: string }

            const jobPostId = await JobPostDao.addJobPost(fastify.firebase, eventId, request.body)

            const jobPost = await JobPostDao.getJobPost(fastify.firebase, eventId, jobPostId)

            reply.status(201).send(jobPost)
        } catch (error: unknown) {
            console.error('Error adding job post:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to add job post: ${errorMessage}`)
        }
    }
}

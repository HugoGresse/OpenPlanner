import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Type } from '@sinclair/typebox'
import { JobPostDao } from '../../dao/jobPostDao'

export type DeleteJobPostDELETETypes = {
    Params: { eventId: string; jobPostId: string }
    Reply: { success: boolean } | string
}

export const deleteJobPostDELETESchema = {
    tags: ['sponsors'],
    summary: 'Delete a job post',
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
            success: Type.Boolean(),
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

export const deleteJobPostRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Params: { eventId: string; jobPostId: string } }>, reply: FastifyReply) => {
        try {
            const { eventId, jobPostId } = request.params

            try {
                // Check if job post exists first
                await JobPostDao.getJobPost(fastify.firebase, eventId, jobPostId)

                // If exists, delete it
                const success = await JobPostDao.deleteJobPost(fastify.firebase, eventId, jobPostId)
                reply.status(200).send({ success })
            } catch (error) {
                reply.status(404).send(`Job post not found: ${jobPostId}`)
            }
        } catch (error: unknown) {
            console.error('Error deleting job post:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to delete job post: ${errorMessage}`)
        }
    }
}

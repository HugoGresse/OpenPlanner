import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Type } from '@sinclair/typebox'
import { JobPostDao } from '../../dao/jobPostDao'
import { SponsorDao } from '../../dao/sponsorDao'

export type DeleteJobPostDELETETypes = {
    Params: { eventId: string; jobPostId: string }
    Reply: { success: boolean } | string
}

export type DeleteSponsorJobPostDELETETypes = {
    Params: { eventId: string; jobPostId: string }
    Querystring: { sponsorToken: string }
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

export const deleteSponsorJobPostDELETESchema = {
    tags: ['sponsors'],
    summary: 'Delete a job post using sponsor token',
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
            sponsorToken: {
                type: 'string',
                description: 'Sponsor token for authentication',
            },
        },
        required: ['sponsorToken'],
    },
    response: {
        200: Type.Object({
            success: Type.Boolean(),
        }),
        400: Type.String(),
        401: Type.String(),
        404: Type.String(),
    },
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

export const deleteSponsorJobPostRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string; jobPostId: string }
            Querystring: { sponsorToken: string }
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId, jobPostId } = request.params
            const { sponsorToken } = request.query

            // Find the sponsor by token
            const sponsorData = await SponsorDao.findSponsorByToken(fastify.firebase, eventId, sponsorToken)

            if (!sponsorData) {
                reply.status(401).send('Invalid sponsor token')
                return
            }

            // Get the job post to verify ownership
            const existingJobPost = await JobPostDao.getJobPost(fastify.firebase, eventId, jobPostId)

            if (existingJobPost.sponsorId !== sponsorData.sponsor.id) {
                reply.status(401).send('Not authorized to delete this job post')
                return
            }

            // Delete the job post
            const success = await JobPostDao.deleteJobPost(fastify.firebase, eventId, jobPostId)
            reply.status(200).send({ success })
        } catch (error: unknown) {
            console.error('Error deleting sponsor job post:', error)
            if (error instanceof Error && error.message === 'Job post not found') {
                reply.status(404).send(`Job post not found: ${request.params.jobPostId}`)
            } else {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
                reply.status(400).send(`Failed to delete sponsor job post: ${errorMessage}`)
            }
        }
    }
}

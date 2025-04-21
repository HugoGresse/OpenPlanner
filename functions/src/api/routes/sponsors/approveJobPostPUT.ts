import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { JobPostDao } from '../../dao/jobPostDao'
import { JobStatus } from '../../../../../src/constants/jobStatus'

const TypeBoxJobPostStatus = Type.Object({
    status: Type.Enum(JobStatus as Record<string, string>),
})

export type JobPostStatusType = Static<typeof TypeBoxJobPostStatus>

export type ApproveJobPostPUTTypes = {
    Params: { eventId: string; jobPostId: string }
    Body: JobPostStatusType
    Reply: { success: boolean } | string
}

export const approveJobPostPUTSchema = {
    tags: ['sponsors'],
    summary: 'Update a job post status (approve, reject, or set as pending)',
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
    body: TypeBoxJobPostStatus,
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

export const approveJobPostRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Params: { eventId: string; jobPostId: string }; Body: JobPostStatusType }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId, jobPostId } = request.params
            const { status } = request.body

            try {
                // Check if job post exists first
                await JobPostDao.getJobPost(fastify.firebase, eventId, jobPostId)

                // Update status
                const success = await JobPostDao.setJobPostStatus(
                    fastify.firebase,
                    eventId,
                    jobPostId,
                    status as JobStatus
                )
                reply.status(200).send({ success })
            } catch (error) {
                reply.status(404).send(`Job post not found: ${jobPostId}`)
            }
        } catch (error: unknown) {
            console.error('Error updating job post status:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to update job post status: ${errorMessage}`)
        }
    }
}

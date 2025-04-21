import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { JobPostDao } from '../../dao/jobPostDao'

const TypeBoxJobPostApproval = Type.Object({
    approved: Type.Boolean(),
})

export type JobPostApprovalType = Static<typeof TypeBoxJobPostApproval>

export type ApproveJobPostPUTTypes = {
    Params: { eventId: string; jobPostId: string }
    Body: JobPostApprovalType
    Reply: { success: boolean } | string
}

export const approveJobPostPUTSchema = {
    tags: ['sponsors'],
    summary: 'Approve or reject a job post',
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
    body: TypeBoxJobPostApproval,
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
        request: FastifyRequest<{ Params: { eventId: string; jobPostId: string }; Body: JobPostApprovalType }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId, jobPostId } = request.params
            const { approved } = request.body

            try {
                // Check if job post exists first
                await JobPostDao.getJobPost(fastify.firebase, eventId, jobPostId)

                // Update approval status
                const success = await JobPostDao.setJobPostApproval(fastify.firebase, eventId, jobPostId, approved)
                reply.status(200).send({ success })
            } catch (error) {
                reply.status(404).send(`Job post not found: ${jobPostId}`)
            }
        } catch (error: unknown) {
            console.error('Error updating job post approval status:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to update job post approval status: ${errorMessage}`)
        }
    }
}

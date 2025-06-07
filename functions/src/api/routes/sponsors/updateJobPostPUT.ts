import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { JobPostDao } from '../../dao/jobPostDao'
import { SponsorDao } from '../../dao/sponsorDao'
import { JOB_CATEGORIES } from './JOB_CATEGORIES'

export const TypeBoxUpdateJobPost = Type.Object({
    title: Type.String(),
    description: Type.String(),
    location: Type.String(),
    externalLink: Type.String({ format: 'uri' }),
    category: Type.String({ enum: JOB_CATEGORIES }),
    salary: Type.Optional(Type.String()),
    requirements: Type.Optional(Type.Array(Type.String())),
    contactEmail: Type.Optional(Type.String({ format: 'email' })),
    sponsorToken: Type.String(),
})

export type UpdateJobPostType = Static<typeof TypeBoxUpdateJobPost>

export type UpdateJobPostPUTTypes = {
    Params: { eventId: string; jobPostId: string }
    Body: UpdateJobPostType
    Reply: { success: boolean } | string
}

export const updateJobPostPUTSchema = {
    tags: ['sponsors'],
    summary: 'Update a job post using sponsor token',
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
    body: TypeBoxUpdateJobPost,
    response: {
        200: Type.Object({
            success: Type.Boolean(),
        }),
        400: Type.String(),
        401: Type.String(),
        404: Type.String(),
    },
}

export const updateJobPostRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Params: { eventId: string; jobPostId: string }; Body: UpdateJobPostType }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId, jobPostId } = request.params
            const { sponsorToken } = request.body

            // Find the sponsor by token
            const sponsorData = await SponsorDao.findSponsorByToken(fastify.firebase, eventId, sponsorToken)

            if (!sponsorData) {
                reply.status(401).send('Invalid sponsor token')
                return
            }

            // Get the job post to verify ownership
            const existingJobPost = await JobPostDao.getJobPost(fastify.firebase, eventId, jobPostId)

            if (existingJobPost.sponsorId !== sponsorData.sponsor.id) {
                reply.status(401).send('Not authorized to update this job post')
                return
            }

            // Remove sponsorToken from the update data
            const { sponsorToken: _, ...updateData } = request.body

            const success = await JobPostDao.updateJobPost(fastify.firebase, eventId, jobPostId, updateData)
            reply.status(200).send({ success })
        } catch (error: unknown) {
            console.error('Error updating job post:', error)
            if (error instanceof Error && error.message === 'Job post not found') {
                reply.status(404).send(`Job post not found: ${request.params.jobPostId}`)
            } else {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
                reply.status(400).send(`Failed to update job post: ${errorMessage}`)
            }
        }
    }
}

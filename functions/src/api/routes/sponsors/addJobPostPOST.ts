import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { JobPostDao } from '../../dao/jobPostDao'
import { EventDao } from '../../dao/eventDao'
import { JOB_CATEGORIES } from './JOB_CATEGORIES'

export const TypeBoxJobPost = Type.Object({
    sponsorId: Type.String(),
    title: Type.String(),
    description: Type.String(),
    location: Type.String(),
    externalLink: Type.String({ format: 'uri' }),
    category: Type.String({ enum: JOB_CATEGORIES }),
    salary: Type.Optional(Type.String()),
    requirements: Type.Optional(Type.Array(Type.String())),
    contactEmail: Type.Optional(Type.String({ format: 'email' })),
    addJobPostPrivateId: Type.String(),
})

export type JobPostType = Static<typeof TypeBoxJobPost>

export type AddJobPostPOSTTypes = {
    Body: JobPostType
    Reply: { jobPostId: string }
}

export const addJobPostPOSTSchema = {
    tags: ['sponsors'],
    summary: 'Add a job post from a sponsor using a private id which is usually with the URL provided to the sponsor',
    body: TypeBoxJobPost,
    response: {
        201: TypeBoxJobPost,
        400: Type.String(),
        401: Type.String(),
    },
}

export const addJobPostRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Body: JobPostType }>, reply: FastifyReply) => {
        try {
            const { eventId } = request.params as { eventId: string }
            const { addJobPostPrivateId } = request.body

            // Get the event to validate the addJobPostPrivateId
            const event = await EventDao.getEvent(fastify.firebase, eventId)

            // Check if job posts are enabled and if the privateId matches
            if (!event.addJobPostEnabled) {
                reply.status(401).send('Job posting is not enabled for this event')
                return
            }

            // Check if the event has a addJobPostPrivateId and if it matches the one provided
            if (!event.addJobPostPrivateId || event.addJobPostPrivateId !== addJobPostPrivateId) {
                reply.status(401).send('Invalid addJobPostPrivateId ID')
                return
            }

            // Remove addJobPostPrivateId from the job post data before saving
            const { addJobPostPrivateId: _, ...jobPostData } = request.body

            const jobPostId = await JobPostDao.addJobPost(fastify.firebase, eventId, jobPostData)

            reply.status(201).send({
                jobPostId,
            })
        } catch (error: unknown) {
            console.error('Error adding job post:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to add job post: ${errorMessage}`)
        }
    }
}

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { JobPostDao } from '../../dao/jobPostDao'
import { EventDao } from '../../dao/eventDao'
import { SponsorDao } from '../../dao/sponsorDao'
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

// New schema for sponsor token-based job post operations
export const TypeBoxSponsorJobPost = Type.Object({
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

export type JobPostType = Static<typeof TypeBoxJobPost>
export type SponsorJobPostType = Static<typeof TypeBoxSponsorJobPost>

export type AddJobPostPOSTTypes = {
    Body: JobPostType
    Reply: { jobPostId: string }
}

export type AddSponsorJobPostPOSTTypes = {
    Body: SponsorJobPostType
    Reply: { jobPostId: string }
}

export const addJobPostPOSTSchema = {
    tags: ['sponsors'],
    summary: 'Add a job post from a sponsor using a private id which is usually with the URL provided to the sponsor',
    body: TypeBoxJobPost,
    response: {
        201: Type.Object({
            jobPostId: Type.String(),
        }),
        400: Type.String(),
        401: Type.String(),
    },
}

export const addSponsorJobPostPOSTSchema = {
    tags: ['sponsors'],
    summary: 'Add a job post using sponsor token for sponsor-specific page',
    body: TypeBoxSponsorJobPost,
    response: {
        201: Type.Object({
            jobPostId: Type.String(),
        }),
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

export const addSponsorJobPostRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Body: SponsorJobPostType }>, reply: FastifyReply) => {
        try {
            const { eventId } = request.params as { eventId: string }
            const { sponsorToken } = request.body

            // Find the sponsor by token
            const sponsorData = await SponsorDao.findSponsorByToken(fastify.firebase, eventId, sponsorToken)

            if (!sponsorData) {
                reply.status(401).send('Invalid sponsor token')
                return
            }

            // Remove sponsorToken from the job post data and add sponsorId
            const { sponsorToken: _, ...jobPostData } = request.body
            const fullJobPostData = {
                ...jobPostData,
                sponsorId: sponsorData.sponsor.id,
            }

            const jobPostId = await JobPostDao.addJobPost(fastify.firebase, eventId, fullJobPostData)

            reply.status(201).send({
                jobPostId,
            })
        } catch (error: unknown) {
            console.error('Error adding sponsor job post:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to add sponsor job post: ${errorMessage}`)
        }
    }
}

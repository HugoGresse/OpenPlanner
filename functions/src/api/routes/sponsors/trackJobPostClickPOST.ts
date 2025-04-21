import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { JobPostDao } from '../../dao/jobPostDao'

export const TypeBoxTrackJobPostClick = Type.Object({
    jobPostId: Type.String(),
})

export type TrackJobPostClickType = Static<typeof TypeBoxTrackJobPostClick>

export type TrackJobPostClickPOSTTypes = {
    Body: TrackJobPostClickType
    Reply: { success: boolean } | string
}

export const trackJobPostClickPOSTSchema = {
    tags: ['sponsors'],
    summary: 'Track a click on a job post',
    body: TypeBoxTrackJobPostClick,
    response: {
        200: Type.Object({
            success: Type.Boolean(),
        }),
        400: Type.String(),
        404: Type.String(),
    },
}

export const trackJobPostClickRouteHandler = (fastify: FastifyInstance) => {
    return async (request: FastifyRequest<{ Body: TrackJobPostClickType }>, reply: FastifyReply) => {
        try {
            const { eventId } = request.params as { eventId: string }
            const { jobPostId } = request.body

            // Check if job post exists
            try {
                await JobPostDao.getJobPost(fastify.firebase, eventId, jobPostId)
            } catch (error) {
                reply.status(404).send('Job post not found')
                return
            }

            const success = await JobPostDao.trackJobPostClick(fastify.firebase, eventId, jobPostId)

            if (success) {
                reply.status(200).send({ success: true })
            } else {
                reply.status(400).send('Failed to track job post click')
            }
        } catch (error: unknown) {
            console.error('Error tracking job post click:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            reply.status(400).send(`Failed to track job post click: ${errorMessage}`)
        }
    }
}

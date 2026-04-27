import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type from 'typebox'
import { SpeakerDao } from '../../dao/speakerDao'

export type DeleteSpeakerDELETETypes = {
    Params: { eventId: string; speakerId: string }
    Querystring: { apiKey?: string }
    Reply: { success: boolean } | string
}

export const deleteSpeakerDELETESchema = {
    tags: ['speakers'],
    summary: 'Delete a speaker',
    description: 'Deletes a speaker by ID. Returns 404 if the speaker does not exist.',
    params: {
        type: 'object',
        properties: {
            eventId: { type: 'string', description: 'Event ID' },
            speakerId: { type: 'string', description: 'Speaker ID' },
        },
        required: ['eventId', 'speakerId'],
    },
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            apiKey: { type: 'string', description: 'The API key of the event' },
        },
    },
    response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.String(),
        404: Type.String(),
    },
    security: [{ apiKey: [] }],
}

export const deleteSpeakerRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{
            Params: { eventId: string; speakerId: string }
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId, speakerId } = request.params
            await SpeakerDao.deleteSpeaker(fastify.firebase, eventId, speakerId)
            reply.status(200).send({ success: true })
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'Speaker not found') {
                reply.status(404).send(`Speaker not found: ${request.params.speakerId}`)
                return
            }
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to delete speaker: ${msg}`)
        }
    }
}

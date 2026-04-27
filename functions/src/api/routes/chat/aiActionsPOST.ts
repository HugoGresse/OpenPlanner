import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Type, { Static } from 'typebox'
import { AiActionDao } from '../../dao/aiActionDao'

const TypeBoxAiAction = Type.Object(
    {
        tool: Type.String({ maxLength: 200 }),
        target: Type.Object(
            {
                id: Type.String({ maxLength: 200 }),
                label: Type.Optional(Type.String({ maxLength: 500 })),
            },
            { additionalProperties: false }
        ),
        args: Type.Record(Type.String(), Type.Any()),
        diff: Type.Object(
            {
                before: Type.Record(Type.String(), Type.Any()),
                after: Type.Union([Type.Record(Type.String(), Type.Any()), Type.Null()]),
            },
            { additionalProperties: false }
        ),
        summary: Type.Optional(Type.String({ maxLength: 1000 })),
        prompt: Type.Optional(Type.String({ maxLength: 50000 })),
        model: Type.Optional(Type.String({ maxLength: 200 })),
        applied: Type.Boolean(),
        rejected: Type.Optional(Type.Boolean()),
    },
    { additionalProperties: false }
)

export type AiActionType = Static<typeof TypeBoxAiAction>

export type AiActionsPOSTTypes = {
    Params: { eventId: string }
    Querystring: { apiKey?: string }
    Body: AiActionType
    Reply: { id: string } | string
}

export const aiActionsPOSTSchema = {
    tags: ['chat'],
    summary: 'Append an AI assistant action to the audit log of an event',
    description:
        'Records the proposal/diff/decision triggered through the chat assistant. Stored at events/:eventId/aiActions/{auto-id}.',
    params: {
        type: 'object',
        properties: { eventId: { type: 'string' } },
        required: ['eventId'],
    },
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            apiKey: { type: 'string', description: 'The API key of the event' },
        },
    },
    body: TypeBoxAiAction,
    response: {
        201: Type.Object({ id: Type.String() }),
        400: Type.String(),
    },
    security: [{ apiKey: [] }],
}

export const aiActionsRouteHandler = (fastify: FastifyInstance) => {
    return async (
        request: FastifyRequest<{ Params: { eventId: string }; Body: AiActionType }>,
        reply: FastifyReply
    ) => {
        try {
            const { eventId } = request.params
            const id = await AiActionDao.addAction(fastify.firebase, eventId, request.body)
            reply.status(201).send({ id })
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error'
            reply.status(400).send(`Failed to record AI action: ${msg}`)
        }
    }
}

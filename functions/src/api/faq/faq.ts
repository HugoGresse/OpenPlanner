import { FastifyInstance } from 'fastify'
import { Static, Type } from '@sinclair/typebox'
import { FaqDao } from '../dao/faqDao'

export const Faq = Type.Object({
    categoryId: Type.String(),
    categoryName: Type.Optional(Type.String()),
    question: Type.String(),
    answer: Type.String(),
    order: Type.Number(),
    categoryOrder: Type.Number(),
})

export type FaqType = Static<typeof Faq>

const Reply = Type.Object({ faqItemId: Type.String() })
type FaqReply = Static<typeof Reply>

export const faqRoutes = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<{ Body: FaqType; Reply: FaqReply }>(
        '/v1/:eventId/faq',
        {
            schema: {
                tags: ['faq'],
                summary: 'Add a new item in the FAQ',
                body: Faq,
                response: {
                    201: Reply,
                    400: Type.String(),
                },
                security: [
                    {
                        apiKey: [],
                    },
                ],
            },
            preHandler: fastify.auth([fastify.verifyApiKey]),
        },
        async (request, reply) => {
            const { eventId } = request.params as { eventId: string }

            const faqItemId = await FaqDao.addFaqQuestion(fastify.firebase, eventId, {
                ...request.body,
            })

            reply.status(201).send({
                faqItemId,
            })
        }
    )
    fastify.get<{ Reply: FaqReply }>(
        '/v1/:eventId/faq/:faqPublicId',
        {
            schema: {
                tags: ['faq'],
                summary: 'Get the FAQ details (publicly used by OpenPlanner public frontend)',
                response: {
                    200: Type.Object(
                        {
                            faq: Type.Array(Faq),
                        },
                        { additionalProperties: false }
                    ),
                    400: Type.String(),
                },
            },
        },
        async (request, reply) => {
            const { eventId, faqPublicId } = request.params as { eventId: string; faqPublicId: string }

            const faqItemId = await FaqDao.getFaqCategory(fastify.firebase, eventId, faqPublicId)

            reply.status(201).send({
                faqItemId,
            })
        }
    )
    done()
}

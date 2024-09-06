import { FastifyInstance } from 'fastify'
import { FormatRegistry, Static, Type } from '@sinclair/typebox'
import { DateTime } from 'luxon'
import { verifyOverwriteData } from './verifyOverwriteData'
import { EventDao } from '../../dao/eventDao'
import { SessionDao } from '../../dao/sessionDao'
import { SpeakerDao } from '../../dao/speakerDao'

const MAX_STRING_LENGTH = 10000

FormatRegistry.Set('dateIso8601', function (value: string) {
    // Doc : https://moment.github.io/luxon/#/parsing?id=iso-8601
    try {
        const result = DateTime.fromISO(value)

        if (result.isValid) {
            return true
        }
    } catch (error) {
        // Do nothing
        console.warn('DateTime.fromISO failed', error)
    }
    return false
})

export const OverwriteSessionsSpeakersType = Type.Object({
    speakers: Type.Array(
        Type.Object({
            id: Type.String({
                maxLength: MAX_STRING_LENGTH,
            }),
            name: Type.String({
                maxLength: MAX_STRING_LENGTH,
            }),
            pronouns: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            jobTitle: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            bio: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            company: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            companyLogoUrl: Type.Optional(Type.String({ format: 'uri' })),
            geolocation: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            photoUrl: Type.Optional(Type.String({ format: 'uri' })),
            socials: Type.Optional(
                Type.Array(
                    Type.Object({
                        name: Type.String({
                            maxLength: MAX_STRING_LENGTH,
                        }),
                        icon: Type.String(),
                        link: Type.String({ format: 'uri' }),
                    })
                )
            ),
        })
    ),
    sessions: Type.Array(
        Type.Object({
            id: Type.String({
                maxLength: MAX_STRING_LENGTH,
            }),
            title: Type.String({
                maxLength: MAX_STRING_LENGTH,
            }),
            abstract: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            dateStart: Type.Optional(Type.String()),
            dateEnd: Type.Optional(Type.String()),
            durationMinutes: Type.Optional(Type.Number()),
            speakerIds: Type.Optional(
                Type.Array(
                    Type.String({
                        maxLength: MAX_STRING_LENGTH,
                    })
                )
            ),
            trackId: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            trackName: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            language: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            level: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            presentationLink: Type.Optional(Type.Union([Type.String({ format: 'uri' }), Type.Null()])),
            videoLink: Type.Optional(Type.Union([Type.String({ format: 'uri' }), Type.Null()])),
            imageUrl: Type.Optional(Type.Union([Type.String({ format: 'uri' }), Type.Null()])),
            tags: Type.Optional(
                Type.Array(
                    Type.String({
                        maxLength: MAX_STRING_LENGTH,
                    })
                )
            ),
            formatId: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            formatName: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            categoryId: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            categoryName: Type.Optional(
                Type.String({
                    maxLength: MAX_STRING_LENGTH,
                })
            ),
            categoryColor: Type.Optional(Type.String()),
            showInFeedback: Type.Optional(Type.Boolean()),
            hideTrackTitle: Type.Optional(Type.Boolean()),
            note: Type.Optional(Type.String()),
            teaserVideoUrl: Type.Optional(Type.String({ format: 'uri' })),
            teaserImageUrl: Type.Optional(Type.String({ format: 'uri' })),
            teasingHidden: Type.Optional(Type.Boolean()),
        })
    ),
})

export type OverwriteSpeakerSessionsType = Static<typeof OverwriteSessionsSpeakersType>
interface IQuerystring {}

const ReplyType = Type.Object({
    success: Type.Optional(Type.Boolean()),
    error: Type.Optional(Type.Any()),
})

export const overwriteSpeakerSessions = (fastify: FastifyInstance, options: any, done: () => any) => {
    fastify.post<{ Querystring: IQuerystring; Body: OverwriteSpeakerSessionsType; Reply: Static<typeof ReplyType> }>(
        '/v1/:eventId/overwriteSpeakerSponsors',
        {
            schema: {
                tags: ['speakers', 'sessions'],
                summary:
                    'Overwrite sessions and speakers: if any data exist before, each filed given in the body will rewrite the corresponding data. ' +
                    'Tracks, formats and categories will only be created if none exist before and if you provide an id and a name. If track, format or category does exist, the ID will be matched again the trackName or the trackId, same for categories and formats.',
                body: OverwriteSessionsSpeakersType,
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
                    201: ReplyType,
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

            const existingEvent = await EventDao.getEvent(fastify.firebase, eventId)
            console.log(`overwriteSpeakerSessions for event ${eventId} ${existingEvent.name}`)

            const { tracksToCreate, categoriesToCreate, formatsToCreate } = verifyOverwriteData(
                request.body,
                existingEvent
            )

            console.log(
                `Creating tracks: ${tracksToCreate.length}, categories: ${categoriesToCreate.length}, formats: ${formatsToCreate.length}`
            )
            for (const track of tracksToCreate) {
                try {
                    await EventDao.createTrack(fastify.firebase, eventId, track)
                } catch (error) {
                    console.error('error creating track', error)
                    // @ts-ignore
                    reply.status(400).send(
                        JSON.stringify({
                            error: (error as object).toString(),
                        })
                    )
                    return
                }
            }
            for (const category of categoriesToCreate) {
                try {
                    await EventDao.createCategory(fastify.firebase, eventId, category)
                } catch (error) {
                    console.error('error creating category', error)
                    // @ts-ignore
                    reply.status(400).send(
                        JSON.stringify({
                            error: (error as object).toString(),
                        })
                    )
                    return
                }
            }
            for (const format of formatsToCreate) {
                try {
                    console.log('creating format', format)
                    await EventDao.createFormat(fastify.firebase, eventId, format)
                } catch (error) {
                    console.error('error creating format', error)
                    // @ts-ignore
                    reply.status(400).send(
                        JSON.stringify({
                            error: (error as object).toString(),
                        })
                    )
                    return
                }
            }

            // Sessions
            for (const session of request.body.sessions) {
                try {
                    await SessionDao.updateOrCreateSession(fastify.firebase, eventId, session)
                } catch (error) {
                    console.error('error creating session', error)
                    // @ts-ignore
                    reply.status(400).send(
                        JSON.stringify({
                            error: (error as object).toString(),
                        })
                    )
                    return
                }
            }

            // Speakers
            for (const speaker of request.body.speakers) {
                try {
                    await SpeakerDao.updateOrCreateSpeaker(fastify.firebase, eventId, speaker)
                } catch (error) {
                    console.error('error creating speaker', error)
                    // @ts-ignore
                    reply.status(400).send(
                        JSON.stringify({
                            error: (error as object).toString(),
                        })
                    )
                    return
                }
            }

            reply.status(201).send({
                success: true,
            })
        }
    )
    done()
}

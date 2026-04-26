import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { Event, Speaker } from '../../../types'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((fastify, _options, next) => {
            next()
        }),
    }
})

const eventId = 'evt-1'
const speakerId = 'spk-1'
const apiKey = 'xxx'

type MockOptions = {
    eventApiKey?: string | null
    speakerExists?: boolean
    speakerData?: Partial<Speaker>
    setSpy?: ReturnType<typeof vi.fn>
    speakerGetError?: unknown
}

const mockFirestore = ({
    eventApiKey = apiKey,
    speakerExists = true,
    speakerData = { id: speakerId, name: 'Original' },
    setSpy = vi.fn(() => Promise.resolve({})),
    speakerGetError,
}: MockOptions = {}) => {
    const speakersPath = `events/${eventId}/speakers`
    return {
        firestore: () =>
            ({
                collection: vi.fn((path: string) => ({
                    doc: vi.fn(() => ({
                        get: vi.fn(() => {
                            if (path === 'events') {
                                return Promise.resolve({
                                    exists: true,
                                    data: () =>
                                        ({
                                            id: eventId,
                                            apiKey: eventApiKey,
                                        } as Partial<Event>),
                                })
                            }
                            if (path === speakersPath) {
                                if (speakerGetError) return Promise.reject(speakerGetError)
                                return Promise.resolve({
                                    exists: speakerExists,
                                    data: () => (speakerExists ? speakerData : undefined),
                                })
                            }
                            return Promise.resolve({ exists: false, data: () => undefined })
                        }),
                        set: setSpy,
                    })),
                })),
            } as unknown as FirebaseFirestore.Firestore),
        setSpy,
    }
}

describe('PATCH /v1/:eventId/speakers/:speakerId', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/${speakerId}`,
            payload: { name: 'New name' },
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 400 if body type is invalid', async () => {
        const { firestore } = mockFirestore()
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
            payload: { socials: 'not-an-array' },
        })

        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'FST_ERR_VALIDATION' })
    })

    test('returns 404 when speaker does not exist', async () => {
        const { firestore } = mockFirestore({ speakerExists: false })
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
            payload: { name: 'New name' },
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Speaker not found')
    })

    test('writes only the provided fields with merge:true and adds updatedAt', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const { firestore } = mockFirestore({ setSpy })
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
            payload: { name: 'Renamed' },
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true })
        expect(setSpy).toHaveBeenCalledTimes(1)
        expect(setSpy).toHaveBeenCalledWith(
            {
                name: 'Renamed',
                updatedAt: expect.any(Object),
            },
            { merge: true }
        )
    })

    test('deep-merges customFields with values present on the existing speaker', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const { firestore } = mockFirestore({
            setSpy,
            speakerData: {
                id: speakerId,
                customFields: {
                    shirtSize: 'M',
                    diet: 'vegetarian',
                    teamLead: 'alice',
                },
            },
        })
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
            payload: {
                customFields: {
                    shirtSize: 'L',
                    teamLead: 'bob',
                },
            },
        })

        expect(res.statusCode).toBe(200)
        expect(setSpy).toHaveBeenCalledWith(
            {
                customFields: {
                    shirtSize: 'L',
                    diet: 'vegetarian',
                    teamLead: 'bob',
                },
                updatedAt: expect.any(Object),
            },
            { merge: true }
        )
    })

    test('derives the social icon from the name when omitted', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const { firestore } = mockFirestore({ setSpy })
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
            payload: {
                socials: [{ name: 'Twitter', link: 'https://twitter.com/foo' }],
            },
        })

        expect(res.statusCode).toBe(200)
        expect(setSpy).toHaveBeenCalledWith(
            {
                socials: [{ name: 'Twitter', icon: 'twitter', link: 'https://twitter.com/foo' }],
                updatedAt: expect.any(Object),
            },
            { merge: true }
        )
    })

    test('returns 400 when the firestore read fails', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const { firestore } = mockFirestore({
            setSpy,
            speakerGetError: new Error('boom'),
        })
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore)

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
            payload: { name: 'New name' },
        })

        expect(res.statusCode).toBe(400)
        expect(res.body).toContain('Failed to update speaker')
        expect(setSpy).not.toHaveBeenCalled()
    })
})

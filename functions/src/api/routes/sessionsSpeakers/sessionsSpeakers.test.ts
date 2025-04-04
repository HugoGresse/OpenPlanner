import { expect, test, describe, afterEach, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { Event } from '../../../types'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((fastify, options, next) => {
            next()
        }),
    }
})

describe('sessionsSpeakers', () => {
    const eventId = 'xEventIdx'
    let fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('should return a 400 if body is not provided', async () => {
        const res = await fastify.inject({ method: 'post', url: `/v1/${eventId}/sessions-speakers` })
        expect(res.statusCode).to.equal(400)
        expect(JSON.parse(res.body)).toMatchObject({
            error: 'FST_ERR_VALIDATION',
        })
    })
    test('should return a 401 if no apiKey is provided but the body has a valid content', async () => {
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers`,
            payload: {
                sessions: [],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(401)
        expect(JSON.parse(res.body)).toMatchObject({
            error: 'Unauthorized! Du balai !',
        })
    })
    test('should pass verification and do nothing more', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({
                id: eventId,
                apiKey: 'xxx',
            } as Partial<Event>)
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(201)
        expect(JSON.parse(res.body)).toMatchObject({
            success: true,
        })
    })
    test('error if new session and missing some field(s)', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore({
                id: eventId,
                apiKey: 'xxx',
            } as Partial<Event>)
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'xxx',
                        trackId: 'xxx',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(400)
        expect(JSON.parse(res.body)).toMatchObject({
            error: 'FST_ERR_VALIDATION',
            reason: "Error: body/sessions/0 must have required property 'title'",
        })
    })

    test('should create the session', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: vi.fn(() =>
                            Promise.resolve({
                                data: () =>
                                    ({
                                        id: eventId,
                                        apiKey: 'xxx',
                                    } as Partial<Event>),
                                exists: true,
                            })
                        ),
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(201)
        expect(JSON.parse(res.body)).toMatchObject({
            success: true,
        })
        expect(updateSpy).toHaveBeenCalledTimes(1)
        expect(updateSpy).toHaveBeenCalledWith({
            id: 'sessionId',
            title: 'sessionTitle',
            updatedAt: expect.any(Object),
        })
    })

    // track
    test('should create the session with a new track', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        const baseEvent = Promise.resolve({
            data: () =>
                ({
                    id: eventId,
                    name: 'eventTestfull',
                    apiKey: 'xxx',
                } as Partial<Event>),
            exists: true,
        })
        // First call, get the somewhat empty event
        // Second call, get the updated event
        const getEventSpy = vi.fn(() => baseEvent)

        getEventSpy
            .mockImplementationOnce(() => {
                return baseEvent
            })
            .mockImplementationOnce(() => {
                return baseEvent
            })
            .mockImplementationOnce(() => {
                return Promise.resolve({
                    data: () =>
                        ({
                            id: eventId,
                            apiKey: 'xxx',
                            tracks: [
                                {
                                    id: 'newTrackId',
                                    name: 'newTrackName',
                                },
                            ],
                        } as Partial<Event>),
                    exists: true,
                })
            })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: getEventSpy,
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        trackId: 'newTrackId',
                        trackName: 'newTrackName',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(201)
        expect(JSON.parse(res.body)).toMatchObject({
            success: true,
        })
        expect(updateSpy).toHaveBeenCalledTimes(2)
        expect(updateSpy).toHaveBeenNthCalledWith(1, {
            tracks: {
                elements: [
                    {
                        id: 'newTrackId',
                        name: 'newTrackName',
                    },
                ],
            },
        })
        expect(updateSpy).toHaveBeenNthCalledWith(2, {
            id: 'sessionId',
            title: 'sessionTitle',
            trackId: 'newTrackId',
            updatedAt: expect.any(Object),
        })
    })
    test('should create the session with O new track if already exist', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: vi.fn(() =>
                            Promise.resolve({
                                data: () =>
                                    ({
                                        id: eventId,
                                        apiKey: 'xxx',
                                        tracks: [
                                            {
                                                id: 'oldTrackId',
                                                name: 'oldTrackName',
                                            },
                                        ],
                                    } as Partial<Event>),
                                exists: true,
                            })
                        ),
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        trackId: 'oldTrackId',
                        trackName: 'oldTrackName',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(201)
        expect(JSON.parse(res.body)).toMatchObject({
            success: true,
        })
        expect(updateSpy).toHaveBeenCalledTimes(1)
        expect(updateSpy).toHaveBeenNthCalledWith(1, {
            id: 'sessionId',
            title: 'sessionTitle',
            trackId: 'oldTrackId',
            updatedAt: expect.any(Object),
        })
    })

    // Format
    test('should create the session with a new format', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        const baseEvent = Promise.resolve({
            data: () =>
                ({
                    id: eventId,
                    name: 'eventTestfull',
                    apiKey: 'xxx',
                } as Partial<Event>),
            exists: true,
        })
        // First call, get the somewhat empty event
        // Second call, get the updated event
        const getEventSpy = vi.fn(() => baseEvent)

        getEventSpy
            .mockImplementationOnce(() => {
                return baseEvent
            })
            .mockImplementationOnce(() => {
                return baseEvent
            })
            .mockImplementationOnce(() => {
                return Promise.resolve({
                    data: () =>
                        ({
                            id: eventId,
                            apiKey: 'xxx',
                            formats: [
                                {
                                    id: 'newFormatId',
                                    name: 'newFormatName',
                                    durationMinutes: 20,
                                },
                            ],
                        } as Partial<Event>),
                    exists: true,
                })
            })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: getEventSpy,
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        formatId: 'newFormatId',
                        formatName: 'newFormatName',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(201)
        expect(JSON.parse(res.body)).toMatchObject({
            success: true,
        })
        expect(updateSpy).toHaveBeenCalledTimes(2)
        expect(updateSpy).toHaveBeenNthCalledWith(1, {
            formats: {
                elements: [
                    {
                        id: 'newFormatId',
                        name: 'newFormatName',
                        durationMinutes: 20,
                    },
                ],
            },
        })
        expect(updateSpy).toHaveBeenNthCalledWith(2, {
            id: 'sessionId',
            title: 'sessionTitle',
            format: 'newFormatId',
            updatedAt: expect.any(Object),
        })
    })
    test('should create the session with O new format if already exist', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: vi.fn(() =>
                            Promise.resolve({
                                data: () =>
                                    ({
                                        id: eventId,
                                        apiKey: 'xxx',
                                        formats: [
                                            {
                                                id: 'oldFormatId',
                                                name: 'oldFormatName',
                                            },
                                        ],
                                    } as Partial<Event>),
                                exists: true,
                            })
                        ),
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        formatId: 'oldFormatId',
                        formatName: 'oldFormatName',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(201)
        expect(JSON.parse(res.body)).toMatchObject({
            success: true,
        })
        expect(updateSpy).toHaveBeenCalledTimes(1)
        expect(updateSpy).toHaveBeenNthCalledWith(1, {
            id: 'sessionId',
            title: 'sessionTitle',
            format: 'oldFormatId',
            updatedAt: expect.any(Object),
        })
    })
    // Category
    test('should create the session with category null as the getEvent returned no category', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: vi.fn(() =>
                            Promise.resolve({
                                data: () =>
                                    ({
                                        id: eventId,
                                        apiKey: 'xxx',
                                    } as Partial<Event>),
                                exists: true,
                            })
                        ),
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        categoryId: 'newCategoryId',
                        categoryName: 'newCategoryName',
                        categoryColor: '#124590',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(201)
        expect(JSON.parse(res.body)).toMatchObject({
            success: true,
        })
        expect(updateSpy).toHaveBeenCalledTimes(2)
        expect(updateSpy).toHaveBeenNthCalledWith(1, {
            categories: {
                elements: [
                    {
                        id: 'newCategoryId',
                        name: 'newCategoryName',
                        color: '#124590',
                    },
                ],
            },
        })
        expect(updateSpy).toHaveBeenNthCalledWith(2, {
            id: 'sessionId',
            title: 'sessionTitle',
            category: null,
            updatedAt: expect.any(Object),
        })
    })
    test('should create the session with a new category', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        const baseEvent = Promise.resolve({
            data: () =>
                ({
                    id: eventId,
                    name: 'eventTestfull',
                    apiKey: 'xxx',
                } as Partial<Event>),
            exists: true,
        })
        // First call, get the somewhat empty event
        // Second call, get the updated event
        const getEventSpy = vi.fn(() => baseEvent)

        getEventSpy
            .mockImplementationOnce(() => {
                return baseEvent
            })
            .mockImplementationOnce(() => {
                return baseEvent
            })
            .mockImplementationOnce(() => {
                return Promise.resolve({
                    data: () =>
                        ({
                            id: eventId,
                            apiKey: 'xxx',
                            categories: [
                                {
                                    id: 'newCategoryId',
                                    name: 'newCategoryName',
                                    color: '#124590',
                                },
                            ],
                        } as Partial<Event>),
                    exists: true,
                })
            })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: getEventSpy,
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        categoryId: 'newCategoryId',
                        categoryName: 'newCategoryName',
                        categoryColor: '#124590',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(201)
        expect(JSON.parse(res.body)).toMatchObject({
            success: true,
        })
        expect(updateSpy).toHaveBeenCalledTimes(2)
        expect(updateSpy).toHaveBeenNthCalledWith(1, {
            categories: {
                elements: [
                    {
                        id: 'newCategoryId',
                        name: 'newCategoryName',
                        color: '#124590',
                    },
                ],
            },
        })
        expect(updateSpy).toHaveBeenNthCalledWith(2, {
            id: 'sessionId',
            title: 'sessionTitle',
            category: 'newCategoryId',
            updatedAt: expect.any(Object),
        })
    })
    test('should create the session with O new category if already exist', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: vi.fn(() =>
                            Promise.resolve({
                                data: () =>
                                    ({
                                        id: eventId,
                                        apiKey: 'xxx',
                                        categories: [
                                            {
                                                id: 'oldCategoryId',
                                                name: 'oldCategoryName',
                                            },
                                        ],
                                    } as Partial<Event>),
                                exists: true,
                            })
                        ),
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        categoryId: 'oldCategoryId',
                        categoryName: 'oldCategoryName',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(201)
        expect(JSON.parse(res.body)).toMatchObject({
            success: true,
        })
        expect(updateSpy).toHaveBeenCalledTimes(1)
        expect(updateSpy).toHaveBeenNthCalledWith(1, {
            id: 'sessionId',
            title: 'sessionTitle',
            category: 'oldCategoryId',
            updatedAt: expect.any(Object),
        })
    })

    test('should throw error if date is not correctly formatted', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: vi.fn(() =>
                            Promise.resolve({
                                data: () =>
                                    ({
                                        id: eventId,
                                        apiKey: 'xxx',
                                        categories: [],
                                    } as Partial<Event>),
                                exists: true,
                            })
                        ),
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        categoryId: 'oldCategoryId',
                        categoryName: 'oldCategoryName',
                        dateStart: '2023-01-01-ddzadzdzadza',
                        dateEnd: 'ddzadzdzadza',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(400)
        expect(JSON.parse(res.body)).toMatchObject({
            error: 'FST_ERR_VALIDATION',
            reason: 'FormatError: dateStart is not a valid ISO 8601 date',
        })
        expect(updateSpy).toHaveBeenCalledTimes(0)
    })

    test('should throw error if date end is not correctly formatted', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: vi.fn(() =>
                            Promise.resolve({
                                data: () =>
                                    ({
                                        id: eventId,
                                        apiKey: 'xxx',
                                        categories: [],
                                    } as Partial<Event>),
                                exists: true,
                            })
                        ),
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        categoryId: 'oldCategoryId',
                        categoryName: 'oldCategoryName',
                        dateStart: '2023-01-01',
                        dateEnd: 'ddzadzdzadza',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(400)
        expect(JSON.parse(res.body)).toMatchObject({
            error: 'FST_ERR_VALIDATION',
            reason: 'FormatError: dateEnd is not a valid ISO 8601 date',
        })
        expect(updateSpy).toHaveBeenCalledTimes(0)
    })
    test('should throw error if date end on a second session is not correctly formatted', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: vi.fn(() =>
                            Promise.resolve({
                                data: () =>
                                    ({
                                        id: eventId,
                                        apiKey: 'xxx',
                                        categories: [],
                                    } as Partial<Event>),
                                exists: true,
                            })
                        ),
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        categoryId: 'oldCategoryId',
                        categoryName: 'oldCategoryName',
                        dateStart: '2023-01-01',
                        dateEnd: '2023-01-01',
                    },
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        categoryId: 'oldCategoryId',
                        categoryName: 'oldCategoryName',
                        dateStart: '2023-01-01',
                        dateEnd: 'ddzadzdzadza',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(400)
        expect(JSON.parse(res.body)).toMatchObject({
            error: 'FST_ERR_VALIDATION',
            reason: 'FormatError: dateEnd is not a valid ISO 8601 date',
        })
        expect(updateSpy).toHaveBeenCalledTimes(0)
    })
    test('should throw error if session failed to be saved', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: vi.fn(() =>
                            Promise.reject({
                                error: 'Some random error',
                                exists: false,
                            })
                        ),
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        categoryId: 'oldCategoryId',
                        categoryName: 'oldCategoryName',
                        dateStart: '2023-01-01',
                        dateEnd: '2023-01-01',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(400)
        expect(JSON.parse(res.body)).toMatchObject({
            reason: '{"error":"Some random error","exists":false}',
            error: {
                error: 'Some random error',
                exists: false,
            },
        })
        expect(updateSpy).toHaveBeenCalledTimes(0)
    })
    test('should throw error if session failed to be saved2', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: 2,
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        categoryId: 'oldCategoryId',
                        categoryName: 'oldCategoryName',
                        dateStart: '2023-01-01',
                        dateEnd: '2023-01-01',
                    },
                ],
                speakers: [],
            },
        })
        expect(res.statusCode).to.equal(400)
        expect(JSON.parse(res.body)).toMatchObject({
            reason: 'db.collection(...).doc(...).get is not a function',
            error: {},
        })
        expect(updateSpy).toHaveBeenCalledTimes(0)
    })
    test('should throw error if speaker failed to be saved3', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: vi.fn(() =>
                            Promise.resolve({
                                data: () =>
                                    ({
                                        id: eventId,
                                        apiKey: 'xxx',
                                        categories: [],
                                    } as Partial<Event>),
                                exists: true,
                            })
                        ),
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        categoryId: 'oldCategoryId',
                        categoryName: 'oldCategoryName',
                        speakers: ['speakerId'],
                    },
                ],
                speakers: [
                    {
                        id: 'speakerId',
                        name: 'speakerName',
                        pronouns: 'speakerPronouns',
                        jobTitle: 'speakerJobTitle',
                        company: 'speakerCompany',
                        companyLogoUrl: 'https://example.com/speakerCompanyLogoUrl',
                        geolocation: 'speakerGeolocation',
                        photoUrl: 'https://example.comspeakerPhotoUrl',
                        socials: [],
                    },
                ],
            },
        })
        expect(res.statusCode).to.equal(400)
        expect(JSON.parse(res.body)).toMatchObject({
            error: 'Failed to save speaker',
            reason: 'TypeError: db.collection(...).doc(...).set is not a function',
        })
        expect(updateSpy).toHaveBeenCalledTimes(2)
    })

    test('should create the sessions, tracks, categories and formats, and speakers', async () => {
        const updateSpy = vi.fn(() => {
            return Promise.resolve({})
        })
        const setSpy = vi.fn(() => {
            return Promise.resolve({})
        })
        // First call, get the somewhat empty event
        // Second call, get the updated event
        const getEventSpy = vi.fn(() => {
            return Promise.resolve({
                data: () =>
                    ({
                        id: eventId,
                        apiKey: 'xxx',
                        shouldntBe: 'here',
                    } as Partial<Event>),
                exists: true,
            })
        })

        const baseEvent = Promise.resolve({
            data: () =>
                ({
                    id: eventId,
                    name: 'eventTestfull',
                    apiKey: 'xxx',
                } as Partial<Event>),
            exists: true,
        })
        getEventSpy
            .mockImplementationOnce(() => {
                return baseEvent
            })
            .mockImplementationOnce(() => {
                return baseEvent
            })
            .mockImplementationOnce(() => {
                return Promise.resolve({
                    data: () =>
                        ({
                            id: eventId,
                            apiKey: 'xxx',
                            formats: [
                                {
                                    id: 'newFormatId',
                                    name: 'newFormatName',
                                    durationMinutes: 20,
                                },
                                {
                                    id: 'newFormatId2',
                                    name: 'newFormatName2',
                                    durationMinutes: 20,
                                },
                            ],
                            categories: [
                                {
                                    id: 'newCategoryId',
                                    name: 'newCategoryName',
                                    color: '#053aa7',
                                },
                                {
                                    id: 'newCategoryId2',
                                    name: 'newCategoryName2',
                                    color: '#123123',
                                },
                            ],
                            tracks: [
                                {
                                    id: 'newTrackId',
                                    name: 'newTrackName',
                                },
                                {
                                    id: 'newTrackId2',
                                    name: 'newTrackName2',
                                },
                            ],
                        } as Partial<Event>),
                    exists: true,
                })
            })

        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() => {
            return getMockedFirestore(
                {},
                {
                    doc: vi.fn(() => ({
                        get: getEventSpy,
                        set: setSpy,
                        update: updateSpy,
                    })),
                }
            )
        })
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/sessions-speakers?apiKey=xxx`,
            payload: {
                sessions: [
                    {
                        id: 'sessionId',
                        title: 'sessionTitle',
                        formatId: 'newFormatId',
                        formatName: 'newFormatName',
                        trackId: 'newTrackId',
                        trackName: 'newTrackName',
                        categoryId: 'newCategoryId',
                        categoryName: 'newCategoryName',
                        categoryColor: '#053aa7',
                    },
                    {
                        id: 'sessionId2',
                        title: 'sessionTitle2',
                        formatId: 'newFormatId2',
                        formatName: 'newFormatName2',
                        trackId: 'newTrackId2',
                        trackName: 'newTrackName2',
                        categoryId: 'newCategoryId2',
                        categoryName: 'newCategoryName2',
                        categoryColor: '#123123',
                    },
                ],
                speakers: [
                    {
                        id: 'speakerId',
                        name: 'speakerName',
                        pronouns: 'speakerPronouns',
                        jobTitle: 'speakerJobTitle',
                        company: 'speakerCompany',
                        companyLogoUrl: 'https://example.com/speakerCompanyLogoUrl',
                        geolocation: 'speakerGeolocation',
                        photoUrl: 'https://example.comspeakerPhotoUrl',
                        socials: [],
                    },
                    {
                        id: 'speakerId2',
                        name: 'speakerName2',
                        pronouns: 'speakerPronouns2',
                        jobTitle: 'speakerJobTitle2',
                        company: 'speakerCompany2',
                        companyLogoUrl: 'https://example.com/speakerCompanyLogoUrl2',
                        geolocation: 'speakerGeolocation2',
                        photoUrl: 'https://example.comspeakerPhotoUrl2',
                        socials: [],
                    },
                ],
            },
        })
        expect(JSON.parse(res.body)).toMatchObject({
            success: true,
        })
        expect(res.statusCode).to.equal(201)
        expect(getEventSpy).toHaveBeenCalledTimes(13)
        expect(updateSpy).toHaveBeenCalledTimes(8)
        expect(updateSpy).toHaveBeenNthCalledWith(1, {
            tracks: {
                elements: [
                    {
                        id: 'newTrackId',
                        name: 'newTrackName',
                    },
                ],
            },
        })
        expect(updateSpy).toHaveBeenNthCalledWith(2, {
            tracks: {
                elements: [
                    {
                        id: 'newTrackId2',
                        name: 'newTrackName2',
                    },
                ],
            },
        })
        expect(updateSpy).toHaveBeenNthCalledWith(3, {
            categories: {
                elements: [
                    {
                        id: 'newCategoryId',
                        name: 'newCategoryName',
                        color: '#053aa7',
                    },
                ],
            },
        })
        expect(updateSpy).toHaveBeenNthCalledWith(4, {
            categories: {
                elements: [
                    {
                        id: 'newCategoryId2',
                        name: 'newCategoryName2',
                        color: '#123123',
                    },
                ],
            },
        })
        expect(updateSpy).toHaveBeenNthCalledWith(5, {
            formats: {
                elements: [
                    {
                        id: 'newFormatId',
                        name: 'newFormatName',
                        durationMinutes: 20,
                    },
                ],
            },
        })
        expect(updateSpy).toHaveBeenNthCalledWith(6, {
            formats: {
                elements: [
                    {
                        id: 'newFormatId2',
                        name: 'newFormatName2',
                        durationMinutes: 20,
                    },
                ],
            },
        })
        expect(updateSpy).toHaveBeenNthCalledWith(7, {
            category: 'newCategoryId',
            format: 'newFormatId',
            id: 'sessionId',
            title: 'sessionTitle',
            trackId: 'newTrackId',
            updatedAt: expect.any(Object),
        })
        expect(updateSpy).toHaveBeenNthCalledWith(8, {
            category: 'newCategoryId2',
            format: 'newFormatId2',
            id: 'sessionId2',
            title: 'sessionTitle2',
            trackId: 'newTrackId2',
            updatedAt: expect.any(Object),
        })
        expect(setSpy).toHaveBeenCalledTimes(2)
        expect(setSpy).toHaveBeenNthCalledWith(1, {
            id: 'speakerId',
            name: 'speakerName',
            pronouns: 'speakerPronouns',
            jobTitle: 'speakerJobTitle',
            company: 'speakerCompany',
            companyLogoUrl: 'https://example.com/speakerCompanyLogoUrl',
            geolocation: 'speakerGeolocation',
            photoUrl: 'https://example.comspeakerPhotoUrl',
            socials: [],
            updatedAt: expect.any(Object),
        })
        expect(setSpy).toHaveBeenNthCalledWith(2, {
            id: 'speakerId2',
            name: 'speakerName2',
            pronouns: 'speakerPronouns2',
            jobTitle: 'speakerJobTitle2',
            company: 'speakerCompany2',
            companyLogoUrl: 'https://example.com/speakerCompanyLogoUrl2',
            geolocation: 'speakerGeolocation2',
            photoUrl: 'https://example.comspeakerPhotoUrl2',
            socials: [],
            updatedAt: expect.any(Object),
        })
    })
})

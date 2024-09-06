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

describe('overwriteSpeakerSessions', () => {
    const eventId = 'xEventIdx'
    let fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('should return a 400 if body is not provided', async () => {
        const res = await fastify.inject({ method: 'post', url: `/v1/${eventId}/overwriteSpeakerSponsors` })
        expect(res.statusCode).to.equal(400)
        expect(JSON.parse(res.body)).toMatchObject({
            error: 'FST_ERR_VALIDATION',
        })
    })
    test('should return a 401 if no apiKey is provided but the body has a valid content', async () => {
        const res = await fastify.inject({
            method: 'post',
            url: `/v1/${eventId}/overwriteSpeakerSponsors`,
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
            url: `/v1/${eventId}/overwriteSpeakerSponsors?apiKey=xxx`,
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
            url: `/v1/${eventId}/overwriteSpeakerSponsors?apiKey=xxx`,
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
            url: `/v1/${eventId}/overwriteSpeakerSponsors?apiKey=xxx`,
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
            url: `/v1/${eventId}/overwriteSpeakerSponsors?apiKey=xxx`,
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
            trackName: 'newTrackName',
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
            url: `/v1/${eventId}/overwriteSpeakerSponsors?apiKey=xxx`,
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
            trackName: 'oldTrackName',
            updatedAt: expect.any(Object),
        })
    })

    // Format
    test('should create the session with a new format', async () => {
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
            url: `/v1/${eventId}/overwriteSpeakerSponsors?apiKey=xxx`,
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
            formatId: 'newFormatId',
            formatName: 'newFormatName',
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
            url: `/v1/${eventId}/overwriteSpeakerSponsors?apiKey=xxx`,
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
            formatId: 'oldFormatId',
            formatName: 'oldFormatName',
            updatedAt: expect.any(Object),
        })
    })
    // Category
    test('should create the session with a new category', async () => {
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
            url: `/v1/${eventId}/overwriteSpeakerSponsors?apiKey=xxx`,
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
            categoryId: 'newCategoryId',
            categoryName: 'newCategoryName',
            categoryColor: '#124590',
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
            url: `/v1/${eventId}/overwriteSpeakerSponsors?apiKey=xxx`,
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
            categoryId: 'oldCategoryId',
            categoryName: 'oldCategoryName',
            updatedAt: expect.any(Object),
        })
    })

    // TODO : test incorrect date for session start and end
    // TODO : test session creation error
    // TODO : test speaker creation error
    // TODO : test success update of sessions
    // TODO : test success update of speakers
})
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { Event, Speaker } from '../../../types'
import { hashToken } from '../../dao/speakerEditTokenDao'

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
const RAW_TOKEN = 'a'.repeat(43)
const TOKEN_HASH = hashToken(RAW_TOKEN)

const makeEventDoc = (overrides: Partial<Event> = {}) => ({
    id: eventId,
    name: 'Demo Event',
    apiKey,
    speakerCustomFields: [],
    speakerSelfEdit: { enabled: true },
    ...overrides,
})

const speakerEmail = 'jane@example.com'
const makeSpeaker = (overrides: Partial<Speaker> = {}): Speaker => ({
    id: speakerId,
    name: 'Jane',
    email: speakerEmail,
    phone: null,
    conferenceHallId: null,
    pronouns: null,
    jobTitle: null,
    bio: null,
    company: null,
    companyLogoUrl: null,
    geolocation: null,
    photoUrl: null,
    socials: [],
    note: null,
    ...overrides,
})

type Stores = {
    eventData: ReturnType<typeof makeEventDoc>
    speakerData: Speaker
    tokenDoc?: {
        id: string
        speakerId: string
        tokenHash: string
        expiresAt: { toDate: () => Date }
        usedAt: unknown
    }
    pendingEditDoc?: Record<string, unknown> | null
    rateLimitCount?: number
    rateLimitMax?: number
    setSpy: ReturnType<typeof vi.fn>
    addSpy: ReturnType<typeof vi.fn>
    txSetSpy: ReturnType<typeof vi.fn>
    speakersList?: Speaker[]
}

const makeFirestore = (stores: Stores) => {
    const speakersListData = stores.speakersList ?? [stores.speakerData]
    const mailCollectionAdd = vi.fn(() => Promise.resolve())
    return () =>
        ({
            collection: vi.fn((path: string) => {
                const eventTokenPath = `events/${eventId}/speakerEditTokens`
                const pendingPath = `events/${eventId}/speakerPendingEdits`
                const speakersPath = `events/${eventId}/speakers`
                const rateLimitPath = `events/${eventId}/speakerEditRateLimits`
                const mailPath = 'mail'

                if (path === mailPath) {
                    return { add: mailCollectionAdd }
                }

                if (path === speakersPath) {
                    return {
                        get: vi.fn(() =>
                            Promise.resolve({
                                docs: speakersListData.map((s) => ({
                                    id: s.id,
                                    data: () => s,
                                })),
                            })
                        ),
                        doc: vi.fn(() => ({
                            get: vi.fn(() =>
                                Promise.resolve({
                                    exists: !!stores.speakerData,
                                    data: () => stores.speakerData,
                                })
                            ),
                            set: stores.setSpy,
                        })),
                    }
                }

                if (path === eventTokenPath) {
                    return {
                        where: vi.fn(() => ({
                            limit: vi.fn(() => ({
                                get: vi.fn(() =>
                                    Promise.resolve(
                                        stores.tokenDoc
                                            ? {
                                                  empty: false,
                                                  docs: [
                                                      {
                                                          id: stores.tokenDoc.id,
                                                          data: () => stores.tokenDoc,
                                                      },
                                                  ],
                                              }
                                            : { empty: true, docs: [] }
                                    )
                                ),
                            })),
                        })),
                        doc: vi.fn(() => ({
                            set: stores.setSpy,
                        })),
                    }
                }

                if (path === pendingPath) {
                    return {
                        doc: vi.fn(() => ({
                            get: vi.fn(() =>
                                Promise.resolve({
                                    exists: !!stores.pendingEditDoc,
                                    data: () => stores.pendingEditDoc,
                                })
                            ),
                            set: stores.setSpy,
                        })),
                    }
                }

                if (path === rateLimitPath) {
                    return {
                        doc: vi.fn(() => ({})),
                    }
                }

                if (path === 'events') {
                    return {
                        doc: vi.fn(() => ({
                            get: vi.fn(() =>
                                Promise.resolve({
                                    exists: true,
                                    data: () => stores.eventData,
                                })
                            ),
                        })),
                    }
                }

                return { doc: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ exists: false })) })) }
            }),
            runTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
                const max = stores.rateLimitMax ?? 5
                const current = stores.rateLimitCount ?? 0
                const tx = {
                    get: vi.fn(() =>
                        Promise.resolve({
                            exists: current > 0,
                            data: () => ({ count: current }),
                        })
                    ),
                    set: stores.txSetSpy,
                }
                if (current >= max) {
                    return { allowed: false, count: current }
                }
                await fn(tx)
                return { allowed: true, count: current + 1 }
            }),
            __mailAdd: mailCollectionAdd,
        } as unknown as FirebaseFirestore.Firestore)
}

describe('Speaker self-edit endpoints', () => {
    const fastify = setupFastify()

    beforeAll(async () => {
        await fastify.ready()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('hashToken is deterministic and 64 hex chars', () => {
        const h1 = hashToken('abc')
        const h2 = hashToken('abc')
        expect(h1).toBe(h2)
        expect(h1).toMatch(/^[0-9a-f]{64}$/)
    })

    test('POST request-edit-link rejects invalid captcha', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const addSpy = vi.fn(() => Promise.resolve())
        const txSetSpy = vi.fn()
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
            setSpy,
            addSpy,
            txSetSpy,
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const ORIG_NODE_ENV = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'

        try {
            const res = await fastify.inject({
                method: 'POST',
                url: `/v1/${eventId}/speakers/request-edit-link`,
                payload: { email: speakerEmail, captchaToken: 'bad' },
            })
            expect(res.statusCode).toBe(400)
        } finally {
            process.env.NODE_ENV = ORIG_NODE_ENV
        }
    })

    test('POST request-edit-link returns generic success when email does not match', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const addSpy = vi.fn(() => Promise.resolve())
        const txSetSpy = vi.fn()
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
            setSpy,
            addSpy,
            txSetSpy,
            speakersList: [makeSpeaker({ email: 'other@example.com' })],
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speakers/request-edit-link`,
            payload: { email: 'unknown@example.com', captchaToken: 'any' },
        })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true })
        expect(setSpy).not.toHaveBeenCalled()
    })

    test('POST request-edit-link returns 404 if feature disabled', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const stores: Stores = {
            eventData: makeEventDoc({ speakerSelfEdit: { enabled: false } }),
            speakerData: makeSpeaker(),
            setSpy,
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speakers/request-edit-link`,
            payload: { email: speakerEmail, captchaToken: 'any' },
        })
        expect(res.statusCode).toBe(404)
    })

    test('POST request-edit-link silently passes when rate limit exceeded', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
            setSpy,
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
            rateLimitCount: 999,
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speakers/request-edit-link`,
            payload: { email: speakerEmail, captchaToken: 'any' },
        })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true })
        expect(setSpy).not.toHaveBeenCalled()
    })

    test('GET self returns 400 without token (schema-required)', async () => {
        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/speakers/${speakerId}/self`,
        })
        expect(res.statusCode).toBe(400)
    })

    test('GET self returns 401 with invalid token', async () => {
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
            tokenDoc: undefined,
            setSpy: vi.fn(),
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/speakers/${speakerId}/self?t=${RAW_TOKEN}`,
        })
        expect(res.statusCode).toBe(401)
    })

    test('GET self returns 401 when token belongs to different speaker', async () => {
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
            tokenDoc: {
                id: 'tok-1',
                speakerId: 'other-speaker',
                tokenHash: TOKEN_HASH,
                expiresAt: { toDate: () => new Date(Date.now() + 100000) },
                usedAt: null,
            },
            setSpy: vi.fn(),
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/speakers/${speakerId}/self?t=${RAW_TOKEN}`,
        })
        expect(res.statusCode).toBe(403)
    })

    test('GET self returns speaker public fields with valid token', async () => {
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker({ bio: 'hello', jobTitle: 'Engineer' }),
            tokenDoc: {
                id: 'tok-1',
                speakerId,
                tokenHash: TOKEN_HASH,
                expiresAt: { toDate: () => new Date(Date.now() + 100000) },
                usedAt: null,
            },
            setSpy: vi.fn(),
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'GET',
            url: `/v1/${eventId}/speakers/${speakerId}/self?t=${RAW_TOKEN}`,
        })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body.speaker).toMatchObject({ id: speakerId, name: 'Jane', bio: 'hello', jobTitle: 'Engineer' })
        expect(body.editableFields).toContain('name')
    })

    test('POST self/submit strips non-editable fields and creates pending edit', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const stores: Stores = {
            eventData: makeEventDoc({
                speakerSelfEdit: { enabled: true, editableFields: ['name', 'jobTitle'] },
            }),
            speakerData: makeSpeaker(),
            tokenDoc: {
                id: 'tok-1',
                speakerId,
                tokenHash: TOKEN_HASH,
                expiresAt: { toDate: () => new Date(Date.now() + 100000) },
                usedAt: null,
            },
            setSpy,
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speakers/${speakerId}/self/submit?t=${RAW_TOKEN}`,
            payload: {
                name: 'Renamed',
                jobTitle: 'New title',
                bio: 'should be stripped',
            },
        })
        expect(res.statusCode).toBe(200)
        const body = JSON.parse(res.body)
        expect(body.success).toBe(true)
        expect(body.requestId).toBeDefined()
        const setCalls = setSpy.mock.calls
        const pendingCall = setCalls.find((c) => c[0]?.patch)
        expect(pendingCall).toBeDefined()
        expect(pendingCall![0].patch).toEqual({ name: 'Renamed', jobTitle: 'New title' })
        expect(pendingCall![0].patch.bio).toBeUndefined()
    })

    test('POST self/submit returns 401 if token already used', async () => {
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
            tokenDoc: {
                id: 'tok-1',
                speakerId,
                tokenHash: TOKEN_HASH,
                expiresAt: { toDate: () => new Date(Date.now() + 100000) },
                usedAt: { toDate: () => new Date() },
            },
            setSpy: vi.fn(),
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speakers/${speakerId}/self/submit?t=${RAW_TOKEN}`,
            payload: { name: 'X' },
        })
        expect(res.statusCode).toBe(401)
    })

    test('POST self/submit returns 401 for expired token', async () => {
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
            tokenDoc: {
                id: 'tok-1',
                speakerId,
                tokenHash: TOKEN_HASH,
                expiresAt: { toDate: () => new Date(Date.now() - 1000) },
                usedAt: null,
            },
            setSpy: vi.fn(),
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speakers/${speakerId}/self/submit?t=${RAW_TOKEN}`,
            payload: { name: 'X' },
        })
        expect(res.statusCode).toBe(401)
    })

    test('POST approve applies patch and marks request approved', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
            pendingEditDoc: {
                id: 'req-1',
                speakerId,
                status: 'pending',
                patch: { name: 'Approved Name', jobTitle: 'Approved' },
                baseSnapshot: { name: 'Jane', jobTitle: null },
            },
            setSpy,
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speaker-pending-edits/req-1/approve?apiKey=${apiKey}`,
            payload: { reviewerUid: 'admin-1' },
        })
        expect(res.statusCode).toBe(200)
        const speakerPatchCall = setSpy.mock.calls.find(
            (c) => c[0] && (c[0] as Record<string, unknown>).name === 'Approved Name'
        )
        expect(speakerPatchCall).toBeDefined()
        const reviewedCall = setSpy.mock.calls.find(
            (c) => c[0] && (c[0] as Record<string, unknown>).status === 'approved'
        )
        expect(reviewedCall).toBeDefined()
    })

    test('POST approve returns 409 when already approved', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
            pendingEditDoc: {
                id: 'req-1',
                speakerId,
                status: 'approved',
                patch: {},
                baseSnapshot: {},
            },
            setSpy,
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speaker-pending-edits/req-1/approve?apiKey=${apiKey}`,
            payload: { reviewerUid: 'admin-1' },
        })
        expect(res.statusCode).toBe(409)
    })

    test('POST reject does not touch speaker', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
            pendingEditDoc: {
                id: 'req-1',
                speakerId,
                status: 'pending',
                patch: { name: 'X' },
                baseSnapshot: { name: 'Jane' },
            },
            setSpy,
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speaker-pending-edits/req-1/reject?apiKey=${apiKey}`,
            payload: { reviewerUid: 'admin-1', reviewNote: 'nope' },
        })
        expect(res.statusCode).toBe(200)
        const speakerWriteCall = setSpy.mock.calls.find((c) => c[0] && (c[0] as Record<string, unknown>).name === 'X')
        expect(speakerWriteCall).toBeUndefined()
        const rejectedCall = setSpy.mock.calls.find(
            (c) => c[0] && (c[0] as Record<string, unknown>).status === 'rejected'
        )
        expect(rejectedCall).toBeDefined()
    })
})

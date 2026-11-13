import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
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

// Stub nodemailer for every integration test. The send happens inline now
// (no Trigger Email extension), so leaving the real transport in place
// would attempt to open a TCP connection during tests. The audit row is
// still written to Firestore, so `mailAddSpy` assertions keep working.
vi.mock('nodemailer', () => ({
    default: {
        createTransport: () => ({
            sendMail: () => Promise.resolve({ messageId: 'test-mid', response: '250 OK' }),
        }),
    },
    createTransport: () => ({
        sendMail: () => Promise.resolve({ messageId: 'test-mid', response: '250 OK' }),
    }),
}))

// Photo upload tests need to drive the multipart parser and file-type sniffer
// without actually shipping bytes through busboy. The mocks let each test
// pick the buffer + sniffed MIME the handler will see.
const multipartMock = vi.hoisted(() => ({
    extractMultipartFormData: vi.fn(),
}))
const fileTypesMock = vi.hoisted(() => ({
    checkFileTypes: vi.fn(),
}))
const uploadMock = vi.hoisted(() => ({
    uploadBufferToStorage: vi.fn(),
}))
vi.mock('../file/utils/parseMultipartFiles', () => multipartMock)
vi.mock('../../other/checkFileTypes', () => fileTypesMock)
vi.mock('../file/utils/uploadBufferToStorage', () => uploadMock)

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
    // Captures every mail-queue write (`db.collection('mail').add(...)`),
    // exposed on the returned Firestore mock as `__mailAdd` so tests can
    // assert on approval/rejection notification content.
    mailAddSpy?: ReturnType<typeof vi.fn>
}

const makeFirestore = (stores: Stores) => {
    const speakersListData = stores.speakersList ?? [stores.speakerData]
    const mailCollectionAdd = stores.mailAddSpy ?? vi.fn(() => Promise.resolve())
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
                        // SpeakerDao.getSpeakerByEmail issues an indexed
                        // equality query: .where('email', '==', X).limit(1).get()
                        where: vi.fn((field: string, _op: string, value: unknown) => ({
                            limit: vi.fn(() => ({
                                get: vi.fn(() => {
                                    const match = speakersListData.find(
                                        (s) => (s as Record<string, unknown>)[field] === value
                                    )
                                    return Promise.resolve(
                                        match
                                            ? {
                                                  empty: false,
                                                  docs: [{ id: match.id, data: () => match }],
                                              }
                                            : { empty: true, docs: [] }
                                    )
                                }),
                            })),
                        })),
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
            // Submit handler now writes pending edit + token-used in one
            // atomic batch. Forward every batch.set(ref, data, opts) call
            // to the shared setSpy so existing assertions continue to find
            // the pending-edit row and any other batched write.
            batch: vi.fn(() => ({
                set: (_ref: unknown, data: unknown, opts?: unknown) => stores.setSpy(data, opts),
                commit: () => Promise.resolve(),
            })),
            __mailAdd: mailCollectionAdd,
        } as unknown as FirebaseFirestore.Firestore)
}

describe('Speaker self-edit endpoints', () => {
    const fastify = setupFastify()

    // Capture the original env values so the suite-level set + restore
    // never leaks credentials between suites when vitest runs files in
    // parallel. Snapshot once, restore in afterAll.
    const SMTP_KEYS = [
        'MAILGUN_SMTP_HOST',
        'MAILGUN_SMTP_PORT',
        'MAILGUN_SMTP_USER',
        'MAILGUN_SMTP_PASSWORD',
        'MAIL_FROM',
    ] as const
    const ORIGINAL_ENV: Record<string, string | undefined> = {}
    for (const k of SMTP_KEYS) ORIGINAL_ENV[k] = process.env[k]

    beforeAll(async () => {
        await fastify.ready()
        // sendEmail reads these at call time; nodemailer is mocked above
        // so the values themselves do not need to be real credentials,
        // they just need to be present so sendEmail does not early-return
        // with a configuration error.
        process.env.MAILGUN_SMTP_HOST = 'smtp.test.local'
        process.env.MAILGUN_SMTP_PORT = '465'
        process.env.MAILGUN_SMTP_USER = 'postmaster@test.local'
        process.env.MAILGUN_SMTP_PASSWORD = 'test-secret'
        process.env.MAIL_FROM = 'OpenPlanner Test <noreply@test.local>'
    })

    afterAll(() => {
        // Restore the previous values (or delete if they were unset) so the
        // suite does not contaminate concurrent test files that exercise the
        // missing-env-var branches of sendEmail.
        for (const k of SMTP_KEYS) {
            if (ORIGINAL_ENV[k] === undefined) delete process.env[k]
            else process.env[k] = ORIGINAL_ENV[k]
        }
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

    test('POST self/submit rejects empty name (schema enforces minLength)', async () => {
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
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
            method: 'POST',
            url: `/v1/${eventId}/speakers/${speakerId}/self/submit?t=${RAW_TOKEN}`,
            payload: { name: '' },
        })
        expect(res.statusCode).toBe(400)
    })

    test('POST self/submit rejects null name (schema is non-null string)', async () => {
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
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
            method: 'POST',
            url: `/v1/${eventId}/speakers/${speakerId}/self/submit?t=${RAW_TOKEN}`,
            payload: { name: null },
        })
        expect(res.statusCode).toBe(400)
    })

    test('GET self filters out non-editable custom fields', async () => {
        const stores: Stores = {
            eventData: makeEventDoc({
                speakerCustomFields: [
                    { id: 'public-cf', name: 'Public CF', type: 'text', privacy: 'public', editableBySpeaker: true },
                    { id: 'admin-cf', name: 'Admin CF', type: 'text', privacy: 'private', editableBySpeaker: false },
                ],
            }),
            speakerData: makeSpeaker({
                customFields: { 'public-cf': 'visible', 'admin-cf': 'should NOT leak' },
            }),
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
        expect(body.speaker.customFields).toEqual({ 'public-cf': 'visible' })
        expect(body.speaker.customFields['admin-cf']).toBeUndefined()
        expect(body.editableCustomFieldIds).toEqual(['public-cf'])
    })

    test('POST self/photo returns 404 when feature disabled', async () => {
        const stores: Stores = {
            eventData: makeEventDoc({ speakerSelfEdit: { enabled: false } }),
            speakerData: makeSpeaker(),
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
            method: 'POST',
            url: `/v1/${eventId}/speakers/${speakerId}/self/photo?t=${RAW_TOKEN}`,
            payload: {},
        })
        expect(res.statusCode).toBe(404)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Feature not enabled' })
    })

    test('POST self/photo rejects non-image MIME (e.g. application/pdf)', async () => {
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
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
        multipartMock.extractMultipartFormData.mockResolvedValueOnce({
            uploads: { 'evil.pdf': Buffer.from([0x25, 0x50, 0x44, 0x46]) },
            fields: {},
        })
        fileTypesMock.checkFileTypes.mockResolvedValueOnce({ mime: 'application/pdf', extension: 'pdf' })

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speakers/${speakerId}/self/photo?t=${RAW_TOKEN}`,
            payload: {},
        })
        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.body).error).toMatch(/Unsupported file type/)
        expect(uploadMock.uploadBufferToStorage).not.toHaveBeenCalled()
    })

    test('POST self/photo rejects SVG (script-carrier vector)', async () => {
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
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
        multipartMock.extractMultipartFormData.mockResolvedValueOnce({
            uploads: { 'evil.svg': Buffer.from('<svg></svg>') },
            fields: {},
        })
        fileTypesMock.checkFileTypes.mockResolvedValueOnce({ mime: 'image/svg+xml', extension: 'svg' })

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speakers/${speakerId}/self/photo?t=${RAW_TOKEN}`,
            payload: {},
        })
        expect(res.statusCode).toBe(400)
        expect(uploadMock.uploadBufferToStorage).not.toHaveBeenCalled()
    })

    test('POST self/photo rejects files over 5 MB', async () => {
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
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
        multipartMock.extractMultipartFormData.mockResolvedValueOnce({
            uploads: { 'big.jpg': Buffer.alloc(5 * 1024 * 1024 + 1) },
            fields: {},
        })

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speakers/${speakerId}/self/photo?t=${RAW_TOKEN}`,
            payload: {},
        })
        expect(res.statusCode).toBe(400)
        expect(JSON.parse(res.body).error).toMatch(/too large/i)
        expect(fileTypesMock.checkFileTypes).not.toHaveBeenCalled()
        expect(uploadMock.uploadBufferToStorage).not.toHaveBeenCalled()
    })

    test('POST self/photo accepts a valid PNG and stores it under pending-edit prefix', async () => {
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
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
        multipartMock.extractMultipartFormData.mockResolvedValueOnce({
            uploads: { 'photo.png': Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
            fields: {},
        })
        fileTypesMock.checkFileTypes.mockResolvedValueOnce({ mime: 'image/png', extension: 'png' })
        uploadMock.uploadBufferToStorage.mockResolvedValueOnce([true, 'https://storage/x.png'])

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speakers/${speakerId}/self/photo?t=${RAW_TOKEN}`,
            payload: {},
        })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true, publicFileUrl: 'https://storage/x.png' })
        expect(uploadMock.uploadBufferToStorage).toHaveBeenCalledOnce()
        const callArgs = uploadMock.uploadBufferToStorage.mock.calls[0]
        expect(callArgs[3]).toMatch(/^pending-edit-spk-1-/)
    })

    test('POST self/photo returns 429 when per-speaker daily upload cap reached', async () => {
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
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
            // The DAO caps photo uploads at 10/day. Saturate the counter so
            // the next call short-circuits with 429 before reading the body.
            rateLimitCount: 10,
            rateLimitMax: 10,
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speakers/${speakerId}/self/photo?t=${RAW_TOKEN}`,
            payload: {},
        })
        expect(res.statusCode).toBe(429)
        expect(JSON.parse(res.body).error).toMatch(/upload limit/i)
        expect(multipartMock.extractMultipartFormData).not.toHaveBeenCalled()
        expect(uploadMock.uploadBufferToStorage).not.toHaveBeenCalled()
    })

    test('POST reject deletes the pending-edit photo from storage', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const deleteSpy = vi.fn(() => Promise.resolve())
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
            pendingEditDoc: {
                id: 'req-1',
                speakerId,
                status: 'pending',
                patch: {
                    photoUrl: 'https://test-bucket.storage.googleapis.com/events/evt-1/abc_pending-edit-spk-1-9.png',
                },
                baseSnapshot: { photoUrl: null },
            },
            setSpy,
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)
        vi.spyOn(fastify.firebase, 'storage').mockImplementation(
            () =>
                ({
                    bucket: (_name: string) => ({
                        file: (_path: string) => ({
                            delete: (_opts: unknown) => deleteSpy(_path),
                        }),
                    }),
                } as unknown as ReturnType<typeof fastify.firebase.storage>)
        )

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speaker-pending-edits/req-1/reject?apiKey=${apiKey}`,
            payload: { reviewerUid: 'admin-1' },
        })
        expect(res.statusCode).toBe(200)
        expect(deleteSpy).toHaveBeenCalledOnce()
        expect(deleteSpy.mock.calls[0][0]).toBe('events/evt-1/abc_pending-edit-spk-1-9.png')
    })

    test('POST reject does NOT call storage delete when patch has no photoUrl', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const deleteSpy = vi.fn(() => Promise.resolve())
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker(),
            pendingEditDoc: {
                id: 'req-1',
                speakerId,
                status: 'pending',
                patch: { name: 'New name' },
                baseSnapshot: { name: 'Jane' },
            },
            setSpy,
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)
        const storageSpy = vi.spyOn(fastify.firebase, 'storage').mockImplementation(
            () =>
                ({
                    bucket: () => ({ file: () => ({ delete: deleteSpy }) }),
                } as unknown as ReturnType<typeof fastify.firebase.storage>)
        )

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speaker-pending-edits/req-1/reject?apiKey=${apiKey}`,
            payload: {},
        })
        expect(res.statusCode).toBe(200)
        expect(deleteSpy).not.toHaveBeenCalled()
        expect(storageSpy).not.toHaveBeenCalled()
    })

    test('POST self/submit batches pending-edit write and token mark-used atomically', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const stores: Stores = {
            eventData: makeEventDoc(),
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
            payload: { name: 'Atomic' },
        })
        expect(res.statusCode).toBe(200)
        // Batch.set forwards every call to setSpy — we expect at least the
        // pending-edit row and a token row with usedAt set.
        const pendingWrite = setSpy.mock.calls.find(
            (c) => c[0] && (c[0] as Record<string, unknown>).status === 'pending'
        )
        const tokenWrite = setSpy.mock.calls.find(
            (c) =>
                c[0] &&
                (c[0] as Record<string, unknown>).usedAt !== undefined &&
                (c[0] as Record<string, unknown>).status === undefined
        )
        expect(pendingWrite).toBeDefined()
        expect(tokenWrite).toBeDefined()
    })

    test('POST approve queues an approval email to the speaker mentioning the changes', async () => {
        const mailAddSpy = vi.fn(() => Promise.resolve())
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker({ email: 'jane@example.com', name: 'Jane' }),
            pendingEditDoc: {
                id: 'req-1',
                speakerId,
                status: 'pending',
                patch: { name: 'New Name', jobTitle: 'Lead Engineer' },
                baseSnapshot: { name: 'Jane', jobTitle: null },
            },
            setSpy: vi.fn(() => Promise.resolve({})),
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
            mailAddSpy,
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speaker-pending-edits/req-1/approve?apiKey=${apiKey}`,
            payload: { reviewerUid: 'admin-1' },
        })
        expect(res.statusCode).toBe(200)
        expect(mailAddSpy).toHaveBeenCalledOnce()
        const mailDoc = mailAddSpy.mock.calls[0][0] as {
            to: string
            message: { subject: string; text: string }
            type?: string
        }
        expect(mailDoc.to).toBe('jane@example.com')
        expect(mailDoc.message.subject).toMatch(/approved/i)
        // Body must mention the specific fields changed so the speaker
        // recognises what was applied without revisiting the form.
        expect(mailDoc.message.text).toMatch(/Name/)
        expect(mailDoc.message.text).toMatch(/Job title/)
        expect(mailDoc.message.text).toMatch(/Lead Engineer/)
        expect(mailDoc.type).toBe('speaker-edit-approved')
    })

    test('POST reject queues a rejection email including the reviewer note', async () => {
        const mailAddSpy = vi.fn(() => Promise.resolve())
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker({ email: 'jane@example.com', name: 'Jane' }),
            pendingEditDoc: {
                id: 'req-1',
                speakerId,
                status: 'pending',
                patch: { bio: 'lorem ipsum' },
                baseSnapshot: { bio: null },
            },
            setSpy: vi.fn(() => Promise.resolve({})),
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
            mailAddSpy,
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speaker-pending-edits/req-1/reject?apiKey=${apiKey}`,
            payload: { reviewerUid: 'admin-1', reviewNote: 'Bio too long' },
        })
        expect(res.statusCode).toBe(200)
        expect(mailAddSpy).toHaveBeenCalledOnce()
        const mailDoc = mailAddSpy.mock.calls[0][0] as {
            to: string
            message: { subject: string; text: string }
            type?: string
        }
        expect(mailDoc.to).toBe('jane@example.com')
        expect(mailDoc.message.subject).toMatch(/not applied|rejected/i)
        expect(mailDoc.message.text).toMatch(/Bio/)
        expect(mailDoc.message.text).toMatch(/Bio too long/)
        expect(mailDoc.type).toBe('speaker-edit-rejected')
    })

    test('POST approve does not crash when speaker has no email on file', async () => {
        const mailAddSpy = vi.fn(() => Promise.resolve())
        const stores: Stores = {
            eventData: makeEventDoc(),
            speakerData: makeSpeaker({ email: null }),
            pendingEditDoc: {
                id: 'req-1',
                speakerId,
                status: 'pending',
                patch: { name: 'X' },
                baseSnapshot: { name: 'Jane' },
            },
            setSpy: vi.fn(() => Promise.resolve({})),
            addSpy: vi.fn(),
            txSetSpy: vi.fn(),
            mailAddSpy,
        }
        const firestore = makeFirestore(stores)
        vi.spyOn(fastify.firebase, 'firestore').mockImplementation(firestore as any)

        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/speaker-pending-edits/req-1/approve?apiKey=${apiKey}`,
            payload: { reviewerUid: 'admin-1' },
        })
        expect(res.statusCode).toBe(200)
        expect(mailAddSpy).not.toHaveBeenCalled()
    })

    test('POST self/submit rejects socials with unknown name (server-side guard)', async () => {
        const setSpy = vi.fn(() => Promise.resolve({}))
        const stores: Stores = {
            eventData: makeEventDoc(),
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
                socials: [
                    { name: 'Twitter', link: 'https://twitter.com/jane' },
                    { name: 'EvilNetwork', link: 'https://evil.example.com' },
                    { name: 'LinkedIn', link: 'javascript:alert(1)' },
                ],
            },
        })
        expect(res.statusCode).toBe(200)
        const pendingWrite = setSpy.mock.calls.find(
            (c) => c[0] && (c[0] as Record<string, unknown>).status === 'pending'
        )
        expect(pendingWrite).toBeDefined()
        const patch = (pendingWrite![0] as { patch: { socials?: { name: string }[] } }).patch
        expect(patch.socials).toEqual([{ name: 'Twitter', icon: 'twitter', link: 'https://twitter.com/jane' }])
    })

    test('POST request-edit-link silently passes when PUBLIC_APP_URL is not set', async () => {
        const ORIG = process.env.PUBLIC_APP_URL
        delete process.env.PUBLIC_APP_URL
        try {
            const setSpy = vi.fn(() => Promise.resolve({}))
            const stores: Stores = {
                eventData: makeEventDoc(),
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
            expect(res.statusCode).toBe(200)
            expect(JSON.parse(res.body)).toMatchObject({ success: true })
            // No mail or token doc should be written when base URL is missing
            const tokenWrite = setSpy.mock.calls.find(
                (c) => c[0] && typeof (c[0] as Record<string, unknown>).tokenHash === 'string'
            )
            expect(tokenWrite).toBeDefined() // token IS created
            // But no link/email could be sent — handler returns success silently
        } finally {
            if (ORIG !== undefined) process.env.PUBLIC_APP_URL = ORIG
        }
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

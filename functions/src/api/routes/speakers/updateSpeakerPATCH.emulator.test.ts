import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import fp from 'fastify-plugin'
import {
    clearFirestoreEmulator,
    getEmulatorApp,
    getSpeaker,
    seedEvent,
    seedSpeaker,
    setupEmulatorEnv,
} from '../../testUtils/emulator'

setupEmulatorEnv()

vi.mock('../../dao/firebasePlugin', async () => {
    const fbAdmin = (await import('firebase-admin')).default
    const projectId = process.env.GCLOUD_PROJECT || 'demo-openplanner-test'
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
    }
    process.env.GCLOUD_PROJECT = projectId
    const existing = fbAdmin.apps.find((a) => a?.name === 'emulator-test')
    const app = existing ?? fbAdmin.initializeApp({ projectId }, 'emulator-test')

    const setupFirebase = (fastify: any, _opts: any, next: () => void) => {
        if (!fastify.firebase) {
            fastify.decorate('firebase', app)
        }
        fastify.firebase = app
        next()
    }

    return {
        setupFirebase,
        firebasePlugin: fp(setupFirebase, { name: 'fastify-firebase' }),
        getStorageBucketName: () => 'test-bucket',
    }
})

const eventId = 'evt-patch-speaker'
const speakerId = 'spk-1'
const apiKey = 'test-api-key'

let fastify: any

beforeAll(async () => {
    const { setupFastify } = await import('../../setupFastify')
    fastify = setupFastify()
    await fastify.ready()
})

beforeEach(async () => {
    await clearFirestoreEmulator()
    await seedEvent(eventId, { name: 'Test Event', apiKey })
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('PATCH /v1/:eventId/speakers/:speakerId', () => {
    test('returns 401 when apiKey is missing', async () => {
        await seedSpeaker(eventId, speakerId, { name: 'Original' })

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/${speakerId}`,
            payload: { name: 'New name' },
        })

        expect(res.statusCode).toBe(401)
    })

    test('returns 404 when speaker does not exist', async () => {
        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/missing-speaker?apiKey=${apiKey}`,
            payload: { name: 'New name' },
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Speaker not found')
    })

    test('returns 400 on invalid body type', async () => {
        await seedSpeaker(eventId, speakerId, { name: 'Original' })

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
            payload: { socials: 'not-an-array' },
        })

        expect(res.statusCode).toBe(400)
    })

    test('updates only the provided fields and preserves others', async () => {
        await seedSpeaker(eventId, speakerId, {
            name: 'Original',
            bio: 'Untouched bio',
            email: 'orig@example.com',
        })

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
            payload: { name: 'Renamed' },
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true })

        const updated = await getSpeaker(eventId, speakerId)
        expect(updated).toMatchObject({
            id: speakerId,
            name: 'Renamed',
            bio: 'Untouched bio',
            email: 'orig@example.com',
        })
        expect(updated?.updatedAt).toBeDefined()
    })

    test('deep-merges customFields with existing values', async () => {
        await seedSpeaker(eventId, speakerId, {
            name: 'Speaker',
            customFields: {
                shirtSize: 'M',
                vegetarian: true,
                hasContract: false,
            },
        })

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
            payload: {
                customFields: {
                    shirtSize: 'L',
                    hasContract: true,
                },
            },
        })

        expect(res.statusCode).toBe(200)

        const updated = await getSpeaker(eventId, speakerId)
        expect(updated?.customFields).toEqual({
            shirtSize: 'L',
            vegetarian: true,
            hasContract: true,
        })
    })

    test('socials icon is auto-derived from name when omitted', async () => {
        await seedSpeaker(eventId, speakerId, { name: 'Speaker' })

        const res = await fastify.inject({
            method: 'PATCH',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
            payload: {
                socials: [{ name: 'Twitter', link: 'https://twitter.com/foo' }],
            },
        })

        expect(res.statusCode).toBe(200)
        const updated = await getSpeaker(eventId, speakerId)
        expect(updated?.socials).toEqual([{ name: 'Twitter', icon: 'twitter', link: 'https://twitter.com/foo' }])
    })

    test('seed/get helpers round-trip via the emulator', async () => {
        // Sanity check the emulator wiring itself.
        const app = getEmulatorApp()
        await app.firestore().doc(`events/${eventId}/speakers/extra`).set({ id: 'extra', name: 'X' })
        const back = await getSpeaker(eventId, 'extra')
        expect(back).toMatchObject({ id: 'extra', name: 'X' })
    })
})

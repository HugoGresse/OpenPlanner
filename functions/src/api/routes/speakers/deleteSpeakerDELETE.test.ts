import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { SpeakerDao } from '../../dao/speakerDao'

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
const apiKey = 'test-key'

describe('DELETE /v1/:eventId/speakers/:speakerId', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({
            method: 'DELETE',
            url: `/v1/${eventId}/speakers/${speakerId}`,
        })
        expect(res.statusCode).toBe(401)
        expect(JSON.parse(res.body)).toMatchObject({ error: 'Unauthorized! Du balai !' })
    })

    test('returns 404 when speaker does not exist', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(SpeakerDao, 'deleteSpeaker').mockRejectedValue(new Error('Speaker not found'))

        const res = await fastify.inject({
            method: 'DELETE',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(404)
        expect(res.body).toContain('Speaker not found')
    })

    test('calls deleteSpeaker with correct args and returns 200', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const deleteSpy = vi.spyOn(SpeakerDao, 'deleteSpeaker').mockResolvedValue(undefined)

        const res = await fastify.inject({
            method: 'DELETE',
            url: `/v1/${eventId}/speakers/${speakerId}?apiKey=${apiKey}`,
        })

        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toMatchObject({ success: true })
        expect(deleteSpy).toHaveBeenCalledWith(fastify.firebase, eventId, speakerId)
    })
})

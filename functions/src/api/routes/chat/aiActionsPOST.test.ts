import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { Event } from '../../../types'
import { AiActionDao } from '../../dao/aiActionDao'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

const eventId = 'evt-1'
const apiKey = 'xxx'
const url = `/v1/${eventId}/ai-actions?apiKey=${apiKey}`

const mockEventLookup = (fastify: any) => {
    vi.spyOn(fastify.firebase, 'firestore').mockImplementation(() =>
        getMockedFirestore({ id: eventId, apiKey } as Partial<Event>)
    )
}

describe('POST /v1/:eventId/ai-actions', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 without apiKey', async () => {
        const res = await fastify.inject({
            method: 'POST',
            url: `/v1/${eventId}/ai-actions`,
            payload: {
                tool: 'patchSpeaker',
                target: { id: 'sp1' },
                args: {},
                diff: { before: {}, after: {} },
                applied: false,
            },
        })
        expect(res.statusCode).toBe(401)
    })

    test('returns 400 on body validation error', async () => {
        mockEventLookup(fastify)
        const res = await fastify.inject({ method: 'POST', url, payload: { tool: 'patchSpeaker' } })
        expect(res.statusCode).toBe(400)
    })

    test('records action via AiActionDao on happy path', async () => {
        mockEventLookup(fastify)
        const addSpy = vi.spyOn(AiActionDao, 'addAction').mockResolvedValue('action-id-1')

        const payload = {
            tool: 'patchSpeaker',
            target: { id: 'sp1', label: 'Alice' },
            args: { name: 'Alice 2' },
            diff: { before: { name: 'Alice' }, after: { name: 'Alice 2' } },
            summary: 'Rename',
            prompt: 'Rename Alice',
            model: 'anthropic/claude-sonnet-4',
            applied: true,
        }
        const res = await fastify.inject({ method: 'POST', url, payload })

        expect(res.statusCode).toBe(201)
        expect(JSON.parse(res.body)).toMatchObject({ id: 'action-id-1' })
        expect(addSpy).toHaveBeenCalledWith(fastify.firebase, eventId, payload)
    })
})

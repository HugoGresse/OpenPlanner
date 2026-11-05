import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { TeamDao } from '../../dao/teamDao'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

const eventId = 'evt-1'
const apiKey = 'test-key'

describe('GET /v1/:eventId/team', () => {
    const fastify = setupFastify()

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({ method: 'GET', url: `/v1/${eventId}/team` })
        expect(res.statusCode).toBe(401)
    })

    test('returns members flat and grouped by team', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const member = { id: 'ada', name: 'Ada', team: 'core', bio: null, socials: [] }
        vi.spyOn(TeamDao, 'getTeams').mockResolvedValue({
            team: [member],
            teams: [{ id: 'core', order: 0, members: [member] }],
        } as any)

        const res = await fastify.inject({ method: 'GET', url: `/v1/${eventId}/team?apiKey=${apiKey}` })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toEqual({
            team: [member],
            teams: [{ id: 'core', order: 0, members: [member] }],
        })
    })
})

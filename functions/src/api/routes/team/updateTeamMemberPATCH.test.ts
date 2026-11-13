import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { NotFoundError } from '../../other/Errors'
import { TeamDao } from '../../dao/teamDao'
import { toTeamMemberPatch } from './updateTeamMemberPATCH'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

const eventId = 'evt-1'
const apiKey = 'test-key'

test('toTeamMemberPatch only adds social icons when socials are patched', () => {
    expect(toTeamMemberPatch({ role: 'Lead' })).toEqual({ role: 'Lead' })
    expect(toTeamMemberPatch({ socials: [{ name: 'GitHub', link: 'https://github.com/ada' }] })).toEqual({
        socials: [{ name: 'GitHub', icon: 'github', link: 'https://github.com/ada' }],
    })
})

describe('PATCH /v1/:eventId/team/:memberId', () => {
    const fastify = setupFastify()
    const patch = (payload: object, memberId = 'ada') =>
        fastify.inject({ method: 'PATCH', url: `/v1/${eventId}/team/${memberId}?apiKey=${apiKey}`, payload })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({ method: 'PATCH', url: `/v1/${eventId}/team/ada`, payload: { role: 'x' } })
        expect(res.statusCode).toBe(401)
    })

    test('rejects unknown fields, an id change, an empty patch and a blank name', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const updateSpy = vi.spyOn(TeamDao, 'updateMember').mockResolvedValue(undefined)
        expect((await patch({ nickname: 'x' })).statusCode).toBe(400)
        expect((await patch({ id: 'grace' })).statusCode).toBe(400)
        expect((await patch({})).statusCode).toBe(400)
        expect((await patch({ name: '' })).statusCode).toBe(400)
        expect(updateSpy).not.toHaveBeenCalled()
    })

    test('returns 404 for an unknown member', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(TeamDao, 'updateMember').mockRejectedValue(new NotFoundError('Team member not found'))
        const res = await patch({ role: 'Lead' }, 'nope')
        expect(res.statusCode).toBe(404)
        expect(res.body).toBe('Team member not found: nope')
    })

    test('updates only the given fields', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const updateSpy = vi.spyOn(TeamDao, 'updateMember').mockResolvedValue(undefined)
        const res = await patch({ role: 'Lead', bio: null })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.body)).toEqual({ success: true })
        expect(updateSpy).toHaveBeenCalledWith(fastify.firebase, eventId, 'ada', { role: 'Lead', bio: null })
    })
})

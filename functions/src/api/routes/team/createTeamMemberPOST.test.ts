import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { TeamDao } from '../../dao/teamDao'
import { toTeamMember } from './createTeamMemberPOST'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

const eventId = 'evt-1'
const apiKey = 'test-key'

test('toTeamMember fills the admin defaults and slugifies the name into the id', () => {
    expect(
        toTeamMember({ name: 'Ada Lovelace', socials: [{ name: 'GitHub', link: 'https://github.com/ada' }] })
    ).toEqual({
        id: 'ada-lovelace',
        name: 'Ada Lovelace',
        bio: null,
        role: '',
        team: 'default',
        order: 0,
        teamOrder: 0,
        photoUrl: null,
        socials: [{ name: 'GitHub', icon: 'github', link: 'https://github.com/ada' }],
    })
    expect(toTeamMember({ id: 'custom', name: 'Ada', team: 'core', order: 2 })).toMatchObject({
        id: 'custom',
        team: 'core',
        order: 2,
    })
})

describe('POST /v1/:eventId/team', () => {
    const fastify = setupFastify()

    const post = (payload: object) =>
        fastify.inject({ method: 'POST', url: `/v1/${eventId}/team?apiKey=${apiKey}`, payload })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({ method: 'POST', url: `/v1/${eventId}/team`, payload: { name: 'A' } })
        expect(res.statusCode).toBe(401)
    })

    test('rejects unknown fields, a missing name and a name without id material', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        expect((await post({ name: 'A', nickname: 'x' })).statusCode).toBe(400)
        expect((await post({ role: 'Organizer' })).statusCode).toBe(400)
        const res = await post({ name: '???' })
        expect(res.statusCode).toBe(400)
        expect(res.body).toContain('empty id')
    })

    test('returns 409 when the member already exists', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(TeamDao, 'getMember').mockResolvedValue({ id: 'ada' } as any)
        const res = await post({ name: 'Ada' })
        expect(res.statusCode).toBe(409)
        expect(res.body).toContain('ada')
    })

    test('creates the member and returns its id', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(TeamDao, 'getMember').mockResolvedValue(null)
        const createSpy = vi.spyOn(TeamDao, 'createMember').mockResolvedValue(undefined)

        const res = await post({ name: 'Ada Lovelace', role: 'Organizer', team: 'core' })
        expect(res.statusCode).toBe(201)
        expect(JSON.parse(res.body)).toEqual({ id: 'ada-lovelace' })
        expect(createSpy).toHaveBeenCalledWith(
            fastify.firebase,
            eventId,
            expect.objectContaining({ id: 'ada-lovelace', role: 'Organizer', team: 'core' })
        )
    })
})

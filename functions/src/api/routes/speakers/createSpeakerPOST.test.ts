import { afterEach, describe, expect, test, vi } from 'vitest'
import { setupFastify } from '../../setupFastify'
import { getMockedFirestore } from '../../testUtils/mockedFirestore'
import { SpeakerDao } from '../../dao/speakerDao'

vi.mock('../../dao/firebasePlugin', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../../dao/firebasePlugin')>()
    return {
        ...mod,
        setupFirebase: vi.fn().mockImplementation((_fastify, _options, next) => next()),
    }
})

const eventId = 'evt-1'
const apiKey = 'test-key'

describe('POST /v1/:eventId/speakers', () => {
    const fastify = setupFastify()

    const post = (payload: object) =>
        fastify.inject({ method: 'POST', url: `/v1/${eventId}/speakers?apiKey=${apiKey}`, payload })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('returns 401 if apiKey is missing', async () => {
        const res = await fastify.inject({ method: 'POST', url: `/v1/${eventId}/speakers`, payload: { name: 'A' } })
        expect(res.statusCode).toBe(401)
    })

    test('rejects unknown fields (naming them), a missing name and a blank name', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const typo = await post({ name: 'A', compnay: 'X' })
        expect(typo.statusCode).toBe(400)
        expect(JSON.parse(typo.body).reason).toBe('Error: body must NOT have additional properties: compnay')
        expect(
            (await post({ name: 'A', socials: [{ name: 'X', link: 'https://x.com/a', url: 'y' }] })).statusCode
        ).toBe(400)
        expect((await post({ company: 'X' })).statusCode).toBe(400)
        expect((await post({ name: ' ' })).body).toBe('name must not be blank')
    })

    test('returns 409 when the id already exists', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        vi.spyOn(SpeakerDao, 'createSpeaker').mockRejectedValue(Object.assign(new Error('exists'), { code: 6 }))
        const res = await post({ id: 'spk-1', name: 'A' })
        expect(res.statusCode).toBe(409)
        expect(res.body).toBe('Speaker already exists: spk-1')
    })

    test('creates the speaker, keeps explicit nulls and fills social icons in', async () => {
        vi.spyOn(fastify.firebase, 'firestore').mockReturnValue(getMockedFirestore({ id: eventId, apiKey }))
        const createSpy = vi.spyOn(SpeakerDao, 'createSpeaker').mockResolvedValue(undefined)

        const res = await post({
            name: 'Ada',
            company: 'AE',
            bio: null,
            socials: [{ name: 'Blue Sky App', link: 'https://b.sky/ada' }],
        })
        expect(res.statusCode).toBe(201)
        const { id } = JSON.parse(res.body)
        expect(id).toMatch(/^[0-9a-f-]{36}$/)
        expect(createSpy).toHaveBeenCalledWith(fastify.firebase, eventId, {
            id,
            name: 'Ada',
            company: 'AE',
            bio: null,
            socials: [{ name: 'Blue Sky App', icon: 'blue-sky-app', link: 'https://b.sky/ada' }],
        })
    })
})

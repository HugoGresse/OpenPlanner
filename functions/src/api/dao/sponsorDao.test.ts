import firebase from 'firebase-admin'
import { describe, expect, test, vi } from 'vitest'
import { SponsorDao } from './sponsorDao'

describe('SponsorDao.addSponsor', () => {
    test('stores an omitted website as null (Firestore rejects undefined in arrayUnion)', async () => {
        const update = vi.fn().mockResolvedValue(undefined)
        const doc = { get: vi.fn().mockResolvedValue({ data: () => ({ name: 'Gold' }) }), update, set: vi.fn() }
        const app = { firestore: () => ({ collection: () => ({ doc: () => doc }) }) } as unknown as firebase.app.App

        await SponsorDao.addSponsor(app, 'evt', { name: 'Initech', categoryId: 'gold', categoryName: 'Gold' })

        const [element] = (update.mock.calls[0][0].sponsors as { elements: object[] }).elements
        expect(element).toMatchObject({ name: 'Initech', logoUrl: '', website: null })
    })
})

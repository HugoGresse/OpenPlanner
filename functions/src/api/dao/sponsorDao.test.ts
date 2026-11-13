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

describe('SponsorDao single-category lookups', () => {
    const gold = { name: 'Gold', sponsors: [{ id: 'acme', name: 'ACME' }] }
    const silver = { name: 'Silver', sponsors: [{ id: 'globex', name: 'Globex' }] }
    const docs: Record<string, object> = { gold, silver }

    const fakeApp = () => {
        const docGet = vi.fn(async (id: string) => ({ id, exists: id in docs, data: () => docs[id] }))
        const collectionGet = vi.fn(async () => ({
            docs: Object.entries(docs).map(([id, data]) => ({ id, data: () => data })),
        }))
        const collection = () => ({ doc: (id: string) => ({ get: () => docGet(id) }), get: collectionGet })
        return { app: { firestore: () => ({ collection }) } as unknown as firebase.app.App, docGet, collectionGet }
    }

    test('getCategory reads one document and returns null when it is missing', async () => {
        const { app, collectionGet } = fakeApp()
        expect(await SponsorDao.getCategory(app, 'evt', 'gold')).toEqual({ id: 'gold', ...gold })
        expect(await SponsorDao.getCategory(app, 'evt', 'nope')).toBeNull()
        expect(collectionGet).not.toHaveBeenCalled()
    })

    test('findCategoryOfSponsor trusts a correct hint and scans only without one or when it is wrong', async () => {
        const hinted = fakeApp()
        expect(await SponsorDao.findCategoryOfSponsor(hinted.app, 'evt', 'acme', 'gold')).toMatchObject({ id: 'gold' })
        expect(hinted.collectionGet).not.toHaveBeenCalled()

        const wrongHint = fakeApp()
        expect(await SponsorDao.findCategoryOfSponsor(wrongHint.app, 'evt', 'globex', 'gold')).toMatchObject({
            id: 'silver',
        })
        expect(wrongHint.collectionGet).toHaveBeenCalledTimes(1)

        const noHint = fakeApp()
        expect(await SponsorDao.findCategoryOfSponsor(noHint.app, 'evt', 'ghost')).toBeNull()
        expect(noHint.docGet).not.toHaveBeenCalled()
    })
})

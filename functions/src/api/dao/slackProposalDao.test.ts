import firebase from 'firebase-admin'
import { describe, expect, test } from 'vitest'
import { SlackProposalDao } from './slackProposalDao'

describe('SlackProposalDao.listBatch', () => {
    test('returns the records in emission order, not in document-id order', async () => {
        // Firestore orders by document id: 1, 10, 11, 2…
        const ids = ['200-1-1', '200-1-10', '200-1-11', '200-1-2', '200-1-3']
        const docs = ids.map((id) => ({ data: () => ({ id, batchId: '200.1' }) }))
        const query = { where: () => query, get: async () => ({ docs }) }
        const app = { firestore: () => ({ collection: () => query }) } as unknown as firebase.app.App

        const records = await SlackProposalDao.listBatch(app, 'evt', '200.1')
        expect(records.map((record) => record.id)).toEqual(['200-1-1', '200-1-2', '200-1-3', '200-1-10', '200-1-11'])
    })
})

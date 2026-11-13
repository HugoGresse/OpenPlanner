import firebase from 'firebase-admin'
import { describe, expect, test, vi } from 'vitest'
import { FaqDao } from './faqDao'

const categories: Record<string, { name: string; items: Record<string, object> }> = {
    venue: { name: 'Venue', items: { q1: { question: 'Where?', answer: 'Paris', order: 0 } } },
    speakers: { name: 'Speakers', items: { q2: { question: 'Hotel?', answer: 'X', order: 0 } } },
}

const fakeApp = () => {
    const itemsRead = vi.fn()
    const fullCategoriesRead = vi.fn()
    const categoryRef = (id: string) => ({
        collection: () => ({ doc: (questionId: string) => ({ categoryId: id, questionId }) }),
    })
    const firestore = {
        collection: (path: string) => {
            const itemsOf = path.match(/faq\/([^/]+)\/items$/)?.[1]
            if (itemsOf) {
                return {
                    get: async () => {
                        itemsRead(itemsOf)
                        const items = categories[itemsOf]?.items ?? {}
                        return { docs: Object.entries(items).map(([id, data]) => ({ id, data: () => data })) }
                    },
                }
            }
            return {
                doc: (id: string) => ({
                    get: async () => ({ id, exists: id in categories, data: () => ({ name: categories[id]?.name }) }),
                }),
                get: async () => fullCategoriesRead(),
                select: () => ({
                    get: async () => {
                        const docs = Object.keys(categories).map((id) => ({ id, ref: categoryRef(id) }))
                        return { empty: docs.length === 0, docs }
                    },
                }),
            }
        },
        getAll: async (...refs: Array<{ categoryId: string; questionId: string }>) =>
            refs.map((ref) => ({ exists: ref.questionId in categories[ref.categoryId].items })),
    }
    return { app: { firestore: () => firestore } as unknown as firebase.app.App, itemsRead, fullCategoriesRead }
}

describe('FaqDao single-category lookups', () => {
    test('getFaqCategory returns the category with its own questions only', async () => {
        const { app, itemsRead, fullCategoriesRead } = fakeApp()
        const category = await FaqDao.getFaqCategory(app, 'evt', 'venue')
        expect(category).toMatchObject({ id: 'venue', name: 'Venue', items: [{ id: 'q1', question: 'Where?' }] })
        expect(itemsRead.mock.calls).toEqual([['venue']])
        expect(fullCategoriesRead).not.toHaveBeenCalled()
        expect(await FaqDao.getFaqCategory(app, 'evt', 'nope')).toBeNull()
    })

    test('findFaqQuestionCategoryId locates a question without reading any question list', async () => {
        const { app, itemsRead } = fakeApp()
        expect(await FaqDao.findFaqQuestionCategoryId(app, 'evt', 'q2')).toBe('speakers')
        expect(await FaqDao.findFaqQuestionCategoryId(app, 'evt', 'ghost')).toBeNull()
        expect(itemsRead).not.toHaveBeenCalled()
    })
})

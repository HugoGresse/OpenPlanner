import firebase from 'firebase-admin'
import { v4 as uuidv4 } from 'uuid'
import { FaqCategoryType, FaqType } from '../faq/faq'
import { NotFoundError } from '../other/Errors'

const { FieldValue } = firebase.firestore

export class FaqDao {
    public static async addFaqQuestion(firebaseApp: firebase.app.App, eventId: string, faq: FaqType): Promise<any> {
        const db = firebaseApp.firestore()

        // 1. Check if the category is not created
        const categorySnapshot = await db.collection(`events/${eventId}/faq`).doc(faq.categoryId).get()
        const categoryData = categorySnapshot.data()
        if (!categoryData) {
            // Create category on the fly
            await db.collection(`events/${eventId}/faq`).doc(faq.categoryId).set({
                name: faq.categoryName,
                order: faq.categoryOrder,
            })
        }

        const faqId = faq.id || uuidv4()

        await db.collection(`events/${eventId}/faq/`).doc(faq.categoryId).collection('items').doc(faqId).set(
            {
                id: faqId,
                question: faq.question,
                answer: faq.answer,
                order: faq.order,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        )

        return faqId
    }

    public static async getFaqPrivateCategory(
        firebaseApp: firebase.app.App,
        eventId: string,
        privateId?: string
    ): Promise<FaqCategoryType[]> {
        const db = firebaseApp.firestore()

        let query = db.collection(`events/${eventId}/faq/`).where('share', '==', true)

        if (privateId) {
            query = query.where('privateId', '==', privateId).limit(1)
        } else {
            query = query.where('private', '==', false)
        }

        const snapshot = await query.get()

        if (!snapshot.size) {
            throw new NotFoundError('FAQ category not found')
        }

        return snapshot.docs.map((doc) => {
            return {
                id: doc.id,
                ...doc.data(),
            } as FaqCategoryType
        })
    }

    public static async getFaqQuestions(
        firebaseApp: firebase.app.App,
        eventId: string,
        faqId: string
    ): Promise<FaqType[]> {
        const db = firebaseApp.firestore()

        const snapshot = await db.collection(`events/${eventId}/faq/${faqId}/items`).get()

        if (!snapshot.size) {
            throw new NotFoundError('FAQ category does not exist or no items found')
        }

        return snapshot.docs.map(
            (doc) =>
                ({
                    ...doc.data(),
                    id: doc.id,
                } as FaqType)
        )
    }
}

import firebase from 'firebase-admin'
import { v4 as uuidv4 } from 'uuid'
import { FaqType } from '../faq/faq'

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

        const faqId = uuidv4()

        await db.collection(`events/${eventId}/faq/`).doc(faq.categoryId).collection('items').add({
            question: faq.question,
            answer: faq.answer,
            order: faq.order,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        })

        return faqId
    }
}

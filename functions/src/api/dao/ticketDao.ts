import firebase from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

export interface TicketData {
    id: string
    name: string
    price: number
    currency: string
    url: string
    ticketsCount: number
    available: boolean
    soldOut: boolean
    highlighted: boolean
    displayNewsletterRegistration: boolean
    startDate: Timestamp | string | null
    endDate: Timestamp | string | null
    message: string
}

export class TicketDao {
    public static async getTickets(firebaseApp: firebase.app.App, eventId: string): Promise<TicketData[]> {
        const db = firebaseApp.firestore()
        const snapshot = await db.collection(`events/${eventId}/tickets`).get()
        return snapshot.docs.map((doc) => ({
            ...(doc.data() as TicketData),
            id: doc.id,
        }))
    }
}

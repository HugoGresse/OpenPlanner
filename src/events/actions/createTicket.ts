import { addDoc } from 'firebase/firestore'
import { collections } from '../../services/firebase'
import { Ticket } from '../../types'

export const createTicket = async (eventId: string, ticket: Omit<Ticket, 'id'>) => {
    const docRef = await addDoc(collections.tickets(eventId), ticket)
    return docRef.id
}

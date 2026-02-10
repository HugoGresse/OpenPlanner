import { doc, updateDoc } from 'firebase/firestore'
import { collections } from '../../services/firebase'
import { Ticket } from '../../types'

export const updateTicket = async (eventId: string, ticketId: string, ticket: Partial<Ticket>): Promise<void> => {
    const ref = doc(collections.tickets(eventId), ticketId)

    return await updateDoc(ref, {
        ...ticket,
    })
}

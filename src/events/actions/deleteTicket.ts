import { doc, deleteDoc } from 'firebase/firestore'
import { collections } from '../../services/firebase'

export const deleteTicket = async (eventId: string, ticketId: string): Promise<void> => {
    const ref = doc(collections.tickets(eventId), ticketId)
    await deleteDoc(ref)
}

import { doc } from '@firebase/firestore'
import { useFirestoreDocument, UseQueryResult } from './firestoreQueryHook'
import { Ticket } from '../../types'
import { collections } from '../firebase'

export const useTicket = (eventId: string, ticketId: string | null): UseQueryResult<Ticket> => {
    return useFirestoreDocument<Ticket>(ticketId ? doc(collections.tickets(eventId), ticketId) : (null as any), true)
}

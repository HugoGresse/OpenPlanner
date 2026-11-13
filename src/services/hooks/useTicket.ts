import { doc } from '@firebase/firestore'
import { useFirestoreDocument, UseQueryResult } from './firestoreQueryHook'
import { Ticket } from '../../types'
import { collections } from '../firebase'

export const useTicket = (eventId: string, ticketId: string | null): UseQueryResult<Ticket> => {
    const docRef = doc(collections.tickets(eventId), ticketId ?? '__no_ticket__')
    const result = useFirestoreDocument<Ticket>(docRef, !!ticketId)

    if (!ticketId) {
        return {
            ...result,
            data: null,
            isLoading: false,
            loaded: false,
        } as UseQueryResult<Ticket>
    }
    return result
}

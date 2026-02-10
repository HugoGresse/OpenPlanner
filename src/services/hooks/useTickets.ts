import { collections } from '../firebase'
import { query, orderBy } from '@firebase/firestore'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'
import { Ticket } from '../../types'

export const useTickets = (eventId: string): UseQueryResult<Ticket[]> => {
    return useFirestoreCollection<Ticket>(query(collections.tickets(eventId), orderBy('startDate', 'asc')), true)
}

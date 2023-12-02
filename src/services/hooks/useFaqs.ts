import { collections } from '../firebase'
import { Event, FaqCategory } from '../../types'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'
import { orderBy, query } from '@firebase/firestore'

export const useFaqs = (event: Event): UseQueryResult<FaqCategory[]> => {
    const eventId = event.id

    return useFirestoreCollection(query(collections.faq(eventId), orderBy('order')), true)
}

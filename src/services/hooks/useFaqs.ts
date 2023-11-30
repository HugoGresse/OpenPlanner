import { collections } from '../firebase'
import { Event, FaqCategory } from '../../types'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'

export const useFaqs = (event: Event): UseQueryResult<FaqCategory[]> => {
    const eventId = event.id

    return useFirestoreCollection(collections.faq(eventId), true)
}

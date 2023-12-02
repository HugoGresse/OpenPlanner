import { collections } from '../firebase'
import { Event, Faq } from '../../types'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'
import { collection, orderBy, query } from '@firebase/firestore'
import { faqItemConverter } from '../converters'

export const useFaq = (event: Event, categoryId: string): UseQueryResult<Faq[]> => {
    const eventId = event.id

    return useFirestoreCollection(
        query(collection(collections.faq(eventId), categoryId, 'items'), orderBy('order')).withConverter(
            faqItemConverter
        ),
        true
    )
}

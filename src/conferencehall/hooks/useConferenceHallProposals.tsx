import { DocumentData, query } from '@firebase/firestore'
import { conferenceHallCollections } from '../firebase/conferenceHallFirebase'
import { useFirestoreCollection, UseQueryResult } from '../../services/hooks/firestoreQueryHook'

export const useConferenceHallProposals = (eventId: string): UseQueryResult<DocumentData> => {
    return useFirestoreCollection(query(conferenceHallCollections.proposals(eventId)))
}

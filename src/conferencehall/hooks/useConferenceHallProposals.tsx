import { UseQueryResult } from 'react-query'
import { DocumentData, query } from '@firebase/firestore'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { conferenceHallCollections } from '../firebase/conferenceHallFirebase'

export const useConferenceHallProposals = (eventId: string): UseQueryResult<DocumentData> => {
    return useFirestoreQueryData(['ch-proposals', eventId], query(conferenceHallCollections.proposals(eventId)))
}

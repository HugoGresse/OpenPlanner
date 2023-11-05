import { collections } from '../firebase'
import { DocumentData, query } from '@firebase/firestore'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'
import { TeamMember } from '../../types'

export const useTeam = (eventId: string): UseQueryResult<DocumentData> => {
    return useFirestoreCollection<TeamMember>(query(collections.team(eventId)), true)
}

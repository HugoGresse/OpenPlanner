import { UseQueryResult } from 'react-query'
import { DocumentData, query, QueryConstraint } from '@firebase/firestore'
import { where } from 'firebase/firestore'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { conferenceHallCollections } from '../firebase/conferenceHallFirebase'

const ROLES = ['owner', 'member', 'reviewer']

export const useConferenceHallOrganization = (userId: string): UseQueryResult<DocumentData> => {
    const constraints: QueryConstraint[] = []

    constraints.push(where(`members.${userId}`, 'in', ROLES))

    return useFirestoreQueryData('ch-organizations', query(conferenceHallCollections.organizations, ...constraints))
}

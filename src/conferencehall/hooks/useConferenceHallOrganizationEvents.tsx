import { UseQueryResult } from 'react-query'
import { DocumentData, query, QueryConstraint } from '@firebase/firestore'
import { where } from 'firebase/firestore'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { conferenceHallCollections } from '../firebase/conferenceHallFirebase'

export const useConferenceHallOrganizationEvents = (orgId: string): UseQueryResult<DocumentData> => {
    const constraints: QueryConstraint[] = []

    constraints.push(where(`organization`, '==', orgId))

    return useFirestoreQueryData(
        'ch-organizations-events' + orgId,
        query(conferenceHallCollections.events, ...constraints)
    )
}

import { UseQueryResult } from 'react-query'
import { useFirestoreDocumentData } from '@react-query-firebase/firestore'
import { collections } from '../firebase'
import { doc } from 'firebase/firestore'
import { Speaker } from '../../types'
import { speakersKeys } from './queriesKeys'

export const useSpeaker = (eventId: string, speakerId: string): UseQueryResult<Speaker> => {
    return useFirestoreDocumentData(
        speakersKeys.single(eventId, speakerId),
        doc(collections.speakers(eventId), speakerId)
    )
}

import { UseQueryResult } from 'react-query'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { collections } from '../firebase'
import { DocumentData } from '@firebase/firestore'
import { useSpeakersMap } from './useSpeakersMap'

export const useSessions = (eventId: string): UseQueryResult<DocumentData> => {
    const sp = useSpeakersMap(eventId)

    const s = useFirestoreQueryData(['sessions', eventId], collections.sessions(eventId))

    if (!sp.isLoading && sp.data) {
        s.data = s.data?.map((session) => {
            return {
                ...session,
                speakersData: session.speakers.map((speakerId) => sp.data[speakerId]),
            }
        })
    }

    return {
        ...s,
    }
}

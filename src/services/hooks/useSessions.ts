import { UseQueryResult } from 'react-query'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { collections } from '../firebase'
import { DocumentData } from '@firebase/firestore'
import { useSpeakersMap } from './useSpeakersMap'
import { Event } from '../../types'

export const useSessions = (event: Event): UseQueryResult<DocumentData> => {
    const eventId = event.id
    const sp = useSpeakersMap(eventId)

    const s = useFirestoreQueryData(['sessions', eventId], collections.sessions(eventId))

    if (!sp.isLoading && sp.data) {
        s.data = s.data?.map((session) => {
            return {
                ...session,
                speakersData: session.speakers.map((speakerId) => sp.data[speakerId]),
                formatText: event.formats ? event.formats.find((f) => session.format === f.id)?.name : null,
                categoryObject: event.categories ? event.categories.find((c) => session.category === c.id) : null,
            }
        })
    }

    return {
        ...s,
    }
}

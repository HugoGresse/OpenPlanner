import { UseQueryResult } from 'react-query'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { collections } from '../firebase'
import { SpeakersMap, useSpeakersMap } from './useSpeakersMap'
import { Event, Session } from '../../types'
import { sessionsKeys } from './queriesKeys'
import { useCallback } from 'react'

const hydrateSession = (event: Event, sp: UseQueryResult<SpeakersMap>, data: Session[]) => {
    return data.map((session: Session) => ({
        ...session,
        speakersData: sp.data ? session.speakers.map((speakerId) => sp.data[speakerId]) : undefined,
        formatText: event.formats ? event.formats.find((f) => session.format === f.id)?.name : null,
        categoryObject: event.categories ? event.categories.find((c) => session.category === c.id) : null,
    }))
}

export const useSessions = (event: Event): UseQueryResult<Session[]> => {
    const eventId = event.id
    const sp = useSpeakersMap(eventId)

    return useFirestoreQueryData(
        sessionsKeys.allWithSpeakers(eventId),
        collections.sessions(eventId),
        {
            subscribe: true,
        },
        {
            select: useCallback((data: Session[]) => hydrateSession(event, sp, data), [sp, event]),
        }
    )
}

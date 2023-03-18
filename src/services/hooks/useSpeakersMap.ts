import { UseQueryResult } from 'react-query'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { collections } from '../firebase'
import { Speaker } from '../../types'
import { DocumentData } from '@firebase/firestore'

export type SpeakersMap = {
    [speakerId: string]: Speaker
}

export const useSpeakers = (eventId: string): UseQueryResult<Speaker[]> => {
    return useFirestoreQueryData(['speakers', eventId], collections.speakers(eventId))
}

// @ts-ignore
export const useSpeakersMap = (eventId: string): UseQueryResult<SpeakersMap> => {
    const sp = useSpeakers(eventId)

    if (sp.data && sp.data.length) {
        return {
            ...sp,
            data: sp.data.reduce<SpeakersMap>((acc, item: DocumentData) => {
                acc[item.id] = item as Speaker

                return acc
            }, {}) as SpeakersMap,
        } as UseQueryResult<SpeakersMap>
    }

    return sp as UseQueryResult<SpeakersMap>
}

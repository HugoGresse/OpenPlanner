import { UseQueryResult } from 'react-query'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { collections } from '../firebase'
import { Speaker } from '../../types'
import { DocumentData } from '@firebase/firestore'

export type SpeakersMap = {
    [speakerId: string]: Speaker
}

// @ts-ignore
export const useSpeakers = (eventId: string): UseQueryResult<SpeakersMap> => {
    const sp = useFirestoreQueryData(['speakers', eventId], collections.speakers(eventId))

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

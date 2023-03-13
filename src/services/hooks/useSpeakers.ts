import { UseQueryResult } from 'react-query'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { collections } from '../firebase'
import { Speaker } from '../../types'

export type SpeakersMap = {
    [speakerId: string]: Speaker
}

// @ts-ignore
export const useSpeakers = (eventId: string): UseQueryResult<SpeakersMap> => {
    const sp = useFirestoreQueryData(['speakers', eventId], collections.speakers(eventId))

    if (sp.data && sp.data.length) {
        return {
            ...sp,
            data: sp.data.reduce<SpeakersMap>((acc, item: Speaker) => {
                acc[item.id] = item

                return acc
            }, {}) as UseQueryResult<SpeakersMap>,
        }
    }

    return sp as UseQueryResult<SpeakersMap>
}

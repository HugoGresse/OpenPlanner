import { collections } from '../firebase'
import { Speaker } from '../../types'
import { DocumentData } from '@firebase/firestore'
import { useFirestoreCollection, UseQueryResult } from './firebaseQueryHook'

export type SpeakersMap = {
    [speakerId: string]: Speaker
}

export const useSpeakers = (eventId: string): UseQueryResult<Speaker[]> =>
    useFirestoreCollection(collections.speakers(eventId), true)

const transformToMap = (data: Speaker[]): SpeakersMap => {
    return data.reduce<SpeakersMap>((acc, item: DocumentData) => {
        acc[item.id] = item as Speaker

        return acc
    }, {}) as SpeakersMap
}

export const useSpeakersMap = (eventId: string): UseQueryResult<SpeakersMap> => {
    const queryResults = useSpeakers(eventId)
    return {
        ...queryResults,
        data: queryResults.data ? transformToMap(queryResults.data) : null,
    }
}

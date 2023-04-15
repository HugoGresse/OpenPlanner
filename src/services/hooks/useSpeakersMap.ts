import { UseQueryResult } from 'react-query'
import { useFirestoreQueryData } from '@react-query-firebase/firestore'
import { collections } from '../firebase'
import { Speaker } from '../../types'
import { DocumentData } from '@firebase/firestore'
import { speakersKeys } from './queriesKeys'

export type SpeakersMap = {
    [speakerId: string]: Speaker
}

export const useSpeakers = (eventId: string): UseQueryResult<Speaker[]> => {
    return useFirestoreQueryData(speakersKeys.all(eventId), collections.speakers(eventId))
}

const transformToMap = (data: Speaker[]): SpeakersMap => {
    return data.reduce<SpeakersMap>((acc, item: DocumentData) => {
        acc[item.id] = item as Speaker

        return acc
    }, {}) as SpeakersMap
}

export const useSpeakersMap = (eventId: string): UseQueryResult<SpeakersMap> => {
    return useFirestoreQueryData(speakersKeys.map(eventId), collections.speakers(eventId), undefined, {
        select: transformToMap,
    })
}

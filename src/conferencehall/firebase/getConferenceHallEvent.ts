import { getDoc } from 'firebase/firestore'
import { conferenceHallCollections } from './conferenceHallFirebase'
import { ConferenceHallEvent } from '../../types'

export const getConferenceHallEvent = async (chEventId: string) => {
    const snapshot = await getDoc(conferenceHallCollections.event(chEventId))

    return snapshot.data() as ConferenceHallEvent
}

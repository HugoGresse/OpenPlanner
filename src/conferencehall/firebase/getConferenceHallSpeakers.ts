import { ConferenceHallSpeaker } from '../../types'
import { conferenceHallCollections } from './conferenceHallFirebase'
import { doc, getDoc } from '@firebase/firestore'

export const getConferenceHallSpeakers = async (
    speakerIds: string[],
    progress: (progress: string) => void
): Promise<[speakersMap: { [id: string]: ConferenceHallSpeaker }, errors: string[]]> => {
    const errors: string[] = []
    const speakers: ConferenceHallSpeaker[] = []

    let count = 1
    for (const id of speakerIds) {
        const snapshot = await getDoc(doc(conferenceHallCollections.users, id))

        if (snapshot.exists()) {
            speakers.push(snapshot.data() as ConferenceHallSpeaker)
        } else {
            errors.push(`Unable to fetch speaker id ${id}`)
        }
        progress(`Getting ConferenceHall speakers: ${count}/${speakerIds.length}`)
        count++
    }

    const speakersMap = speakers.reduce<{ [id: string]: ConferenceHallSpeaker }>((acc, speaker) => {
        acc[speaker.uid] = speaker
        return acc
    }, {})

    return [speakersMap, errors]
}

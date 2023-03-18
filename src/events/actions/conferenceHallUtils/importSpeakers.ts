import { ConferenceHallSpeaker } from '../../../types'
import { doc, setDoc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { mapConferenceHallSpeakerToConferenceCenter } from './mapFromConferenceHallToConferenceCenter'

export const importSpeakers = async (
    eventId: string,
    chSpeakerIds: string[],
    speakersMap: { [id: string]: ConferenceHallSpeaker },
    progress: (progress: string) => void
): Promise<[speakersMap: { [id: string]: string }, error: string[]]> => {
    const errors = []
    progress(`Adding speakers...`)
    const speakersMappingFromConferenceHall: { [id: string]: string } = {}
    const [speakersToCreate, speakerErrors] = mapConferenceHallSpeakerToConferenceCenter(chSpeakerIds, speakersMap)
    errors.push(...speakerErrors)
    let countSpeakersAdded = 1
    for (const speaker of speakersToCreate) {
        await setDoc(doc(collections.speakers(eventId), speaker.id), speaker)
        progress(`Adding speakers: ${countSpeakersAdded}/${speakersToCreate.length}`)
        countSpeakersAdded++
        speakersMappingFromConferenceHall[speaker.conferenceHallId || ''] = speaker.id
    }

    return [speakersMappingFromConferenceHall, errors]
}

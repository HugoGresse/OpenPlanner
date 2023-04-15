import { Speaker } from '../../../types'
import { loadConferenceHallSpeakersFromIds } from '../../../conferencehall/firebase/loadFromConferenceHallUtils'
import { mapConferenceHallSpeakerToConferenceCenter } from './mapFromConferenceHallToConferenceCenter'
import { CreateNotificationOption } from '../../../context/SnackBarProvider'
import { doc, updateDoc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'

export const updateSpeakers = async (
    eventId: string,
    speakers: Speaker[],
    createNotification: (message: string, opt: CreateNotificationOption) => void,
    setProgress: ({ current, total }: { current: number; total: number }) => void
): Promise<void> => {
    const total = speakers.length
    const chIds: string[] = speakers.map((s) => s.conferenceHallId).filter((id) => !!id) as string[]
    const [speakersMap, errors, uniqConferenceHallSpeakersIds] = await loadConferenceHallSpeakersFromIds(
        chIds,
        () => null
    )
    if (errors.length) {
        console.log(errors)
        createNotification('Errors while loading speakers from ConferenceHall', { type: 'error' })
        return
    }
    const [speakersToUpdate, speakerErrors] = mapConferenceHallSpeakerToConferenceCenter(
        uniqConferenceHallSpeakersIds,
        speakersMap
    )

    if (speakerErrors.length) {
        console.log(speakerErrors)
        createNotification('Some speakers may we wrongfully formatted', { type: 'warning' })
    }

    let i = 0
    for (const speaker of speakersToUpdate) {
        await updateDoc(doc(collections.speakers(eventId), speaker.id), speaker)

        setProgress({
            current: i + 1,
            total: total,
        })
        i++
    }
}

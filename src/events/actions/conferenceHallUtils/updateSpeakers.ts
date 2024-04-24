import { Speaker } from '../../../types'
import { loadConferenceHallSpeakersFromIds } from '../../../conferencehall/firebase/loadFromConferenceHallUtils'
import { mapConferenceHallSpeakerToOpenPlanner } from './mapFromConferenceHallToOpenPlanner'
import { CreateNotificationOption } from '../../../context/SnackBarProvider'
import { doc, updateDoc, AddPrefixToKeys } from 'firebase/firestore'
import { collections } from '../../../services/firebase'

const transformSpeaker = (speaker: Speaker): { [x: string]: any } & AddPrefixToKeys<string, any> => {
    const transformed: { [x: string]: any } & AddPrefixToKeys<string, any> = {}
    for (const key in speaker) {
        transformed[key] = speaker[key as keyof Speaker]
    }
    return transformed
}

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
    const [speakersToUpdate, speakerErrors] = mapConferenceHallSpeakerToOpenPlanner(
        uniqConferenceHallSpeakersIds,
        speakersMap
    )

    if (speakerErrors.length) {
        console.log(speakerErrors)
        createNotification('Some speakers may we wrongfully formatted', { type: 'warning' })
    }

    let i = 0
    for (const speaker of speakersToUpdate) {
        const transformed = transformSpeaker(speaker)
        await updateDoc(doc(collections.speakers(eventId), speaker.id), transformed)

        setProgress({
            current: i + 1,
            total: total,
        })
        i++
    }
}

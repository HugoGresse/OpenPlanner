import { ConferenceHallProposal, Event } from '../../../types'
import { loadConferenceHallSpeakers } from '../../../conferencehall/firebase/loadFromConferenceHallUtils'
import { importSpeakers } from '../conferenceHallUtils/importSpeakers'
import { importSessions } from '../conferenceHallUtils/importSessions'
import { CreateNotificationOption } from '../../../context/SnackBarProvider'

export const addSessionsFromCH = async (
    event: Event,
    proposals: ConferenceHallProposal[],
    createNotification: (message: string, params: CreateNotificationOption) => void
) => {
    const errors = []
    const progressCallback = () => null

    const [speakersMap, loadSpeakerError, uniqConferenceHallSpeakersIds] = await loadConferenceHallSpeakers(
        proposals,
        progressCallback
    )
    errors.push(...loadSpeakerError)

    const [speakersMappingFromConferenceHall, newSpeakersErrors] = await importSpeakers(
        event.id,
        uniqConferenceHallSpeakersIds,
        speakersMap,
        progressCallback
    )
    errors.push(...newSpeakersErrors)

    // 3. Add the proposals
    const [_, sessionErrors] = await importSessions(
        event.id,
        proposals,
        event.formats,
        speakersMappingFromConferenceHall,
        progressCallback,
        true
    )
    errors.push(...sessionErrors)

    if (errors.length) {
        console.error('Error when adding sessions: ', errors)
        createNotification('Sessions added but there where some errors (check the console)', { type: 'warning' })
    } else {
        createNotification('Sessions added successfully', { type: 'success' })
    }
}

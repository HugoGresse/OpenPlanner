import { getConferenceHallProposals } from '../../conferencehall/firebase/getConferenceHallProposals'
import { Event } from '../../types'
import { loadConferenceHallSpeakers } from '../../conferencehall/firebase/loadFromConferenceHallUtils'
import { importSpeakers } from './conferenceHallUtils/importSpeakers'
import { importSessions } from './conferenceHallUtils/importSessions'
import { deleteSessionsAndSpeakers } from './deleteSessionsAndSpeakers'

export const reImportSessionsSpeakersFromConferenceHall = async (event: Event) => {
    const conferenceHallId = event.conferenceHallId

    if (!conferenceHallId) {
        console.log('Cannot import an Event without ConferenceHallId')
        return
    }

    // 1. Get proposals and speakers
    const proposals = await getConferenceHallProposals(conferenceHallId)
    const [speakersMap, loadSpeakerErrors, conferenceHallSpeakerIds] = await loadConferenceHallSpeakers(
        proposals,
        () => null
    )

    if (loadSpeakerErrors.length) {
        console.error(loadSpeakerErrors)
    }

    // 2. Delete sessions and speakers having a conferenceHallId
    await deleteSessionsAndSpeakers(event)

    // 3. Add the new sessions and speakers
    const [speakerMapToCC, speakerErrors] = await importSpeakers(
        event.id,
        conferenceHallSpeakerIds,
        speakersMap,
        () => null
    )
    if (speakerErrors.length) {
        console.error(speakerErrors)
    }

    const [_, sessionErrors] = await importSessions(event.id, proposals, event.formats, speakerMapToCC, () => null)
    if (sessionErrors.length) {
        console.error(sessionErrors)
    }
}

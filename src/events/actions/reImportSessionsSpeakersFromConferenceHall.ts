import { getConferenceHallProposals } from '../../conferencehall/firebase/getConferenceHallProposals'
import { Event } from '../../types'
import { loadConferenceHallSpeakers } from '../../conferencehall/firebase/loadFromConferenceHallUtils'
import { importSpeakers } from './conferenceHallUtils/importSpeakers'
import { importSessions } from './conferenceHallUtils/importSessions'
import { deleteSessionsAndSpeakers } from './deleteSessionsAndSpeakers'
import { getConferenceHallEvent } from '../../conferencehall/firebase/getConferenceHallEvent'
import {
    mapConferenceHallCategoriesToOpenPlanner,
    mapConferenceHallFormatsToOpenPlanner,
} from './conferenceHallUtils/mapFromConferenceHallToOpenPlanner'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { collections } from '../../services/firebase'

export const reImportSessionsSpeakersFromConferenceHall = async (event: Event, reImportCategoriesFormats: boolean) => {
    const conferenceHallId = event.conferenceHallId

    if (!conferenceHallId) {
        console.log('Cannot import an Event without ConferenceHallId')
        return
    }

    let formats = event.formats

    if (reImportCategoriesFormats) {
        const chEvent = await getConferenceHallEvent(conferenceHallId)
        formats = mapConferenceHallFormatsToOpenPlanner(chEvent.formats)
        const categories = mapConferenceHallCategoriesToOpenPlanner(chEvent.categories)

        await updateDoc(doc(collections.events, event.id), {
            formats: formats,
            categories: categories,
            updatedAt: serverTimestamp(),
        })
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

    const [_, sessionErrors] = await importSessions(event.id, proposals, formats, speakerMapToCC, () => null)
    if (sessionErrors.length) {
        console.error(sessionErrors)
    }
}

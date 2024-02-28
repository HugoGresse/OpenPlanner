import { ConferenceHallEvent, ConferenceHallProposal, Format, NewEvent } from '../../types'
import { collections } from '../../services/firebase'
import { addDoc, serverTimestamp } from 'firebase/firestore'
import { loadConferenceHallSpeakers } from '../../conferencehall/firebase/loadFromConferenceHallUtils'
import { importSpeakers } from './conferenceHallUtils/importSpeakers'
import { importSessions } from './conferenceHallUtils/importSessions'
import { getNewEventDates } from './conferenceHallUtils/addNewEventDateUtils'
import { mapConferenceHallCategoriesToOpenPlanner } from './conferenceHallUtils/mapFromConferenceHallToOpenPlanner'

export const addNewEvent = async (
    chEvent: ConferenceHallEvent,
    userId: string,
    proposals: ConferenceHallProposal[] = [],
    formats: Format[],
    progress: (progress: string) => void
): Promise<[eventId: string | null, errors: string[]]> => {
    try {
        return await addNewEventInternal(chEvent, userId, proposals, formats, progress)
    } catch (error) {
        console.error(error)
        return [null, [String(error)]]
    }
}

const addNewEventInternal = async (
    chEvent: ConferenceHallEvent,
    userId: string,
    proposals: ConferenceHallProposal[] = [],
    formats: Format[],
    progress: (progress: string) => void
): Promise<[eventId: string, errors: string[]]> => {
    const errors: string[] = []

    //0. Load speakers
    const [speakersMap, getSpeakersErrors, uniqConferenceHallSpeakersIds] = await loadConferenceHallSpeakers(
        proposals,
        progress
    )
    progress(`Getting ${uniqConferenceHallSpeakersIds.length} ConferenceHall speakers...`)
    errors.push(...getSpeakersErrors)

    //1. Create the OpenPlanner Event:
    const event: NewEvent = {
        conferenceHallId: chEvent.id,
        name: chEvent.name,
        dates: getNewEventDates(chEvent),
        members: [userId],
        owner: userId,
        tracks: [],
        formats: formats,
        categories: mapConferenceHallCategoriesToOpenPlanner(chEvent.categories),
        apiKey: null,
        scheduleVisible: true,
        webhooks: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        files: null,
        statusBadgeLink: null,
        statusBadgeImage: null,
    }
    progress(`Creating the event...`)
    const newEventRef = await addDoc(collections.events, event)
    const newEventId = newEventRef.id

    // 2. Add the speakers from the proposals
    const [speakersMappingFromConferenceHall, newError] = await importSpeakers(
        newEventId,
        uniqConferenceHallSpeakersIds,
        speakersMap,
        progress
    )
    errors.push(...newError)

    // 3. Add the proposals
    const [_, sessionErrors] = await importSessions(
        newEventId,
        proposals,
        formats,
        speakersMappingFromConferenceHall,
        progress
    )
    errors.push(...sessionErrors)

    return [newEventId, errors]
}

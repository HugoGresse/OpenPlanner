import { ConferenceHallEvent, ConferenceHallProposal, Format, NewEvent } from '../../types'
import { collections } from '../../services/firebase'
import { addDoc, serverTimestamp } from 'firebase/firestore'
import { loadConferenceHallSpeakers } from '../../conferencehall/firebase/loadFromConferenceHallUtils'
import { importSpeakers } from './conferenceHallUtils/importSpeakers'
import { importSessions } from './conferenceHallUtils/importSessions'

export const addNewEvent = async (
    chEvent: ConferenceHallEvent,
    userId: string,
    proposals: ConferenceHallProposal[] = [],
    formats: Format[],
    progress: (progress: string) => void
): Promise<[eventId: string | null, errors: string[]]> => {
    try {
        return addNewEventInternal(chEvent, userId, proposals, formats, progress)
    } catch (error) {
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

    //1. Create the ConferenceCenterEvent:
    const event: NewEvent = {
        conferenceHallId: chEvent.id,
        name: chEvent.name,
        dates: {
            start: chEvent.conferenceDates.start || null,
            end: chEvent.conferenceDates.end || null,
        },
        members: [userId],
        owner: userId,
        tracks: [],
        formats: formats,
        categories: chEvent.categories,
        scheduleVisible: true,
        webhooks: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        files: null,
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

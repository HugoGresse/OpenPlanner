import { doc, setDoc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { mapConferenceHallProposalsToOpenPlanner } from './mapFromConferenceHallToOpenPlanner'
import { ConferenceHallProposal, Format } from '../../../types'

export const importSessions = async (
    eventId: string,
    proposals: ConferenceHallProposal[],
    formats: Format[],
    speakersMappingFromConferenceHall: { [id: string]: string },
    progress: (progress: string) => void
): Promise<[sessionIds: string[], error: string[]]> => {
    const errors = []
    const [sessionsToCreate, sessionsErrors] = mapConferenceHallProposalsToOpenPlanner(
        proposals,
        formats,
        speakersMappingFromConferenceHall
    )
    errors.push(...sessionsErrors)
    const createdSessionIds = []
    let countSessionsAdded = 1
    for (const session of sessionsToCreate) {
        await setDoc(doc(collections.sessions(eventId), session.id), session)
        createdSessionIds.push(session.id)
        progress(`Adding sessions: ${countSessionsAdded}/${sessionsToCreate.length}`)
        countSessionsAdded++
    }

    return [createdSessionIds, errors]
}

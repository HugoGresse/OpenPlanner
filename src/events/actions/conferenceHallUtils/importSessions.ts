import { doc, setDoc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { mapConferenceHallProposalsToOpenPlanner } from './mapFromConferenceHallToOpenPlanner'
import { ConferenceHallProposal, Format } from '../../../types'

export const UPDATE_FIELDS_SESSIONS = [
    'title',
    'abstract',
    'language',
    'level',
    'speakers',
    'tags',
    'format',
    'durationMinutes',
    'category',
]
export const importSessions = async (
    eventId: string,
    proposals: ConferenceHallProposal[],
    formats: Format[],
    speakersMappingFromConferenceHall: { [id: string]: string },
    progress: (progress: string) => void,
    shouldUpdateSession: boolean = false
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
        if (shouldUpdateSession) {
            const sessionToUpdate: { [key: string]: any } = {}
            for (const field of UPDATE_FIELDS_SESSIONS) {
                // @ts-ignore
                sessionToUpdate[field] = session[field]
            }
            await setDoc(doc(collections.sessions(eventId), session.id), sessionToUpdate, { merge: true })
        } else {
            await setDoc(doc(collections.sessions(eventId), session.id), session)
        }
        createdSessionIds.push(session.id)
        progress(`Adding sessions: ${countSessionsAdded}/${sessionsToCreate.length}`)
        countSessionsAdded++
    }

    return [createdSessionIds, errors]
}

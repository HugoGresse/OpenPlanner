import { Session } from '../../../types'

/**
 * Remove extra optional field hydrated from ConferenceCenter
 * @param session
 */
export const mapSessionToFirestoreSession = (session: Session) => {
    const newSession = {
        ...session,
    }

    delete newSession.speakersData
    delete newSession.categoryObject
    delete newSession.formatText

    return newSession
}

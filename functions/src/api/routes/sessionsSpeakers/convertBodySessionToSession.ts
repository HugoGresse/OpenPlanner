import { Session, Event } from '../../../types'
import { OverwriteSpeakerSessionsType } from './sessionsSpeakers'

type ElementType<T> = T extends (infer U)[] ? U : never

export const convertBodySessionToSession = (
    session: ElementType<OverwriteSpeakerSessionsType['sessions']>,
    event: Event
): Session => {
    const realSession: Partial<Session> = {
        id: session.id,
    }

    if (session.dateStart && session.dateEnd) {
        realSession.dates = {
            start: session.dateStart,
            end: session.dateEnd,
        }
    }

    // TypeScript doesn't support type at compile time, and transformers is not working with vite. So we need to do this shit
    if (session.title) {
        realSession.title = session.title
    }
    if (session.abstract) {
        realSession.abstract = session.abstract
    }
    if (session.durationMinutes) {
        realSession.durationMinutes = session.durationMinutes
    }
    if (session.hideTrackTitle) {
        realSession.hideTrackTitle = session.hideTrackTitle
    }
    if (session.showInFeedback) {
        realSession.showInFeedback = session.showInFeedback
    }
    if (session.imageUrl) {
        realSession.imageUrl = session.imageUrl
    }
    if (session.videoLink) {
        realSession.videoLink = session.videoLink
    }
    if (session.presentationLink) {
        realSession.presentationLink = session.presentationLink
    }
    if (session.language) {
        realSession.language = session.language
    }
    if (session.level) {
        realSession.level = session.level
    }
    if (session.note) {
        realSession.note = session.note
    }
    if (session.teasingHidden) {
        realSession.teasingHidden = session.teasingHidden
    }

    if (session.trackId || session.trackName) {
        realSession.trackId = (event.tracks || []).find(
            (track) => track.name === session.trackId || track.name === session.trackName
        )?.id
    }

    if (session.categoryId || session.categoryName) {
        realSession.category = (event.categories || []).find(
            (cat) => cat.name === session.categoryId || cat.name === session.categoryName
        )?.id
    }

    if (session.formatId || session.formatName) {
        realSession.format = (event.formats || []).find(
            (format) => format.name === session.formatId || format.name === session.formatName
        )?.id
    }

    if (session.speakerIds) {
        realSession.speakers = session.speakerIds
    }

    return realSession as Session
}

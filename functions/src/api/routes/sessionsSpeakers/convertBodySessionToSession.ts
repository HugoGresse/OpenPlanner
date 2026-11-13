import { Session, Event } from '../../../types'
import { StaticTypeOfSpeakerSessionsType } from './sessionsSpeakers'
import { DateTime } from 'luxon'
import { findByIdOrName } from './findByIdOrName'
type ElementType<T> = T extends (infer U)[] ? U : never

export const convertBodySessionToSession = (
    session: ElementType<StaticTypeOfSpeakerSessionsType['sessions']>,
    event: Event
): Session => {
    const realSession: Partial<Session> = {
        id: session.id,
    }

    if (session.dateStart && session.dateEnd) {
        realSession.dates = {
            start: DateTime.fromISO(session.dateStart).toJSDate(),
            end: DateTime.fromISO(session.dateEnd).toJSDate(),
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
        realSession.trackId = resolveReference(event, 'tracks', session.trackId, session.trackName)
    }

    if (session.categoryId || session.categoryName) {
        realSession.category = resolveReference(event, 'categories', session.categoryId, session.categoryName)
    }

    if (session.formatId || session.formatName) {
        realSession.format = resolveReference(event, 'formats', session.formatId, session.formatName)
    }

    if (session.speakerIds) {
        realSession.speakers = session.speakerIds
    }

    return realSession as Session
}

const resolveReference = (
    event: Event,
    type: 'tracks' | 'categories' | 'formats',
    id: string | undefined,
    name: string | undefined
): string | null => {
    const resolved = findByIdOrName(event[type], id, name)
    if (resolved === null) console.error(`${type} not found`, id, name, event[type])
    return resolved
}

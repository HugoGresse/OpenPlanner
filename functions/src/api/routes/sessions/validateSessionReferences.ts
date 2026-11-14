import firebase from 'firebase-admin'
import { EventDao } from '../../dao/eventDao'
import { SpeakerDao } from '../../dao/speakerDao'
import { Event } from '../../../types'

type References = { trackId?: string | null; format?: string | null; category?: string | null }

const LISTS: Array<[keyof References, 'tracks' | 'formats' | 'categories']> = [
    ['trackId', 'tracks'],
    ['format', 'formats'],
    ['category', 'categories'],
]

// Returns a message naming the first reference that is not defined on the event, or null when all resolve.
export const findInvalidSessionReference = (event: Event, references: References): string | null => {
    for (const [field, list] of LISTS) {
        const value = references[field]
        if (!value) continue
        const items = event[list] || []
        if (items.some((item) => item.id === value)) continue
        const valid = items.map((item) => item.id).join(', ') || 'none defined on the event'
        return `Unknown ${field} "${value}". Valid ids: ${valid}`
    }
    return null
}

export type SessionReferences = References & { speakers?: string[] }

// Returns the message of the first reference (track, format, category, speaker) that does not exist, or null.
// Shared by POST and PATCH /sessions and by the assistant's proposals. The event is only needed when a track,
// format or category is set (pass the one the request already loaded), the speakers only when some are given.
export const findInvalidReferences = async (
    firebaseApp: firebase.app.App,
    eventId: string,
    references: SessionReferences,
    loadedEvent?: Event | null
): Promise<string | null> => {
    if (references.trackId || references.format || references.category) {
        const event = loadedEvent ?? (await EventDao.getEvent(firebaseApp, eventId))
        const referenceError = findInvalidSessionReference(event, references)
        if (referenceError) return referenceError
    }
    if (!references.speakers?.length) return null
    const missing = await SpeakerDao.findMissingSpeakerIds(firebaseApp, eventId, references.speakers)
    return missing.length > 0 ? `Unknown speaker id(s): ${missing.join(', ')}` : null
}

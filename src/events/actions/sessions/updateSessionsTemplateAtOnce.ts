import { Event, Session } from '../../../types'
import { generateFirestoreId } from '../../../utils/generateFirestoreId'
import { collections, instanceFirestore } from '../../../services/firebase'
import { writeBatch, doc } from 'firebase/firestore'

const deleteSessionsTemplate = (event: Event, sessions: Session[]) => {
    const batch = writeBatch(instanceFirestore)
    for (const session of sessions) {
        const ref = doc(collections.sessionsTemplate(event.id), session.id)
        batch.delete(ref)
    }
    return batch.commit()
}

const addSessionsTemplate = (event: Event, sessions: Session[]) => {
    const batch = writeBatch(instanceFirestore)
    for (const session of sessions) {
        const ref = doc(collections.sessionsTemplate(event.id), session.id)
        batch.set(ref, session)
    }
    return batch.commit()
}

type RowUpdateBase = {
    id: string // category id
    category: string // category name
}

type RowUpdateDynamic = {
    [key: string]: number // format id => number of sessions
}

type RowUpdate = RowUpdateBase & RowUpdateDynamic

export const updateSessionsTemplateAtOnce = async (
    event: Event,
    sessionsTemplate: Session[],
    updatedRow: RowUpdate
) => {
    // 1. Count the format and category in the new template
    const toDelete: Session[] = []
    const toAdd: Session[] = []

    const existingSessionForThisCategory = sessionsTemplate.filter((session) => session.category === updatedRow.id)

    const sessionsByFormat = existingSessionForThisCategory.reduce<{ [key: string]: Session[] }>((acc, session) => {
        if (!session.format) return acc

        const key: string = session.format
        if (!acc[key]) {
            acc[key] = []
        }
        acc[key].push(session)
        return acc
    }, {})

    for (const format of event.formats) {
        const sessions = sessionsByFormat[format.id]
        const count = updatedRow[format.id]

        const countToAdd = count - (sessions ? sessions.length : 0)
        const countToDelete = (sessions ? sessions.length : 0) - count

        if (countToAdd > 0) {
            for (let i = 0; i < countToAdd; i++) {
                toAdd.push({
                    id: generateFirestoreId(),
                    category: updatedRow.id,
                    format: format.id,
                    durationMinutes: format.durationMinutes,
                    title: '',
                    abstract: null,
                    dates: null,
                    conferenceHallId: null,
                    speakers: [],
                    tags: [],
                    trackId: null,
                    language: null,
                    level: null,
                    presentationLink: null,
                    videoLink: null,
                    imageUrl: null,
                    image: null,
                    showInFeedback: false,
                    hideTrackTitle: false,
                    note: null,
                    teasingPosts: null,
                    teasingHidden: false,
                    teaserUrl: null,
                })
            }
        }

        if (countToDelete > 0) {
            // delete sessions starting from the end
            for (const session of sessions.slice(-countToDelete)) {
                toDelete.push(session)
            }
        }
    }

    try {
        // 2. Delete the sessions that are not in the new template
        await deleteSessionsTemplate(event, toDelete)

        // 3. Add the sessions that are in the new template
        await addSessionsTemplate(event, toAdd)

        return {
            success: true,
        }
    } catch (error) {
        return {
            success: false,
            error,
        }
    }
}

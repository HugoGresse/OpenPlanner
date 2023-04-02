import { Event } from '../../../types'
import { getSession } from '../sessions/getSessions'
import { getSpeakers } from '../getSpeakers'
import { ref, uploadString } from 'firebase/storage'
import { storage } from '../../../services/firebase'
import { getFilesNames } from './getFilesNames'
import { CreateNotificationOption } from '../../../context/SnackBarProvider'

export const updateWebsiteTriggerWebhooksAction = async (
    event: Event,
    createNotification: (message: string, options?: CreateNotificationOption) => void
) => {
    try {
        await updateWebsiteTriggerWebhooksActionInternal(event)
        createNotification('APIs and webhooks triggered', { type: 'success' })
    } catch (error) {
        console.error(error)
        createNotification('Failed to update... ' + String(error), { type: 'success' })
    }
}

const updateWebsiteTriggerWebhooksActionInternal = async (event: Event) => {
    const sessions = await getSession(event.id)
    const speakers = await getSpeakers(event.id)

    const outputSessions = sessions.map((s) => ({
        id: s.id,
        title: s.title,
        abstract: s.abstract,
        dateStart: s.dates?.start?.toISODate(),
        dateEnd: s.dates?.end?.toISODate(),
        durationMinutes: s.durationMinutes,
        speakerIds: s.speakers,
        trackId: s.trackId,
        language: s.language,
        presentationLink: s.presentationLink,
        videoLink: s.videoLink,
        tags: s.tags,
        formatId: s.format,
        categoryId: s.category,
        showInFeedback: s.showInFeedback,
        hideTrackTitle: s.hideTrackTitle,
    }))
    const outputSessionsPrivate = sessions.map((s) => ({
        id: s.id,
        title: s.title,
        abstract: s.abstract,
        dateStart: s.dates?.start?.toISODate(),
        dateEnd: s.dates?.end?.toISODate(),
        durationMinutes: s.durationMinutes,
        speakerIds: s.speakers,
        trackId: s.trackId,
        language: s.language,
        presentationLink: s.presentationLink,
        videoLink: s.videoLink,
        tags: s.tags,
        formatId: s.format,
        categoryId: s.category,
        showInFeedback: s.showInFeedback,
        hideTrackTitle: s.hideTrackTitle,
        note: s.note,
    }))

    const outputEvent = {
        id: event.id,
        name: event.name,
        scheduleVisible: event.scheduleVisible,
        dateStart: event.dates.start?.toISOString(),
        dateEnd: event.dates.end?.toISOString(),
        formats: event.formats,
        categories: event.categories,
        tracks: event.tracks,
        updatedAt: event.updatedAt,
    }

    const outputPublic = {
        event: outputEvent,
        speakers: speakers.map((s) => ({
            id: s.id,
            name: s.name,
            jobTitle: s.jobTitle,
            bio: s.bio,
            company: s.companyLogoUrl,
            photoUrl: s.photoUrl,
            socials: s.socials,
        })),
        sessions: outputSessions,
        generatedAt: new Date().toISOString(),
    }
    const outputPrivate = {
        event: outputEvent,
        speakers: speakers,
        sessions: outputSessionsPrivate,
        generatedAt: new Date().toISOString(),
    }

    const fileNames = await getFilesNames(event)

    const metadata = {
        contentType: 'application/json',
    }

    const outputRefPublic = ref(storage, fileNames.public)
    const outputRefPrivate = ref(storage, fileNames.private)

    await uploadString(outputRefPublic, JSON.stringify(outputPublic), undefined, metadata)
    await uploadString(outputRefPrivate, JSON.stringify(outputPrivate), undefined, metadata)
}

import { Event } from '../../types'
import { getSession } from './getSessions.js'
import { getSpeakers } from './getSpeakers.js'
import { ref, uploadString } from 'firebase/storage'
import { storage } from '../../services/firebase'
import { getFilesNames } from './updateWebsiteActions/getFilesNames'

export const updateWebsiteTriggerWebhooksAction = async (event: Event) => {
    try {
        await updateWebsiteTriggerWebhooksActionInternal(event)

        // TODO : notif success
    } catch (error) {
        console.log('update failed')
        // TODO : notif error
        return false
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
        showInFeedback: s.showInFeedback,
        hideTrackTitle: s.hideTrackTitle,
    }))

    const outputEvent = {
        id: event.id,
        name: event.name,
        scheduleVisible: event.scheduleVisible,
        dateStart: event.dates.start?.toISOString(),
        dateEnd: event.dates.end?.toISOString(),
        formats: event.formats,
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
            socials: s.social,
        })),
        sessions: outputSessions,
    }
    const outputPrivate = {
        event: outputEvent,
        speakers: speakers,
        sessions: outputSessions,
    }

    const fileNames = await getFilesNames(event)

    const outputRefPublic = ref(storage, fileNames.public)
    const outputRefPrivate = ref(storage, fileNames.private)

    const result = await uploadString(outputRefPublic, JSON.stringify(outputPublic))
    console.log(result)
    // const result = uploadString(outputRefPrivate, JSON.stringify(outputPrivate))
}

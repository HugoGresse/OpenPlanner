import { Event } from '../../../types'
import { getSession } from '../sessions/getSessions'
import { getSpeakers } from '../getSpeakers'

export const generateStaticJson = async (event: Event) => {
    const sessions = await getSession(event.id)
    const speakers = await getSpeakers(event.id)

    const outputSessions = sessions.map((s) => ({
        id: s.id,
        title: s.title,
        abstract: s.abstract,
        dateStart: s.dates?.start?.toISO(),
        dateEnd: s.dates?.end?.toISO(),
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
        extendHeight: s.extendHeight,
    }))
    const outputSessionsPrivate = sessions.map((s) => ({
        id: s.id,
        title: s.title,
        abstract: s.abstract,
        dateStart: s.dates?.start?.toISO(),
        dateEnd: s.dates?.end?.toISO(),
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
        extendHeight: s.extendHeight,
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
            company: s.company,
            companyLogoUrl: s.companyLogoUrl,
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

    return {
        outputPublic,
        outputPrivate,
    }
}

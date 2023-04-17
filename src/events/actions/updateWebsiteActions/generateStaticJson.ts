import { Event } from '../../../types'
import { getSessions } from '../sessions/getSessions'
import { getSpeakers } from '../getSpeakers'
import { getSponsors } from '../getSponsors'
import { generateOpenFeedbackJson } from './generateOpenFeedbackJson'

export const generateStaticJson = async (event: Event) => {
    const sessions = await getSessions(event.id)
    const speakers = await getSpeakers(event.id)
    const sponsors = await getSponsors(event.id)

    const openFeedbackOutput = generateOpenFeedbackJson(event, sessions, speakers)

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
        level: s.level,
        imageUrl: s.imageUrl,
        presentationLink: s.presentationLink,
        videoLink: s.videoLink,
        tags: s.tags,
        formatId: s.format,
        categoryId: s.category,
        showInFeedback: s.showInFeedback,
        hideTrackTitle: s.hideTrackTitle,
        extendHeight: s.extendHeight,
        extendWidth: s.extendWidth,
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
        level: s.level,
        imageUrl: s.imageUrl,
        presentationLink: s.presentationLink,
        videoLink: s.videoLink,
        tags: s.tags,
        formatId: s.format,
        categoryId: s.category,
        showInFeedback: s.showInFeedback,
        hideTrackTitle: s.hideTrackTitle,
        extendHeight: s.extendHeight,
        extendWidth: s.extendWidth,
        note: s.note,
    }))

    const outputSponsor = sponsors

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
        sponsors: outputSponsor,
        generatedAt: new Date().toISOString(),
    }
    const outputPrivate = {
        event: outputEvent,
        speakers: speakers,
        sessions: outputSessionsPrivate,
        sponsors: outputSponsor,
        generatedAt: new Date().toISOString(),
    }

    return {
        outputPublic,
        outputPrivate,
        outputOpenFeedback: openFeedbackOutput,
    }
}

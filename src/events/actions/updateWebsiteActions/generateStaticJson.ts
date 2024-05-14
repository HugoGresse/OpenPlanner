import { Event } from '../../../types'
import { getSessions } from '../sessions/getSessions'
import { getSpeakers } from '../getSpeakers'
import { getSponsors } from '../getSponsors'
import { generateOpenFeedbackJson } from './generateOpenFeedbackJson'
import { getTeam } from '../getTeam'
import { getFaq } from '../getFaq'
import { generateVoxxrinJson } from './generateVoxxrinJson'

export const generateStaticJson = async (event: Event) => {
    const [sessions, speakers, sponsors, team, faq] = await Promise.all([
        getSessions(event.id),
        getSpeakers(event.id),
        getSponsors(event.id),
        getTeam(event.id),
        getFaq(event.id),
    ])

    const faqPublic = faq.filter((f) => !f.private)

    const openFeedbackOutput = generateOpenFeedbackJson(event, sessions, speakers)
    const voxxrinJson = event.enableVoxxrin ? generateVoxxrinJson(event, sessions, speakers, sponsors) : null

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
        teaserVideoUrl: s.teaserVideoUrl,
        teaserImageUrl: s.teaserImageUrl,
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
        teaserVideoUrl: s.teaserVideoUrl,
        teaserImageUrl: s.teaserImageUrl,
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
        locationName: event.locationName,
        locationUrl: event.locationUrl,
        color: event.color,
        colorSecondary: event.colorSecondary,
        colorBackground: event.colorBackground,
        logoUrl: event.logoUrl,
        logoUrl2: event.logoUrl2,
        backgroundUrl: event.backgroundUrl,
    }

    const outputPublic = {
        event: outputEvent,
        speakers: speakers.map((s) => ({
            id: s.id,
            name: s.name,
            pronouns: s.pronouns,
            jobTitle: s.jobTitle,
            bio: s.bio,
            company: s.company,
            companyLogoUrl: s.companyLogoUrl,
            photoUrl: s.photoUrl,
            socials: s.socials,
        })),
        sessions: outputSessions,
        sponsors: outputSponsor,
        team: team,
        faq: faqPublic,
        generatedAt: new Date().toISOString(),
    }
    const outputPrivate = {
        event: outputEvent,
        speakers: speakers,
        sessions: outputSessionsPrivate,
        sponsors: outputSponsor,
        team: team,
        faq: faq,
        generatedAt: new Date().toISOString(),
    }

    return {
        outputPublic,
        outputPrivate,
        outputOpenFeedback: openFeedbackOutput,
        outputVoxxrin: voxxrinJson,
    }
}

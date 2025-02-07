import firebase from 'firebase-admin'
import { Event } from '../../../../../../src/types'
import { generateOpenFeedbackJson } from './generateOpenFeedbackJson'
import { generateVoxxrinJson } from './generateVoxxrinJson'
import { JsonOutput, JsonSession, JsonSessionPrivate, JsonPublicOutput, JsonPrivateOutput } from './jsonTypes'
import { SessionDao } from '../../../dao/sessionDao'
import { SpeakerDao } from '../../../dao/speakerDao'
import { SponsorDao } from '../../../dao/sponsorDao'
import { TeamDao } from '../../../dao/teamDao'
import { FaqDao } from '../../../dao/faqDao'

export const generateStaticJson = async (firebaseApp: firebase.app.App, event: Event): Promise<JsonOutput> => {
    const [sessions, speakers, sponsors, { team, teams }, faq] = await Promise.all([
        SessionDao.getSessions(firebaseApp, event.id),
        SpeakerDao.getSpeakers(firebaseApp, event.id),
        SponsorDao.getSponsors(firebaseApp, event.id),
        TeamDao.getTeams(firebaseApp, event.id),
        FaqDao.getFullFaqs(firebaseApp, event.id),
    ])

    const faqPublic = faq.filter((f) => !f.private)

    const openFeedbackOutput = generateOpenFeedbackJson(event, sessions, speakers)
    const voxxrinJson = event.enableVoxxrin ? generateVoxxrinJson(event, sessions, speakers, sponsors) : null

    const outputSessions: JsonSession[] = sessions.map((s) => ({
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
        tags: s.tags || [],
        formatId: s.format,
        categoryId: s.category,
        showInFeedback: s.showInFeedback,
        hideTrackTitle: s.hideTrackTitle,
        extendHeight: s.extendHeight,
        extendWidth: s.extendWidth,
        teaserVideoUrl: s.teaserVideoUrl,
        teaserImageUrl: s.teaserImageUrl,
    }))
    const outputSessionsPrivate: JsonSessionPrivate[] = sessions.map((s) => ({
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
        tags: s.tags || [],
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
        updatedAt: event.updatedAt.toISOString(),
        locationName: event.locationName,
        locationUrl: event.locationUrl,
        color: event.color,
        colorSecondary: event.colorSecondary,
        colorBackground: event.colorBackground,
        logoUrl: event.logoUrl,
        logoUrl2: event.logoUrl2,
        backgroundUrl: event.backgroundUrl,
    }

    const outputPublic: JsonPublicOutput = {
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
        team,
        teams,
        faq: faqPublic,
        generatedAt: new Date().toISOString(),
    }
    const outputPrivate: JsonPrivateOutput = {
        event: outputEvent,
        speakers,
        sessions: outputSessionsPrivate,
        sponsors: outputSponsor,
        team,
        teams,
        faq,
        generatedAt: new Date().toISOString(),
    }

    return {
        outputPublic,
        outputPrivate,
        outputOpenFeedback: openFeedbackOutput,
        outputVoxxrin: voxxrinJson,
    }
}

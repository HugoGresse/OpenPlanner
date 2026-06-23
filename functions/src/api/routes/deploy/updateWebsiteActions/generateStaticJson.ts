import firebase from 'firebase-admin'
import { Event, TicketCurrency } from '../../../../../../src/types'
import { generateOpenFeedbackJson } from './generateOpenFeedbackJson'
import { generateVoxxrinJson } from './generateVoxxrinJson'
import {
    JsonOutput,
    JsonSession,
    JsonSessionPrivate,
    JsonPublicOutput,
    JsonPrivateOutput,
    JsonTicket,
} from './jsonTypes'
import { SessionDao } from '../../../dao/sessionDao'
import { SpeakerDao } from '../../../dao/speakerDao'
import { SponsorDao } from '../../../dao/sponsorDao'
import { TeamDao } from '../../../dao/teamDao'
import { FaqDao } from '../../../dao/faqDao'
import { JobPostDao } from '../../../dao/jobPostDao'
import { TicketDao } from '../../../dao/ticketDao'
import { JobStatus } from '../../../../../../src/constants/jobStatus'
import { dateToString, unknownToDateTime } from '../../../other/dateConverter'

export const generateStaticJson = async (firebaseApp: firebase.app.App, event: Event): Promise<JsonOutput> => {
    const [sessions, speakers, sponsors, { team, teams }, faq, jobPosts, tickets] = await Promise.all([
        SessionDao.getSessions(firebaseApp, event.id),
        SpeakerDao.getSpeakers(firebaseApp, event.id),
        SponsorDao.getSponsors(firebaseApp, event.id),
        TeamDao.getTeams(firebaseApp, event.id),
        FaqDao.getFullFaqs(firebaseApp, event.id),
        JobPostDao.getAllJobPosts(firebaseApp, event.id, JobStatus.APPROVED),
        TicketDao.getTickets(firebaseApp, event.id),
    ])

    const faqPublic = faq.filter((f) => !f.private)

    const outputTickets: JsonTicket[] = tickets.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price,
        currency: t.currency as TicketCurrency,
        url: t.url,
        ticketsCount: t.ticketsCount,
        available: t.available,
        soldOut: t.soldOut,
        highlighted: t.highlighted,
        displayNewsletterRegistration: t.displayNewsletterRegistration,
        startDate: t.startDate ? unknownToDateTime(t.startDate as any).toISO() : null,
        endDate: t.endDate ? unknownToDateTime(t.endDate as any).toISO() : null,
        message: t.message,
    }))

    const openFeedbackOutput = generateOpenFeedbackJson(event, sessions, speakers)
    const voxxrinJson = event.enableVoxxrin ? generateVoxxrinJson(event, sessions, speakers, sponsors) : null

    const outputSessions: JsonSession[] = sessions.map((s) => ({
        id: s.id,
        title: s.title,
        abstract: s.abstract,
        dateStart: dateToString(s.dates?.start),
        dateEnd: dateToString(s.dates?.end),
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
        dateStart: dateToString(s.dates?.start),
        dateEnd: dateToString(s.dates?.end),
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

    const outputSponsor = sponsors.map((category) => ({
        ...category,
        sponsors: category.sponsors.map((sponsor) => ({
            ...sponsor,
            jobPosts: jobPosts
                .filter((jobPost) => jobPost.sponsorId === sponsor.id)
                .map((jobPost) => ({
                    id: jobPost.id,
                    title: jobPost.title,
                    description: jobPost.description,
                    location: jobPost.location,
                    externalLink: jobPost.externalLink,
                    salary: jobPost.salary,
                    requirements: jobPost.requirements,
                    contactEmail: jobPost.contactEmail,
                    category: jobPost.category,
                    createdAt: dateToString(jobPost.createdAt.toDate()),
                })),
        })),
    }))

    const outputSponsorsPrivate = sponsors.map((category) => ({
        ...category,
        sponsors: category.sponsors.map((sponsor) => ({
            ...sponsor,
            jobPostToken: sponsor.jobPostToken,
            jobPosts: jobPosts
                .filter((jobPost) => jobPost.sponsorId === sponsor.id)
                .map((jobPost) => ({
                    id: jobPost.id,
                    title: jobPost.title,
                    description: jobPost.description,
                    location: jobPost.location,
                    externalLink: jobPost.externalLink,
                    salary: jobPost.salary,
                    requirements: jobPost.requirements,
                    contactEmail: jobPost.contactEmail,
                    category: jobPost.category,
                    createdAt: dateToString(jobPost.createdAt.toDate()),
                })),
        })),
    }))

    const outputEvent = {
        id: event.id,
        name: event.name,
        scheduleVisible: event.scheduleVisible,
        dateStart: dateToString(event.dates.start),
        dateEnd: dateToString(event.dates.end),
        formats: event.formats,
        categories: event.categories,
        tracks: event.tracks,
        updatedAt: dateToString(event.updatedAt),
        locationName: event.locationName,
        locationUrl: event.locationUrl,
        color: event.color,
        colorSecondary: event.colorSecondary,
        colorBackground: event.colorBackground,
        logoUrl: event.logoUrl,
        logoUrl2: event.logoUrl2,
        backgroundUrl: event.backgroundUrl,
        sponsorCustomFields: event.sponsorCustomFields || [],
        speakerCustomFields: event.speakerCustomFields || [],
    }

    const publicSpeakerCustomFieldIds = (event.speakerCustomFields || [])
        .filter((f) => f.privacy !== 'private')
        .map((f) => f.id)

    const outputPublic: JsonPublicOutput = {
        event: outputEvent,
        speakers: speakers.map((s) => {
            const publicCustomFields: { [key: string]: string | boolean } = {}
            for (const id of publicSpeakerCustomFieldIds) {
                if (s.customFields && id in s.customFields) {
                    publicCustomFields[id] = s.customFields[id]
                }
            }
            return {
                id: s.id,
                name: s.name,
                pronouns: s.pronouns,
                jobTitle: s.jobTitle,
                bio: s.bio,
                company: s.company,
                companyLogoUrl: s.companyLogoUrl,
                photoUrl: s.photoUrl,
                socials: s.socials,
                customFields: publicCustomFields,
            }
        }),
        sessions: outputSessions,
        sponsors: outputSponsor,
        team,
        teams,
        faq: faqPublic,
        tickets: outputTickets,
        timezone: event.timezone,
        generatedAt: dateToString(new Date()),
    }
    const outputPrivate: JsonPrivateOutput = {
        event: outputEvent,
        speakers,
        sessions: outputSessionsPrivate,
        sponsors: outputSponsorsPrivate,
        team,
        teams,
        faq,
        tickets: outputTickets,
        timezone: event.timezone,
        generatedAt: dateToString(new Date()),
    }

    return {
        outputPublic,
        outputPrivate,
        outputOpenFeedback: openFeedbackOutput,
        outputVoxxrin: voxxrinJson,
    }
}

import {
    Category,
    ConferenceHallProposal,
    ConferenceHallSpeaker,
    Format,
    Session,
    Social,
    Speaker,
} from '../../../types'
import { slugify } from '../../../utils/slugify'
import { randomColor } from '../../../utils/colors/randomColor'

export const mapConferenceHallSpeakerToOpenPlanner = (
    speakerIds: string[],
    chSpeakers: { [id: string]: ConferenceHallSpeaker }
): [speakers: Speaker[], error: string[]] => {
    const errors: string[] = []
    const speakers: Speaker[] = []
    for (const chSpeakerId of speakerIds) {
        const chSpeaker = chSpeakers[chSpeakerId]
        if (!chSpeaker) {
            errors.push('Missing speaker: ' + chSpeakerId)
            continue
        }
        const socials: Social[] = []
        if (chSpeaker.twitter) {
            socials.push({
                icon: 'twitter',
                name: 'Twitter',
                link: chSpeaker.twitter,
            })
        }
        if (chSpeaker.github) {
            socials.push({
                icon: 'github',
                name: 'GitHub',
                link: chSpeaker.github,
            })
        }
        speakers.push({
            id: slugify(chSpeaker.displayName),
            email: chSpeaker.email || null,
            phone: chSpeaker.phone || null,
            conferenceHallId: chSpeaker.uid || null,
            name: chSpeaker.displayName,
            bio: chSpeaker.bio || null,
            company: chSpeaker.company || null,
            geolocation: chSpeaker.address?.formattedAddress || null,
            photoUrl: chSpeaker.photoURL || null,
            socials: socials,
            companyLogoUrl: null,
            jobTitle: null,
            note: null,
        })
    }
    return [speakers, errors]
}

export const mapConferenceHallProposalsToOpenPlanner = (
    proposals: ConferenceHallProposal[],
    formats: Format[],
    speakersMapping: { [conferenceHallId: string]: string }
): [sessions: Session[], errors: string[]] => {
    const errors: string[] = []
    const sessions: Session[] = []
    for (const chProposal of proposals) {
        const chSpeakerIds = Object.keys(chProposal.speakers).filter((id) => chProposal.speakers[id])

        const speakerIds: string[] = chSpeakerIds
            .map((id) => {
                if (speakersMapping[id]) {
                    return speakersMapping[id]
                }
                errors.push(`Unable to find speaker id ${id} in proposals ${chProposal.title} (${chProposal.id})`)
                return null
            })
            .filter((id) => !!id) as string[]

        const format = chProposal.formats ? formats.find((f) => f.id === chProposal.formats) : null

        sessions.push({
            id: slugify(chProposal.title).slice(0, 30),
            conferenceHallId: chProposal.id,
            title: chProposal.title,
            abstract: chProposal.abstract || null,
            speakers: speakerIds,
            dates: null,
            durationMinutes: format ? format.durationMinutes : 20,
            format: format ? format.id : null,
            imageUrl: null,
            hideTrackTitle: false,
            showInFeedback: true,
            image: null,
            language: chProposal.language || null,
            level: chProposal.level || null,
            category: chProposal.categories || null,
            presentationLink: null,
            tags: [],
            note: null,
            trackId: null,
            videoLink: null,
        })
    }
    return [sessions, errors]
}

export const mapConferenceHallFormatsToOpenPlanner = (
    chFormats: { id: string; name: string }[] | undefined,
    defaultDurationMinutes = 20
): Format[] => {
    if (!chFormats) {
        return []
    }
    return chFormats.map((f) => ({
        id: f.id,
        name: f.name,
        durationMinutes: defaultDurationMinutes,
    }))
}
export const mapConferenceHallCategoriesToOpenPlanner = (
    chCategories: { id: string; name: string }[] | undefined
): Category[] => {
    if (!chCategories) {
        return []
    }
    return chCategories.map((f) => ({
        id: f.id,
        name: f.name,
        color: randomColor(),
    }))
}

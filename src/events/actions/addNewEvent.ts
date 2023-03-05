import {
    ConferenceHallEvent,
    ConferenceHallProposal,
    ConferenceHallSpeaker,
    NewEvent,
    Session,
    Speaker,
    SpeakerSocial,
} from '../../types'
import { getConferenceHallSpeakers } from '../../conferencehall/firebase/getConferenceHallSpeakers'
import { collections } from '../../services/firebase'
import { addDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { slugify } from '../../utils/slugify'

export const addNewEvent = async (
    chEvent: ConferenceHallEvent,
    userId: string,
    proposals: ConferenceHallProposal[] = [],
    progress: (progress: string) => void
): Promise<[eventId: string | null, errors: string[]]> => {
    try {
        return addNewEventInternal(chEvent, userId, proposals, progress)
    } catch (error) {
        return [null, [String(error)]]
    }
}

const addNewEventInternal = async (
    chEvent: ConferenceHallEvent,
    userId: string,
    proposals: ConferenceHallProposal[] = [],
    progress: (progress: string) => void
): Promise<[eventId: string, errors: string[]]> => {
    const errors: string[] = []

    //0. Load speakers
    const chSpeakerIds = proposals.reduce<string[]>((acc, proposal) => {
        const chSpeakers = Object.keys(proposal.speakers).filter((id) => proposal.speakers[id])
        acc.push(...chSpeakers)
        return acc
    }, [])
    const uniqConferenceHallSpeakersIds = [...new Set(chSpeakerIds)]
    progress(`Getting ${uniqConferenceHallSpeakersIds.length} ConferenceHall speakers...`)
    const [speakersMap, getSpeakersErrors] = await getConferenceHallSpeakers(uniqConferenceHallSpeakersIds, progress)
    errors.push(...getSpeakersErrors)

    //1. Create the ConferenceCenterEvent:
    const event: NewEvent = {
        conferenceHallId: chEvent.id,
        name: chEvent.name,
        dates: {
            start: chEvent.conferenceDates.start || null,
            end: chEvent.conferenceDates.end || null,
        },
        members: [userId],
        owner: userId,
        tracks: [
            {
                id: 'track1',
                name: 'Track1',
            },
        ],
        scheduleVisible: true,
        webhooks: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    }
    progress(`Creating the event...`)
    const newEventRef = await addDoc(collections.events, event)
    const newEventId = newEventRef.id

    // 2. Add the speakers from the proposals
    progress(`Adding speakers...`)
    const speakersMappingFromConferenceHall: { [id: string]: string } = {}
    const [speakersToCreate, speakerErrors] = mapConferenceHallSpeakerToConferenceCenter(
        uniqConferenceHallSpeakersIds,
        speakersMap
    )
    errors.push(...speakerErrors)
    let countSpeakersAdded = 1
    for (const speaker of speakersToCreate) {
        await setDoc(doc(collections.speakers(newEventId), speaker.id), speaker)
        progress(`Adding speakers: ${countSpeakersAdded}${speakersToCreate.length}`)
        countSpeakersAdded++
        speakersMappingFromConferenceHall[speaker.conferenceHallId || ''] = speaker.id
    }

    // 3. Add the proposals
    const [sessionsToCreate, sessionsErrors] = mapConferenceHallProposalsToConferenceCenter(
        proposals,
        speakersMappingFromConferenceHall
    )
    errors.push(...sessionsErrors)
    const createdSessionIds = []
    let countSessionsAdded = 1
    for (const session of sessionsToCreate) {
        await setDoc(doc(collections.sessions(newEventId), session.id), session)
        createdSessionIds.push(session.id)
        progress(`Adding sessions: ${countSessionsAdded}${sessionsToCreate.length}`)
        countSessionsAdded++
    }

    return [newEventId, errors]
}

const mapConferenceHallSpeakerToConferenceCenter = (
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
        const socials: SpeakerSocial[] = []
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
            conferenceHallId: chSpeaker.uid || null,
            name: chSpeaker.displayName,
            bio: chSpeaker.bio || null,
            company: chSpeaker.company || null,
            geolocation: chSpeaker.address?.formattedAddress || null,
            photoUrl: chSpeaker.photoUrl || null,
            social: socials,
            companyLogoUrl: null,
            jobTitle: null,
        })
    }
    return [speakers, errors]
}

const mapConferenceHallProposalsToConferenceCenter = (
    proposals: ConferenceHallProposal[],
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

        sessions.push({
            id: slugify(chProposal.title).slice(0, 15),
            conferenceHallId: chProposal.id,
            title: chProposal.title,
            abstract: chProposal.abstract || null,
            speakers: speakerIds,
            dates: null,
            format: null,
            hideTrackTitle: false,
            showInFeedback: true,
            image: null,
            language: null,
            presentationLink: null,
            tags: [],
            trackId: null,
            videoLink: null,
        })
    }
    return [sessions, errors]
}

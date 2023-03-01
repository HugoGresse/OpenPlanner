import { FieldValue } from 'firebase/firestore'

export interface Track {
    id: string
    name: string
}
export interface Webhooks {
    lastAnswer: string
    url: string
}

export interface DateType {
    start: Date
    end: Date
}

export interface SpeakerSocial {
    name: string
    icon: string
    link: string
}

export interface Speaker {
    id: string
    conferenceHallId: string | null
    name: string
    jobTitle: string | null
    bio: string | null
    company: string | null
    companyLogoUrl: string | null
    geolocation: string | null
    photoUrl: string | null
    social: SpeakerSocial[]
}

export interface Session {
    id: string
    conferenceHallId: string | null
    title: string
    abstract: string | null
    dates: DateType | null
    speakers: string[]
    trackId: string | null
    language: string | null
    presentationLink: string | null
    videoLink: string | null
    tags: string[]
    format: string | null
    image: string | null
    showInFeedback: boolean
    hideTrackTitle: boolean
}

export interface Event {
    id: string
    name: string
    owner: string
    scheduleVisible: boolean
    members: string[]
    conferenceHallId: string | null
    dates: DateType
    tracks: Track[]
    webhooks: Webhooks[]
    createdAt: Date
    updatedAt: Date
}

export type NewEvent = Omit<Omit<Omit<Event, 'id'>, 'createdAt'>, 'updatedAt'> & {
    createdAt: FieldValue
    updatedAt: FieldValue
}

export interface ConferenceHallEvent {
    id: string
    name: string
    organization: string // orgId
    conferenceDates: DateType
}
export interface ConferenceHallOrganization {
    id: string
    name: string
}

export interface ConferenceHallProposal {
    id: string
    title: string
    level: string
    abstract: string
    state: ConferenceHallProposalState
    owner: string
    speakers: {
        [key: string]: boolean
    }
}
export enum ConferenceHallProposalState {
    submitted = 'submitted',
    accepted = 'accepted',
    confirmed = 'confirmed',
    backup = 'backup',
    rejected = 'rejected',
}

export interface ConferenceHallSpeaker {
    uid: string
    displayName: string
    email: string | null
    bio: string | null
    company: string | null
    github: string | null
    twitter: string | null
    language: string | null
    phone: string | null
    photoUrl: string | null
    speakerReferences: string | null
    address: {
        formattedAddress: string
    } | null
}

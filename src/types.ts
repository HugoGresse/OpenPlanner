import { FieldValue } from 'firebase/firestore'
import { DateTime } from 'luxon'

export interface Track {
    id: string
    name: string
}
export interface Webhooks {
    lastAnswer: string | null
    url: string
    token: string | null
}

export interface Category {
    id: string
    name: string
    color?: string
}

export interface Format {
    id: string
    name: string
    durationMinutes: number
}

export interface DateType {
    start: Date | null
    end: Date | null
}
export interface DateTimeType {
    start: DateTime | null
    end: DateTime | null
}

export interface SpeakerSocial {
    name: string
    icon: string
    link: string
}

export interface Speaker {
    id: string
    email: string | null
    phone: string | null
    conferenceHallId: string | null
    name: string
    jobTitle: string | null
    bio: string | null
    company: string | null
    companyLogoUrl: string | null
    geolocation: string | null
    photoUrl: string | null
    socials: SpeakerSocial[]
    note: string | null
}

export interface Session {
    id: string
    conferenceHallId: string | null
    title: string
    abstract: string | null
    dates: DateTimeType | null
    durationMinutes: number
    speakers: string[]
    trackId: string | null
    language: string | null
    level: string | null
    presentationLink: string | null
    videoLink: string | null
    imageUrl: string | null
    tags: string[]
    format: string | null
    category: string | null
    image: string | null
    showInFeedback: boolean
    hideTrackTitle: boolean
    note: string | null
    extendHeight?: number
    // Hydrated data during load, removed in mapSessionToFirestoreSession.ts
    speakersData?: Speaker[]
    formatText?: string | null
    categoryObject?: Category | null
}

export interface EventFiles {
    public: string
    private: string
    imageFolder: string
}

export interface Event {
    id: string
    name: string
    owner: string
    scheduleVisible: boolean
    members: string[]
    conferenceHallId: string | null
    dates: DateType
    formats: Format[]
    categories: Category[]
    tracks: Track[]
    webhooks: Webhooks[]
    createdAt: Date
    updatedAt: Date
    files: EventFiles | null
    statusBadgeImage: string | null
    statusBadgeLink: string | null
}

export type EventForForm = Omit<Event, 'dates'> & {
    dates: {
        start: string | null
        end: string | null
    }
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
    tags: {
        id: string
        name: string
    }
    categories: {
        id: string
        name: string
    }[]
    formats: {
        id: string
        name: string
    }[]
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
    formats?: string
    categories?: string
    language?: string
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
    photoURL: string | null
    speakerReferences: string | null
    address: {
        formattedAddress: string
    } | null
}

export enum DragTypes {
    Session = 'Session',
}

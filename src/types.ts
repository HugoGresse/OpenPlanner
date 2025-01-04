import { FieldValue, Timestamp } from 'firebase/firestore'
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
    colorSecondary?: string
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

export interface Social {
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
    pronouns: string | null
    jobTitle: string | null
    bio: string | null
    company: string | null
    companyLogoUrl: string | null
    geolocation: string | null
    photoUrl: string | null
    socials: Social[]
    note: string | null
}

export interface TeasingPosts {
    twitter?: string | null
    linkedin?: string | null
    facebook?: string | null
    instagram?: string | null
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
    tags?: string[]
    format: string | null
    category: string | null
    image: string | null
    showInFeedback: boolean
    hideTrackTitle: boolean
    note: string | null
    teaserVideoUrl: string | null
    teaserImageUrl: string | null
    teasingHidden: boolean
    teasingPosts: TeasingPosts | null
    extendHeight?: number
    extendWidth?: number
    // Hydrated data during load, removed in mapSessionToFirestoreSession.ts
    speakersData?: Speaker[]
    formatText?: string | null
    categoryObject?: Category | null
    announcedOn?: {
        twitter?: boolean
        linkedin?: boolean
        facebook?: boolean
        instagram?: boolean
    }
}

export interface EventFiles {
    public: string
    private: string
    imageFolder: string
    openfeedback: string
    voxxrin: string | null
}

export interface EventShortVidSettings {
    template: string | null
    server: string | null
}
export interface EventAISettings {
    model: string
    temperature: string
    sessions: {
        teasingPromptSystem: string
        teasingPromptUser: string
    }
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
    apiKey: string | null
    files: EventFiles | null
    statusBadgeImage: string | null
    statusBadgeLink: string | null
    openAPIKey: string | null
    gladiaAPIKey: string | null
    transcriptionPassword: string | null
    enableVoxxrin: boolean
    aiSettings: EventAISettings | null
    shortVidSettings: EventShortVidSettings | null
    locationName: string | null
    locationUrl: string | null
    logoUrl: string | null
    logoUrl2: string | null
    backgroundUrl: string | null
    color: string | null
    colorSecondary: string | null
    colorBackground: string | null
}

export type EventForForm = Omit<Event, 'dates'> & {
    dates: {
        start: string | null
        end: string | null
    }
}

export type EventSettingForForm = {
    webhooks: Webhooks[]
    apiKey: string | null
}

export type NewEvent = Omit<Omit<Omit<Event, 'id'>, 'createdAt'>, 'updatedAt'> & {
    createdAt: FieldValue
    updatedAt: FieldValue
}

export interface Sponsor {
    id: string
    name: string
    logoUrl: string
    website: string | null
}

export interface SponsorCategory {
    id: string
    name: string
    order: number
    sponsors: Sponsor[]
}

export interface TeamMember {
    id: string
    name: string
    bio: string | null
    role: string
    order: number
    team: string
    teamOrder: number
    photoUrl: string | null
    socials?: Social[]
}

export type DraggableItemType = 'team' | 'member'

export interface DraggableItem {
    id: string
    type: DraggableItemType
}

export interface TeamDragItem extends DraggableItem {
    type: 'team'
    teamName: string
}

export interface MemberDragItem extends DraggableItem {
    type: 'member'
    memberId: string
    sourceTeam: string
}

export interface FaqCategory {
    id: string
    name: string
    order: number
    share: boolean
    private: boolean
    privateId: string | null
    collectionList: string[]
    faqs: Faq[]
}

export interface Faq {
    id: string
    question: string
    answer: string
    order: number
}

export interface ConferenceHallEvent {
    id: string
    name: string
    organization: string // orgId
    conferenceDates?: {
        start: Timestamp | null
        end: Timestamp | null
    }
    tags: {
        id: string
        name: string
    }
    categories?: {
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

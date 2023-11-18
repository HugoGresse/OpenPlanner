import { Timestamp } from 'firebase-admin/lib/firestore/'

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
    jobTitle: string | null
    bio: string | null
    company: string | null
    companyLogoUrl: string | null
    geolocation: string | null
    photoUrl: string | null
    socials: Social[]
    note: string | null
}

export interface Session {
    id: string
    conferenceHallId: string | null
    title: string
    abstract: string | null
    dates: Timestamp | null
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
    extendWidth?: number
    // Hydrated data during load, removed in mapSessionToFirestoreSession.ts
    speakersData?: Speaker[]
    formatText?: string | null
    categoryObject?: Category | null
}

export interface EventFiles {
    public: string
    private: string
    imageFolder: string
    openfeedback: string
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
    sponsors: Sponsor[]
}

export interface TeamMember {
    id: string
    name: string
    role: string
    photoUrl: string | null
    socials?: Social[]
}

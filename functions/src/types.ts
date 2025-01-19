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
    start: Date | string | null
    end: Date | string | null
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

export interface Session {
    id: string
    conferenceHallId: string | null
    title: string
    abstract: string | null
    dates: DateType | null
    durationMinutes: number
    speakers: string[]
    trackId: string | null
    language: string | null
    level: string | null
    presentationLink: string | null
    videoLink: string | null
    imageUrl: string | null
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

export interface TeasingPosts {
    twitter?: string | null
    linkedin?: string | null
    facebook?: string | null
    instagram?: string | null
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
    publicEnabled: boolean
    members: string[]
    conferenceHallId: string | null
    dates: DateType
    formats: Format[] | null
    categories: Category[] | null
    tracks: Track[]
    webhooks: Webhooks[]
    createdAt: Date
    updatedAt: Date
    apiKey: string | null
    files: EventFiles | null
    statusBadgeImage: string | null
    statusBadgeLink: string | null
    gladiaAPIKey: string | null
    transcriptionPassword: string | null
}

export interface SponsorResponse {
    id: string
    name: string
    logoUrl: string
    website: string | undefined
    categoryId: string
    categoryName: string
}

export interface SponsorCategory {
    id: string
    name: string
    sponsors: SponsorResponse[]
}

export interface TeamMember {
    id: string
    name: string
    role: string
    photoUrl: string | null
    socials?: Social[]
}

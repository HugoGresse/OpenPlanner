import { Event as EventFrontend } from '../../src/types'

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

// Mirror of the same constant in src/types.ts. The list is kept in sync
// across frontend and functions so backend can reject any submission
// whose `socials[*].name` is not on the known list. Frontend uses the
// `icon` value to render badges; backend stores it verbatim.
export const KNOWN_SOCIAL_NAMES: readonly string[] = [
    'Twitter',
    'X',
    'LinkedIn',
    'GitHub',
    'Bluesky',
    'Mastodon',
    'Instagram',
    'Facebook',
    'YouTube',
    'Twitch',
    'Website',
]

export const KNOWN_SOCIAL_ICON_BY_NAME: Record<string, string> = {
    Twitter: 'twitter',
    X: 'x',
    LinkedIn: 'linkedin',
    GitHub: 'github',
    Bluesky: 'bluesky',
    Mastodon: 'mastodon',
    Instagram: 'instagram',
    Facebook: 'facebook',
    YouTube: 'youtube',
    Twitch: 'twitch',
    Website: 'web',
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
    customFields?: { [key: string]: string | boolean }
}

export type SpeakerSelfEditableField =
    | 'name'
    | 'pronouns'
    | 'jobTitle'
    | 'bio'
    | 'company'
    | 'companyLogoUrl'
    | 'geolocation'
    | 'photoUrl'
    | 'socials'

export const SPEAKER_SELF_EDITABLE_FIELDS: SpeakerSelfEditableField[] = [
    'name',
    'pronouns',
    'jobTitle',
    'bio',
    'company',
    'companyLogoUrl',
    'geolocation',
    'photoUrl',
    'socials',
]

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
    pdf: string | null
}

export type Event = EventFrontend

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

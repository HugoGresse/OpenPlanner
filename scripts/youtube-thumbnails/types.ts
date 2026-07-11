// Subset of the OpenPlanner public JSON (see functions/src/api/routes/deploy/updateWebsiteActions/jsonTypes.ts)
export interface JsonSpeaker {
    id: string
    name: string
    photoUrl?: string | null
    company?: string | null
}

export interface JsonSession {
    id: string
    title: string
    dateStart?: string | null
    speakerIds: string[]
    videoLink?: string | null
}

export interface JsonEvent {
    id: string
    name: string
    dateStart?: string
    dateEnd?: string
    logoUrl?: string | null
    logoUrl2?: string | null
    backgroundUrl?: string | null
    color?: string | null
    colorBackground?: string | null
}

export interface JsonData {
    event: JsonEvent
    speakers: JsonSpeaker[]
    sessions: JsonSession[]
}

export interface ThumbnailColors {
    title?: string
    text?: string
    accent?: string
    background?: string
}

// Everything is optional: values fall back to the event JSON (logoUrl, backgroundUrl, dateStart, color)
export interface ThumbnailConfig {
    logoUrl?: string // url or local file path, overrides event.logoUrl
    backgroundUrl?: string // url or local file path, overrides event.backgroundUrl
    dateText?: string // fixed text, overrides the formatted event.dateStart
    locale?: string // used to format event.dateStart, default 'en-US'
    colors?: ThumbnailColors
    overlayOpacity?: number // 0..1, darkening gradient strength, default 0.6
    titleFontSize?: number // default 64 (auto-reduced for long titles)
    magicBorder?: boolean // glowing gold frame + corner sparkles, default true
    sparkles?: boolean // scattered sparkle stars, default true
    outputDir?: string
}

export interface SpeakerRender {
    name: string
    avatar: Buffer | null
}

export interface RenderInput {
    title: string
    dateText: string
    background: Buffer | null
    logo: Buffer | null
    speakers: SpeakerRender[]
    colors: Required<ThumbnailColors>
    overlayOpacity: number
    titleFontSize: number
    magicBorder: boolean
    sparkles: boolean
    seed: string // deterministic sparkle layout, use the session id
}

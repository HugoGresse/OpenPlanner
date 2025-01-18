export interface JsonSession {
    id: string
    title: string
    abstract: string | null
    dateStart: string | null | undefined
    dateEnd: string | null | undefined
    durationMinutes: number
    speakerIds: string[]
    trackId: string | null
    language: string | null
    level: string | null
    imageUrl: string | null | undefined
    presentationLink: string | null | undefined
    videoLink: string | null | undefined
    tags: string[]
    formatId: string | null
    categoryId: string | null
    showInFeedback: boolean
    hideTrackTitle: boolean
    extendHeight: number | undefined
    extendWidth: number | undefined
    teaserVideoUrl: string | null | undefined
    teaserImageUrl: string | null | undefined
}

export interface JsonSessionPrivate extends JsonSession {
    note: string | null | undefined
}

export interface JsonSpeaker {
    id: string
    name: string
    pronouns: string | null | undefined
    jobTitle: string | null | undefined
    bio: string | null
    company: string | null | undefined
    companyLogoUrl: string | null | undefined
    photoUrl: string | null | undefined
    socials: any[] // TODO: Define proper type for socials
}

export interface JsonEvent {
    id: string
    name: string
    scheduleVisible: boolean
    dateStart: string | undefined
    dateEnd: string | undefined
    formats: any[] // TODO: Define proper type
    categories: any[] // TODO: Define proper type
    tracks: any[] // TODO: Define proper type
    updatedAt: string
    locationName: string | null | undefined
    locationUrl: string | null | undefined
    color: string | null | undefined
    colorSecondary: string | null | undefined
    colorBackground: string | null | undefined
    logoUrl: string | null | undefined
    logoUrl2: string | null | undefined
    backgroundUrl: string | null | undefined
}

export interface JsonPublicOutput {
    event: JsonEvent
    speakers: JsonSpeaker[]
    sessions: JsonSession[]
    sponsors: any[] // TODO: Define proper type
    team: any // TODO: Define proper type
    teams: any[] // TODO: Define proper type
    faq: any[] // TODO: Define proper type
    generatedAt: string
}

export interface JsonPrivateOutput extends Omit<JsonPublicOutput, 'sessions'> {
    sessions: JsonSessionPrivate[]
}

export interface JsonOutput {
    outputPublic: JsonPublicOutput
    outputPrivate: JsonPrivateOutput
    outputOpenFeedback: any // TODO: Define proper type
    outputVoxxrin: any | null // TODO: Define proper type
}

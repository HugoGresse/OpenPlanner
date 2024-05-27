import { Session } from '../../../../types'
import { generateApiKey } from '../../../../utils/generateApiKey'
import { updateEvent } from '../../updateEvent'
import { GenerateBaseResultAnswer } from './useSessionsGenerationGeneric'
import { shortVidAPI, ShortVidEndpoints, ShortVidSettings } from './shortVidAPI'

export type ShortVidGenerationSettings = {
    template: string
    eventId: string
    eventApiKey: string | null
    updateSession: boolean
    locationName: string
    logoUrl: string
    colorBackground: string
    eventStartDate: Date | null
    endpoint: keyof typeof ShortVidEndpoints
}

export type GeneratedSessionVideoAnswer = {
    success: boolean
    results: {
        baseSession: Session
        updatedSession: Partial<Session>
        videoUrl: string
        imageUrl: string
    }[]
} & GenerateBaseResultAnswer

export const generateShortVid = async (
    sessions: Session[],
    settings: ShortVidGenerationSettings,
    progressCallback: (totalCount: number, doneCount: number) => void
): Promise<GeneratedSessionVideoAnswer> => {
    const sessionsCount = sessions.length

    let apiKey = settings.eventApiKey
    if (!apiKey) {
        apiKey = generateApiKey()
        await updateEvent(settings.eventId, { apiKey })
    }

    if (!sessionsCount) {
        return {
            success: false,
            message: 'No sessions to generate',
            results: [],
        }
    }
    if (!settings.colorBackground || !settings.logoUrl || !settings.locationName || !settings.eventStartDate) {
        return {
            success: false,
            message:
                'Missing settings, ensure those are set in the event settings: colorBackground, logoUrl, locationName, eventStartDate',
            results: [],
        }
    }

    const videoSessionMapping: {
        [key: string]: {
            video: string
            image: string
        }
    } = {}

    let progress = 0
    for (const session of sessions) {
        const sessionSettings: ShortVidSettings = {
            backgroundColor: settings.colorBackground,
            title: session.title,
            startingDate: session.dates?.start?.toISO() || settings.eventStartDate?.toISOString() || '',
            logoUrl: settings.logoUrl,
            location: settings.locationName,
            speakers: (session.speakersData || []).map((speaker) => {
                return {
                    pictureUrl: speaker.photoUrl || '',
                    name: speaker.name,
                    company: speaker.company || '',
                    job: speaker.jobTitle || '',
                }
            }),
        }

        const [videoResult, frameResult] = await Promise.all([
            shortVidAPI(
                settings.eventId,
                session.id,
                apiKey,
                settings.template,
                settings.updateSession,
                sessionSettings,
                settings.endpoint
            ),
            shortVidAPI(
                settings.eventId,
                session.id,
                apiKey,
                settings.template,
                settings.updateSession,
                sessionSettings,
                settings.endpoint,
                -1
            ),
        ])

        if (!videoResult.success || !frameResult.success) {
            return {
                success: false,
                message: videoResult.message || frameResult.message,
                results: [],
            }
        }

        progress++

        videoSessionMapping[session.id] = {
            video: videoResult.shortVidUrl,
            image: frameResult.shortVidUrl,
        }

        progressCallback(sessionsCount, progress)
    }

    return {
        success: true,
        results: sessions.map((session) => ({
            baseSession: session,
            updatedSession: {
                id: session.id,
                teaserImageUrl: videoSessionMapping[session.id].image,
                teaserVideoUrl: videoSessionMapping[session.id].video,
            },
            videoUrl: videoSessionMapping[session.id].video,
            imageUrl: videoSessionMapping[session.id].image,
        })),
    }
}

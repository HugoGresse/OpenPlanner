import { DateTime } from 'luxon'
import { Category, Event, EventForForm, EventSettingForForm, Format, Track } from '../../../types'
import { slugify } from '../../../utils/slugify'
import { DEFAULT_SESSION_CARD_BACKGROUND_COLOR } from '../schedule/scheduleConstants'

export const mapEventSettingsFormToMutateObject = (event: Event, data: EventForForm) => {
    const eventName = data.name
    const tracks: Track[] = data.tracks
        .filter((track) => track.name && track.name.trim().length > 0)
        .map((track) => ({
            name: track.name.trim(),
            id: track.id.startsWith('autogenerated-') ? slugify(track.name.trim()) : track.id,
        }))
    const formats: Format[] = data.formats
        .map((format) => ({
            name: format.name.trim(),
            durationMinutes: format.durationMinutes,
            id: format.id.startsWith('autogenerated-') ? slugify(format.name.trim()) : format.id,
        }))
        .filter((format) => format.name.trim().length > 0)

    const categories: Category[] = data.categories
        .map((cat) => ({
            name: cat.name.trim(),
            id: cat.id.startsWith('autogenerated-') ? slugify(cat.name.trim()) : cat.id,
            color: cat.color || DEFAULT_SESSION_CARD_BACKGROUND_COLOR,
            colorSecondary: cat.colorSecondary || DEFAULT_SESSION_CARD_BACKGROUND_COLOR,
        }))
        .filter((format) => format.name.trim().length > 0)
    const dates = {
        start: data.dates.start ? (DateTime.fromISO(data.dates.start).toJSDate() as Date) : null,
        end: data.dates.end ? (DateTime.fromISO(data.dates.end).toJSDate() as Date) : null,
    }
    const openAPIKey = data.openAPIKey || ''
    const gladiaAPIKey = data.gladiaAPIKey || ''
    const transcriptionPassword = data.transcriptionPassword || ''
    const timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

    return {
        ...event,
        name: eventName,
        statusBadgeImage: data.statusBadgeImage || null,
        statusBadgeLink: data.statusBadgeLink || null,
        locationName: data.locationName || null,
        locationUrl: data.locationUrl || null,
        logoUrl: data.logoUrl || null,
        logoUrl2: data.logoUrl2 || null,
        backgroundUrl: data.backgroundUrl || null,
        colorBackground: data.colorBackground || null,
        color: data.color || null,
        colorSecondary: data.colorSecondary || null,
        dates,
        tracks,
        formats,
        categories,
        openAPIKey,
        gladiaAPIKey,
        transcriptionPassword,
        timezone,
    }
}

export const mapEventDevSettingsFormToMutateObject = (event: Event, data: EventSettingForForm) => {
    const webhooks = data.webhooks.map((webhook) => {
        if (event.webhooks.find((w) => w.url === webhook.url)) {
            return {
                ...webhook,
                token: webhook.token || null,
            }
        }
        return {
            url: webhook.url.trim(),
            lastAnswer: null,
            token: webhook.token || null,
        }
    })

    const repoUrl = data.repoUrl || null
    const repoToken = data.repoToken || null
    const apiKey = data.apiKey || null

    return {
        ...event,
        webhooks,
        apiKey,
        publicEnabled: data.publicEnabled || false,
        repoUrl,
        repoToken,
    }
}

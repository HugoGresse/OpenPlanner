import { Category, Event, EventForForm, Format, Track } from '../../../types'
import { slugify } from '../../../utils/slugify'
import { DateTime } from 'luxon'
import { DEFAULT_SESSION_CARD_BACKGROUND_COLOR } from '../schedule/components/SessionCard'

export const mapEventSettingsFormToMutateObject = (event: Event, data: EventForForm) => {
    const eventName = data.name
    const tracks: Track[] = data.tracks
        .filter((track) => track.name && track.name.trim().length > 0)
        .map((track) => ({
            name: track.name.trim(),
            id: track.id.startsWith('autogenerated-') ? slugify(track.name.trim()) : track.id,
        }))
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
        }))
        .filter((format) => format.name.trim().length > 0)
    const dates = {
        start: data.dates.start ? (DateTime.fromISO(data.dates.start).toJSDate() as Date) : null,
        end: data.dates.end ? (DateTime.fromISO(data.dates.end).toJSDate() as Date) : null,
    }

    console.log(data)

    return {
        ...event,
        name: eventName,
        statusBadgeUrl: data.statusBadgeUrl || null,
        dates,
        tracks,
        webhooks,
        formats,
        categories,
    }
}

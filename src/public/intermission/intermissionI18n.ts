import { DateTime } from 'luxon'

type Lang = 'EN' | 'FR' | 'DE' | 'IT' | 'ES'

const SUPPORTED: Lang[] = ['EN', 'FR', 'DE', 'IT', 'ES']

const STRINGS = {
    EN: {
        upNext: 'Up next',
        now: 'Now',
        inProgress: 'In progress',
        startingNow: 'Starting now',
        wrapTitle: "That's a wrap for today",
        wrapSubtitle: 'See you next time — thank you!',
        inPrefix: 'in',
    },
    FR: {
        upNext: 'À suivre',
        now: 'En ce moment',
        inProgress: 'En cours',
        startingNow: 'Ça commence',
        wrapTitle: "C'est terminé pour aujourd'hui",
        wrapSubtitle: 'À bientôt — merci !',
        inPrefix: 'dans',
    },
    DE: {
        upNext: 'Als Nächstes',
        now: 'Jetzt',
        inProgress: 'Läuft gerade',
        startingNow: 'Beginnt jetzt',
        wrapTitle: 'Das war’s für heute',
        wrapSubtitle: 'Bis zum nächsten Mal — danke!',
        inPrefix: 'in',
    },
    IT: {
        upNext: 'Prossimo',
        now: 'Adesso',
        inProgress: 'In corso',
        startingNow: 'Sta iniziando',
        wrapTitle: 'È tutto per oggi',
        wrapSubtitle: 'Alla prossima — grazie!',
        inPrefix: 'tra',
    },
    ES: {
        upNext: 'A continuación',
        now: 'Ahora',
        inProgress: 'En curso',
        startingNow: 'Empezando',
        wrapTitle: 'Esto es todo por hoy',
        wrapSubtitle: '¡Hasta la próxima — gracias!',
        inPrefix: 'en',
    },
} satisfies Record<Lang, Record<string, string>>

const pick = (raw?: string | null): Lang | null => {
    const code = (raw || '').trim().slice(0, 2).toUpperCase() as Lang
    return SUPPORTED.includes(code) ? code : null
}

/**
 * Resolve the display language: the event's configured language first (the intermission screen runs
 * on a venue machine, so the event is authoritative), then the browser preference, then English.
 */
export const resolveLang = (eventLanguage?: string | null): Lang => {
    const fromEvent = pick(eventLanguage)
    if (fromEvent) return fromEvent

    if (typeof navigator !== 'undefined') {
        const candidates =
            navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
        for (const candidate of candidates) {
            const matched = pick(candidate)
            if (matched) return matched
        }
    }
    return 'EN'
}

export const intermissionStrings = (eventLanguage?: string | null) => STRINGS[resolveLang(eventLanguage)]

/**
 * Localized, human-friendly relative time until a talk starts.
 * Examples: "in 8 min", "dans 1 h 05", "tra 2 h 00", "Starting now", "In progress".
 */
export const formatRelativeStart = (
    dateStart: string,
    dateEnd: string,
    now: DateTime,
    eventLanguage?: string | null
): string => {
    const t = intermissionStrings(eventLanguage)
    const start = DateTime.fromISO(dateStart)
    const end = DateTime.fromISO(dateEnd)

    if (start <= now) {
        return end > now ? t.inProgress : t.startingNow
    }

    const totalMinutes = Math.round(start.diff(now, 'minutes').minutes)
    if (totalMinutes < 1) {
        return t.startingNow
    }
    if (totalMinutes < 60) {
        return `${t.inPrefix} ${totalMinutes} min`
    }

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${t.inPrefix} ${hours} h ${String(minutes).padStart(2, '0')}`
}

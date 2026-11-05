import { DateTime } from 'luxon'

export type SessionDatesInput = { start?: string | null; end?: string | null } | null | undefined
export type ParsedSessionDates = { start?: Date | null; end?: Date | null }

type ParseResult = { dates?: ParsedSessionDates | null; error?: string }

// `undefined` leaves the dates untouched, `null` clears them, a partial object patches only the given bounds.
// Values must be ISO 8601 (the contract the CLI skill documents); anything else is an error, not a guess.
export const parseSessionDates = (dates: SessionDatesInput): ParseResult => {
    if (dates === undefined) return {}
    if (dates === null) return { dates: null }

    const parsed: ParsedSessionDates = {}
    for (const bound of ['start', 'end'] as const) {
        const value = dates[bound]
        if (value === undefined) continue
        const date = value ? DateTime.fromISO(value) : null
        if (date && !date.isValid) return { error: `Invalid dates.${bound} value (expected ISO 8601)` }
        parsed[bound] = date ? date.toJSDate() : null
    }
    return Object.keys(parsed).length > 0 ? { dates: parsed } : {}
}

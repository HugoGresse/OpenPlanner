export type SessionDatesInput = { start?: string | null; end?: string | null } | null | undefined
export type ParsedSessionDates = { start?: Date | null; end?: Date | null }

type ParseResult = { dates?: ParsedSessionDates | null; error?: string }

const parseOne = (value: string | null): Date | null | 'invalid' => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 'invalid' : date
}

// `undefined` leaves the dates untouched, `null` clears them, a partial object patches only the given bounds.
export const parseSessionDates = (dates: SessionDatesInput): ParseResult => {
    if (dates === undefined) return {}
    if (dates === null) return { dates: null }

    const parsed: ParsedSessionDates = {}
    for (const bound of ['start', 'end'] as const) {
        const value = dates[bound]
        if (value === undefined) continue
        const date = parseOne(value)
        if (date === 'invalid') return { error: `Invalid dates.${bound} value` }
        parsed[bound] = date
    }
    return Object.keys(parsed).length > 0 ? { dates: parsed } : {}
}

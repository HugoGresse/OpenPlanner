import { describe, expect, test } from 'vitest'
import { parseSessionDates } from './parseSessionDates'

describe('parseSessionDates', () => {
    test('undefined leaves dates untouched, null clears them', () => {
        expect(parseSessionDates(undefined)).toEqual({})
        expect(parseSessionDates(null)).toEqual({ dates: null })
    })

    test('parses only the given bounds', () => {
        expect(parseSessionDates({ start: '2026-06-01T09:00:00Z' })).toEqual({
            dates: { start: new Date('2026-06-01T09:00:00Z') },
        })
        expect(parseSessionDates({ end: null })).toEqual({ dates: { end: null } })
        expect(parseSessionDates({})).toEqual({})
    })

    test('names the invalid bound', () => {
        expect(parseSessionDates({ start: 'nope' })).toEqual({ error: 'Invalid dates.start value' })
        expect(parseSessionDates({ start: '2026-06-01', end: 'nope' })).toEqual({ error: 'Invalid dates.end value' })
    })
})

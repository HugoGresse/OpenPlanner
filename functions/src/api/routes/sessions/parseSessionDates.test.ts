import { describe, expect, test } from 'vitest'
import { parseSessionDates } from './parseSessionDates'

describe('parseSessionDates', () => {
    test('undefined leaves dates untouched, null clears them', () => {
        expect(parseSessionDates(undefined)).toEqual({})
        expect(parseSessionDates(null)).toEqual({ dates: null })
    })

    test('parses only the given bounds, as ISO 8601', () => {
        expect(parseSessionDates({ start: '2026-06-01T09:00:00Z' })).toEqual({
            dates: { start: new Date('2026-06-01T09:00:00Z') },
        })
        expect(parseSessionDates({ end: null })).toEqual({ dates: { end: null } })
        expect(parseSessionDates({ start: '' })).toEqual({ dates: { start: null } })
        expect(parseSessionDates({})).toEqual({})
    })

    test('rejects anything that is not ISO 8601, naming the bound', () => {
        for (const value of ['nope', '1', '06/01/2026', 'June 1 2026']) {
            expect(parseSessionDates({ start: value })).toEqual({
                error: 'Invalid dates.start value (expected ISO 8601)',
            })
        }
        expect(parseSessionDates({ start: '2026-06-01', end: 'nope' })).toEqual({
            error: 'Invalid dates.end value (expected ISO 8601)',
        })
    })
})

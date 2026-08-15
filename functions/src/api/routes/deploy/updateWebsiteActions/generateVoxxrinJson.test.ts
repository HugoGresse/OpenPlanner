import { describe, expect, test, vi, beforeEach } from 'vitest'
import { generateVoxxrinJson } from './generateVoxxrinJson'
import { Event } from '../../../../types'

const baseEvent = {
    id: 'evt-1',
    name: 'Test Event',
    dates: { start: new Date('2026-01-01T09:00:00Z'), end: new Date('2026-01-02T18:00:00Z') },
    formats: [],
    categories: [],
    tracks: [],
    logoUrl: 'https://example.com/logo.png',
    backgroundUrl: 'https://example.com/background.png',
} as unknown as Event

beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

describe('generateVoxxrinJson missing assets', () => {
    test('returns null instead of throwing when logoUrl is missing', () => {
        const event = { ...baseEvent, logoUrl: undefined } as unknown as Event

        expect(() => generateVoxxrinJson(event, [], [], [])).not.toThrow()
        expect(generateVoxxrinJson(event, [], [], [])).toBeNull()
        expect(console.warn).toHaveBeenCalledWith('Voxxrin: no logoUrl set in the event settings')
    })

    test('returns null instead of throwing when backgroundUrl is missing', () => {
        const event = { ...baseEvent, backgroundUrl: undefined } as unknown as Event

        expect(generateVoxxrinJson(event, [], [], [])).toBeNull()
        expect(console.warn).toHaveBeenCalledWith('Voxxrin: no backgroundUrl set in the event settings')
    })

    test('returns a json output when logoUrl and backgroundUrl are set', () => {
        const output = generateVoxxrinJson(baseEvent, [], [], [])

        expect(output).not.toBeNull()
        expect(output?.logoUrl).toBe('https://example.com/logo.png')
        expect(output?.backgroundUrl).toBe('https://example.com/background.png')
    })
})

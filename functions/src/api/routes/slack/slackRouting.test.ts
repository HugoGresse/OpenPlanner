import { describe, expect, test } from 'vitest'
import { Event } from '../../../types'
import { decodeActionValue, encodeActionValue, pickEventForSlackChannel } from './slackRouting'

const event = (id: string, slackChannelId: string | null = null) => ({ id, name: id, slackChannelId } as Event)

describe('pickEventForSlackChannel', () => {
    test('prefers the event assigned to the channel', () => {
        const pick = pickEventForSlackChannel([event('a', 'C1'), event('b', 'C2')], 'C2')
        expect(pick).toMatchObject({ kind: 'event', event: { id: 'b' } })
    })

    test('falls back to the only event, then to the only unassigned one', () => {
        expect(pickEventForSlackChannel([event('a', 'C9')], 'C1')).toMatchObject({ kind: 'event', event: { id: 'a' } })
        expect(pickEventForSlackChannel([event('a', 'C9'), event('b')], 'C1')).toMatchObject({
            kind: 'event',
            event: { id: 'b' },
        })
    })

    test('reports none / ambiguous otherwise', () => {
        expect(pickEventForSlackChannel([], 'C1')).toEqual({ kind: 'none' })
        expect(pickEventForSlackChannel([event('a'), event('b')], 'C1')).toMatchObject({ kind: 'ambiguous' })
    })
})

describe('action values', () => {
    test('round-trips eventId + id, tolerates separators inside the id', () => {
        expect(decodeActionValue(encodeActionValue('evt-1', '100.5'))).toEqual({ eventId: 'evt-1', id: '100.5' })
        expect(decodeActionValue('evt|a|b')).toEqual({ eventId: 'evt', id: 'a|b' })
        expect(decodeActionValue('evt|')).toBeNull()
        expect(decodeActionValue('call_1')).toBeNull()
        expect(decodeActionValue(undefined)).toBeNull()
    })
})

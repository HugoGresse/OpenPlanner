import { expect, test } from 'vitest'
import { Event } from '../../../types'
import { findInvalidSessionReference } from './validateSessionReferences'

const event = {
    tracks: [{ id: 'track-1', name: 'Main' }],
    formats: [{ id: 'fmt-1', name: 'Talk' }],
    categories: [],
} as unknown as Event

test('accepts known ids and empty references', () => {
    expect(findInvalidSessionReference(event, { trackId: 'track-1', format: 'fmt-1' })).toBeNull()
    expect(findInvalidSessionReference(event, { trackId: null, category: undefined })).toBeNull()
    expect(findInvalidSessionReference({} as Event, {})).toBeNull()
})

test('names the first unknown reference and the valid ids', () => {
    expect(findInvalidSessionReference(event, { trackId: 'x', format: 'y' })).toBe(
        'Unknown trackId "x". Valid ids: track-1'
    )
    expect(findInvalidSessionReference(event, { category: 'c' })).toBe(
        'Unknown category "c". Valid ids: none defined on the event'
    )
})

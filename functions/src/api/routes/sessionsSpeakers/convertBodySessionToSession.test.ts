import { describe, expect, test, vi } from 'vitest'
import { convertBodySessionToSession } from './convertBodySessionToSession'
import { findByIdOrName } from './findByIdOrName'
import { verifyOverwriteData } from './verifyOverwriteData'
import { Event } from '../../../types'

const event = {
    tracks: [
        { id: 't1', name: 'x' },
        { id: 'main', name: 'Main stage' },
    ],
    categories: [{ id: 'web', name: 'Web' }],
    formats: [{ id: 'talk', name: 'Talk', durationMinutes: 45 }],
} as unknown as Event

describe('findByIdOrName', () => {
    test('id wins, then explicit name, then a name sent in the id field', () => {
        expect(findByIdOrName(event.tracks, 'main', undefined)).toBe('main')
        expect(findByIdOrName(event.tracks, undefined, 'Main stage')).toBe('main')
        expect(findByIdOrName(event.tracks, 'Main stage', undefined)).toBe('main')
        expect(findByIdOrName(event.tracks, 'unknown-id', 'Main stage')).toBe('main')
        expect(findByIdOrName(event.tracks, 'x', 'Main stage')).toBe('main')
        expect(findByIdOrName(event.tracks, 'Main stage', 'x')).toBe('t1')
    })
    test('unknown gives null, never undefined', () => {
        expect(findByIdOrName(event.tracks, 'nope', 'nope')).toBeNull()
        expect(findByIdOrName(undefined, 'x', undefined)).toBeNull()
    })
})

describe('convertBodySessionToSession', () => {
    test('resolves ids and never leaves undefined references', () => {
        const session = convertBodySessionToSession(
            { id: 's1', title: 'T', trackId: 'main', categoryId: 'web', formatId: 'talk', speakerIds: ['sp'] },
            event
        )
        expect(session).toMatchObject({
            id: 's1',
            title: 'T',
            trackId: 'main',
            category: 'web',
            format: 'talk',
            speakers: ['sp'],
        })
    })
    test('unknown references become null and are logged', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {})
        const session = convertBodySessionToSession(
            { id: 's1', title: 'T', trackId: 'ghost', categoryName: 'Ghost' },
            event
        )
        expect(session.trackId).toBeNull()
        expect(session.category).toBeNull()
        expect(session).not.toHaveProperty('format')
        expect(error).toHaveBeenCalledTimes(2)
        error.mockRestore()
    })
})

describe('verifyOverwriteData + convertBodySessionToSession agree', () => {
    test('a name sent in trackId reuses the existing track instead of creating a duplicate', () => {
        const body = { speakers: [], sessions: [{ id: 's1', title: 'T', trackId: 'Main stage', categoryId: 'Web' }] }
        const { tracksToCreate, categoriesToCreate } = verifyOverwriteData(body, event)
        expect(tracksToCreate).toEqual([])
        expect(categoriesToCreate).toEqual([])
        expect(convertBodySessionToSession(body.sessions[0], event)).toMatchObject({ trackId: 'main', category: 'web' })
    })
    test('an unknown id is queued for creation under that id', () => {
        const body = { speakers: [], sessions: [{ id: 's1', title: 'T', trackId: 'room9', trackName: 'Room 9' }] }
        expect(verifyOverwriteData(body, event).tracksToCreate).toEqual([{ id: 'room9', name: 'Room 9' }])
    })
})

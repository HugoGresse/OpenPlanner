import { describe, expect, test } from 'vitest'
import { formatOutput, parseFieldList, pickFields } from './output.js'

describe('pickFields', () => {
    const session = { id: '1', title: 'T', dates: { start: 'a', end: 'b' }, speakers: ['s'] }

    test('projects nested fields on objects and arrays', () => {
        expect(pickFields([session], ['id', 'dates.start'])).toEqual([{ id: '1', dates: { start: 'a' } }])
    })
    test('descends into nested arrays and merges sibling paths', () => {
        const categories = [
            { id: 'gold', name: 'Gold', order: 1, sponsors: [{ id: 's1', name: 'ACME', logoUrl: 'x' }] },
        ]
        expect(pickFields(categories, ['id', 'sponsors.name', 'sponsors.id'])).toEqual([
            { id: 'gold', sponsors: [{ name: 'ACME', id: 's1' }] },
        ])
    })
    test('length and numeric index address the array itself', () => {
        const data = { sessions: [{ title: 'a' }, { title: 'b' }], tracks: [] }
        expect(pickFields(data, ['sessions.length', 'tracks.length'])).toEqual({ sessions: 2, tracks: 0 })
        expect(pickFields(data, ['sessions.0.title'])).toEqual({ sessions: { '0': { title: 'a' } } })
        expect(pickFields([1, 2, 3], ['length'])).toBe(3)
    })
    test('no fields returns value untouched, missing and inherited fields are skipped', () => {
        expect(pickFields(session, [])).toBe(session)
        expect(pickFields(session, ['nope'])).toEqual({})
        expect(pickFields(session, ['toString'])).toEqual({})
        expect(() => pickFields(session, ['constructor.name'])).toThrow(/not allowed/)
    })
    test('null leaves are kept', () => {
        expect(pickFields({ dates: null }, ['dates.start'])).toEqual({ dates: null })
    })
})

test('parseFieldList trims and drops empties', () => {
    expect(parseFieldList(' id, title ,,')).toEqual(['id', 'title'])
    expect(parseFieldList(undefined)).toEqual([])
})

test('formatOutput compact vs pretty, strings raw', () => {
    expect(formatOutput({ a: 1 }, { compact: true })).toBe('{"a":1}')
    expect(formatOutput({ a: 1 })).toBe('{\n  "a": 1\n}')
    expect(formatOutput('plain')).toBe('plain')
})

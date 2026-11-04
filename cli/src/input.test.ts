import { describe, expect, test } from 'vitest'
import { buildBody, collect, parseAssignments, parseData, parsePairs } from './input.js'

describe('parseData', () => {
    test('inline JSON and stdin', () => {
        expect(parseData('{"a":1}')).toEqual({ a: 1 })
        expect(parseData('-', () => '[1]')).toEqual([1])
        expect(parseData(undefined)).toBeUndefined()
    })
    test('invalid JSON explains the accepted forms', () => {
        expect(() => parseData('{oops')).toThrow(/@file.json/)
    })
})

describe('parseAssignments', () => {
    test('coerces JSON values, keeps strings (including @handles), supports dotted keys', () => {
        expect(
            parseAssignments([
                'title=Hello world',
                'durationMinutes=45',
                'dates.start=2026-06-01T09:00:00Z',
                'tags=["a","b"]',
                'note=null',
                'social=@ada',
            ])
        ).toEqual({
            title: 'Hello world',
            durationMinutes: 45,
            dates: { start: '2026-06-01T09:00:00Z' },
            tags: ['a', 'b'],
            note: null,
            social: '@ada',
        })
    })
    test('rejects malformed pairs, prototype keys and primitive intermediates', () => {
        expect(() => parseAssignments(['novalue'])).toThrow(/key=value/)
        expect(() => parseAssignments(['__proto__.x=1'])).toThrow(/not allowed/)
        expect(() => parseAssignments(['constructor.prototype.x=1'])).toThrow(/not allowed/)
        expect(({} as Record<string, unknown>).x).toBeUndefined()
        expect(() => parseAssignments(['a=1', 'a.b=2'])).toThrow(/"a" is already a number/)
    })
})

describe('buildBody', () => {
    test('deep-merges --data and --set, --set wins on the leaf only', () => {
        expect(
            buildBody({ data: '{"title":"a","dates":{"start":"A","end":"B"}}', set: ['title=b', 'dates.start=C'] })
        ).toEqual({
            title: 'b',
            dates: { start: 'C', end: 'B' },
        })
    })
    test('empty body is an error when required', () => {
        expect(() => buildBody({})).toThrow(/Nothing to send/)
        expect(buildBody({}, false)).toEqual({})
    })
    test('array --data rejected', () => {
        expect(() => buildBody({ data: '[1]' })).toThrow(/JSON object/)
    })
})

test('parsePairs with custom separator', () => {
    expect(parsePairs(['password: s3cret', 'x-a:b'], ':')).toEqual({ password: 's3cret', 'x-a': 'b' })
})

test('collect accumulates repeated options', () => {
    expect(collect('b', collect('a'))).toEqual(['a', 'b'])
})
